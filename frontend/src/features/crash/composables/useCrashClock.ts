import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useCrashStore } from '../stores/useCrashStore';
import { timeToReach } from '../utils';

/**
 * Horloge d'affichage, mise à jour à chaque image : temps de vol, multiplicateur courant
 * et compte à rebours des mises. Tout est dérivé de l'heure serveur (aucun tick réseau).
 */
export function useCrashClock() {
  const store = useCrashStore();
  const elapsedMs = ref(0);
  const multiplier = ref(100);
  const countdownMs = ref(0);
  let frame = 0;

  function tick() {
    const now = store.serverNow();
    multiplier.value = store.currentMultiplier();

    if (store.phase === 'RUNNING' && store.startedAt !== null) {
      elapsedMs.value = Math.max(0, now - store.startedAt);
    } else if (store.phase === 'CRASHED' && store.crashPoint !== null) {
      elapsedMs.value = timeToReach(store.crashPoint);
    } else {
      elapsedMs.value = 0;
    }
    countdownMs.value = store.phase === 'BETTING' ? Math.max(0, store.bettingEndsAt - now) : 0;
    frame = requestAnimationFrame(tick);
  }

  onMounted(() => {
    frame = requestAnimationFrame(tick);
  });
  onBeforeUnmount(() => cancelAnimationFrame(frame));

  return { elapsedMs, multiplier, countdownMs };
}
