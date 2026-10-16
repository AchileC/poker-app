import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Socket } from 'socket.io-client';
import { getSocketClient } from '@/core/api/socketClient';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { useWalletStore } from '@/core/stores/useWalletStore';
import type {
  CrashAck,
  CrashHistoryEntry,
  CrashPhase,
  CrashSnapshot,
  MyBet,
  PublicPlayer,
} from '../types';
import { multiplierAt } from '../utils';

const ACK_TIMEOUT_MS = 5000;
const HISTORY_SIZE = 30;

export const useCrashStore = defineStore('crash', () => {
  const connected = ref(false);
  const phase = ref<CrashPhase | null>(null);
  const roundNumber = ref(0);
  const seedHash = ref('');
  const bettingEndsAt = ref(0);
  const startedAt = ref<number | null>(null);
  const crashPoint = ref<number | null>(null);
  const players = ref<PublicPlayer[]>([]);
  const history = ref<CrashHistoryEntry[]>([]);
  const myBet = ref<MyBet | null>(null);
  const limits = ref({ minBet: 10, maxBet: 1000, minAutoCashOut: 101, maxMultiplier: 100_000 });
  /** Décalage horloge serveur − horloge locale, pour dessiner la courbe au bon moment. */
  const clockOffset = ref(0);

  // Réglages du joueur
  const amount = ref(50);
  const autoEnabled = ref(false);
  /** Multiplicateur d'encaissement automatique, en « × » (2 = 2,00×). */
  const autoTarget = ref(2);
  /** Mise demandée pendant un vol : envoyée automatiquement à la prochaine phase de mises. */
  const queued = ref(false);

  const isSubmitting = ref(false);
  const error = ref<string | null>(null);

  let socket: Socket | null = null;

  const totalBets = computed(() => players.value.reduce((sum, p) => sum + p.amount, 0));

  function serverNow() {
    return Date.now() + clockOffset.value;
  }

  /** Multiplicateur courant (centièmes), calculé localement depuis l'heure de départ du serveur. */
  function currentMultiplier(): number {
    if (phase.value === 'CRASHED' && crashPoint.value !== null) return crashPoint.value;
    if (phase.value === 'RUNNING' && startedAt.value !== null) {
      return multiplierAt(serverNow() - startedAt.value);
    }
    return 100;
  }

  function syncClock(serverTime: number) {
    clockOffset.value = serverTime - Date.now();
  }

  function applySnapshot(snapshot: CrashSnapshot) {
    syncClock(snapshot.serverNow);
    phase.value = snapshot.phase;
    roundNumber.value = snapshot.number;
    seedHash.value = snapshot.seedHash;
    bettingEndsAt.value = snapshot.bettingEndsAt;
    startedAt.value = snapshot.startedAt;
    crashPoint.value = snapshot.crashPoint;
    players.value = snapshot.players;
    history.value = snapshot.history;
    myBet.value = snapshot.myBet;
    limits.value = snapshot.limits;
  }

  const handlers: Record<string, (payload: never) => void> = {
    connect: () => {
      connected.value = true;
      error.value = null;
    },
    disconnect: () => {
      connected.value = false;
    },
    connect_error: () => {
      error.value = 'Connexion au jeu impossible. Nouvelle tentative…';
    },
    state: (snapshot: CrashSnapshot) => applySnapshot(snapshot),
    'round:betting': (event: {
      number: number;
      seedHash: string;
      bettingEndsAt: number;
      serverNow: number;
    }) => {
      syncClock(event.serverNow);
      phase.value = 'BETTING';
      roundNumber.value = event.number;
      seedHash.value = event.seedHash;
      bettingEndsAt.value = event.bettingEndsAt;
      startedAt.value = null;
      crashPoint.value = null;
      players.value = [];
      myBet.value = null;
      if (queued.value) {
        queued.value = false;
        void placeBet();
      }
    },
    'round:started': (event: { startedAt: number; serverNow: number }) => {
      syncClock(event.serverNow);
      phase.value = 'RUNNING';
      startedAt.value = event.startedAt;
    },
    'player:bet': (player: PublicPlayer) => {
      players.value = [...players.value, player];
    },
    'player:cashout': (event: { key: string; cashedOutAt: number; payout: number }) => {
      players.value = players.value.map((player) =>
        player.key === event.key
          ? { ...player, cashedOutAt: event.cashedOutAt, payout: event.payout }
          : player,
      );
    },
    'round:crashed': (event: CrashHistoryEntry & { serverNow: number }) => {
      syncClock(event.serverNow);
      phase.value = 'CRASHED';
      crashPoint.value = event.crashPoint;
      history.value = [
        {
          number: event.number,
          crashPoint: event.crashPoint,
          seed: event.seed,
          seedHash: event.seedHash,
        },
        ...history.value,
      ].slice(0, HISTORY_SIZE);
    },
    // Mise faite depuis cet onglet ou un autre onglet du même joueur
    'my:bet': (event: { amount: number; autoCashOut: number | null; newBalance: number }) => {
      myBet.value = {
        amount: event.amount,
        autoCashOut: event.autoCashOut,
        cashedOutAt: null,
        payout: 0,
      };
      useWalletStore().setBalance(event.newBalance);
    },
    // Encaissement (manuel ou automatique), y compris depuis un autre onglet
    'my:cashout': (event: { newBalance: number; cashedOutAt: number; payout: number }) => {
      if (myBet.value) {
        myBet.value = { ...myBet.value, cashedOutAt: event.cashedOutAt, payout: event.payout };
      }
      useWalletStore().setBalance(event.newBalance);
    },
    exception: (body: { message: string }) => {
      error.value = body.message;
    },
  };

  async function connect() {
    await useAuthStore().ready();
    socket = getSocketClient('/crash');
    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler as (...args: unknown[]) => void);
    }
    socket.connect();
  }

  function disconnect() {
    if (!socket) return;
    for (const [event, handler] of Object.entries(handlers)) {
      socket.off(event, handler as (...args: unknown[]) => void);
    }
    socket.disconnect();
    socket = null;
    connected.value = false;
    queued.value = false;
  }

  async function send<T extends object>(event: string, payload?: unknown): Promise<T | null> {
    if (!socket) return null;
    isSubmitting.value = true;
    error.value = null;
    try {
      const ack = (await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(event, payload)) as CrashAck<T>;
      if (!ack.ok) {
        error.value = ack.error?.message ?? 'Réponse inattendue du serveur.';
        return null;
      }
      return ack;
    } catch {
      error.value = 'Le serveur ne répond pas.';
      return null;
    } finally {
      isSubmitting.value = false;
    }
  }

  async function placeBet() {
    if (phase.value !== 'BETTING') {
      queued.value = true;
      return;
    }
    const autoCashOut = autoEnabled.value ? Math.round(autoTarget.value * 100) : undefined;
    const result = await send<{ newBalance: number }>('bet', { amount: amount.value, autoCashOut });
    if (result) {
      myBet.value = {
        amount: amount.value,
        autoCashOut: autoCashOut ?? null,
        cashedOutAt: null,
        payout: 0,
      };
      useWalletStore().setBalance(result.newBalance);
    }
  }

  async function cashOut() {
    const result = await send<{ newBalance: number; cashedOutAt: number; payout: number }>(
      'cashOut',
    );
    if (result && myBet.value) {
      myBet.value = { ...myBet.value, cashedOutAt: result.cashedOutAt, payout: result.payout };
      useWalletStore().setBalance(result.newBalance);
    }
  }

  function cancelQueuedBet() {
    queued.value = false;
  }

  return {
    connected,
    phase,
    roundNumber,
    seedHash,
    bettingEndsAt,
    startedAt,
    crashPoint,
    players,
    history,
    myBet,
    limits,
    amount,
    autoEnabled,
    autoTarget,
    queued,
    isSubmitting,
    error,
    totalBets,
    serverNow,
    currentMultiplier,
    connect,
    disconnect,
    placeBet,
    cashOut,
    cancelQueuedBet,
  };
});
