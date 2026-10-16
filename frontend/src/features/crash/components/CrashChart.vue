<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useCrashStore } from '../stores/useCrashStore';
import type { CrashPhase, PublicPlayer } from '../types';
import { GROWTH_PER_MS, formatMultiplier, timeToReach } from '../utils';

/**
 * Scène animée du Crash (canvas) : ciel étoilé qui défile, avion qui suit la courbe
 * avec sa traînée, explosion au crash, encaissements qui s'envolent.
 * Purement visuel : toutes les valeurs viennent du serveur via le store.
 */
const props = defineProps<{
  phase: CrashPhase | null;
  players: PublicPlayer[];
  /** Mon encaissement (pour la gerbe de confettis), null sinon. */
  myCashOut: { cashedOutAt: number; payout: number; amount: number } | null;
}>();

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  text?: string;
}
interface Star {
  x: number;
  y: number;
  r: number;
  depth: number;
}

const store = useCrashStore();
const canvas = ref<HTMLCanvasElement | null>(null);
const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

let frame = 0;
let lastTs = 0;
let width = 0;
let height = 0;
let stars: Star[] = [];
let particles: Particle[] = [];
let plane = { x: 0, y: 0, angle: 0 };
let flash = 0;
let shake = 0;
const seenCashOuts = new Set<string>();
/** Effets déclenchés par les événements, exécutés au prochain dessin (position de l'avion à jour). */
let pendingEffects: (() => void)[] = [];

const Y_STEPS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
const PAD = { left: 44, right: 22, top: 22, bottom: 26 };

function rgba(name: string, alpha = 1): string {
  const rgb = getComputedStyle(canvas.value!).getPropertyValue(`--v-theme-${name}`).trim();
  return `rgba(${rgb}, ${alpha})`;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min); // effets visuels uniquement
}

function resize() {
  const el = canvas.value;
  if (!el) return;
  const dpr = window.devicePixelRatio || 1;
  width = el.clientWidth;
  height = el.clientHeight;
  el.width = Math.round(width * dpr);
  el.height = Math.round(height * dpr);
  stars = Array.from({ length: Math.round((width * height) / 4500) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: rand(0.4, 1.6),
    depth: rand(0.2, 1),
  }));
}

/** Temps de vol et multiplicateur, recalculés à chaque image depuis l'heure du serveur. */
function flightState(): { elapsedMs: number; multiplier: number } {
  const multiplier = store.currentMultiplier();
  if (store.phase === 'RUNNING' && store.startedAt !== null) {
    return { elapsedMs: Math.max(0, store.serverNow() - store.startedAt), multiplier };
  }
  if (store.phase === 'CRASHED' && store.crashPoint !== null) {
    return { elapsedMs: timeToReach(store.crashPoint), multiplier };
  }
  return { elapsedMs: 0, multiplier: 100 };
}

/** Couleur de la courbe selon le palier atteint. */
function tierColor(multiplier: number): string {
  if (props.phase === 'CRASHED') return 'error';
  if (multiplier >= 1000) return 'primary';
  if (multiplier >= 200) return 'success';
  return 'accent';
}

function spawnExplosion(x: number, y: number) {
  const colors = [rgba('primary'), rgba('error'), rgba('accent'), rgba('on-surface')];
  for (let i = 0; i < 70; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(60, 420);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: rand(0.5, 1.3),
      size: rand(1.5, 4),
      color: colors[i % colors.length]!,
      gravity: 380,
    });
  }
  flash = 1;
  shake = 14;
}

function spawnLabel(text: string, color: string, big = false) {
  particles.push({
    x: plane.x + rand(-30, 10),
    y: plane.y - 18,
    vx: rand(-12, 12),
    vy: big ? -55 : -38,
    life: 0,
    maxLife: big ? 2.2 : 1.7,
    size: big ? 18 : 11,
    color,
    gravity: 0,
    text,
  });
}

function spawnConfetti() {
  const colors = [rgba('success'), rgba('primary'), rgba('on-surface')];
  for (let i = 0; i < 36; i++) {
    const angle = rand(-Math.PI, 0);
    const speed = rand(120, 320);
    particles.push({
      x: plane.x,
      y: plane.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: rand(0.9, 1.6),
      size: rand(2, 4),
      color: colors[i % colors.length]!,
      gravity: 420,
    });
  }
}

function drawPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  scale: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.shadowColor = rgba('accent', 0.8);
  ctx.shadowBlur = 18;

  // Ailes
  ctx.fillStyle = rgba('accent');
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(-8, -15);
  ctx.lineTo(-13, -15);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-13, 15);
  ctx.lineTo(-8, 15);
  ctx.closePath();
  ctx.fill();

  // Dérive
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-20, -8);
  ctx.lineTo(-23, -8);
  ctx.lineTo(-20, 0);
  ctx.closePath();
  ctx.fill();

  // Fuselage
  ctx.shadowBlur = 10;
  ctx.fillStyle = rgba('on-surface');
  ctx.beginPath();
  ctx.ellipse(-4, 0, 18, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cockpit
  ctx.shadowBlur = 0;
  ctx.fillStyle = rgba('background');
  ctx.beginPath();
  ctx.ellipse(8, -1.2, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw(ts: number) {
  frame = requestAnimationFrame(draw);
  const el = canvas.value;
  const ctx = el?.getContext('2d');
  if (!el || !ctx || width === 0) return;

  const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0);
  lastTs = ts;
  const dpr = window.devicePixelRatio || 1;
  const flight = flightState();
  const running = props.phase === 'RUNNING';
  const crashed = props.phase === 'CRASHED';
  const current = flight.multiplier / 100;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Secousse de l'écran au crash
  if (shake > 0 && !reducedMotion) {
    ctx.translate(rand(-shake, shake), rand(-shake, shake));
    shake = Math.max(0, shake - dt * 40);
  }

  // Ciel
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, rgba('background'));
  sky.addColorStop(1, rgba('surface-variant', 0.45));
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, width + 40, height + 40);

  // Étoiles : défilent plus vite à mesure que le multiplicateur grimpe
  const speed = reducedMotion ? 0 : running ? 30 + 90 * Math.log(current + 1) : 8;
  for (const star of stars) {
    star.x -= speed * star.depth * dt;
    if (star.x < 0) {
      star.x += width;
      star.y = Math.random() * height;
    }
    ctx.fillStyle = rgba('on-surface', 0.25 + star.depth * 0.5);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const xMax = Math.max(10_000, flight.elapsedMs * 1.18);
  const yMax = Math.max(2, current * 1.25);
  const x = (ms: number) => PAD.left + (ms / xMax) * plotW;
  const y = (m: number) => PAD.top + plotH - ((m - 1) / (yMax - 1)) * plotH;

  // Graduations discrètes
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const yStep = Y_STEPS.find((step) => (yMax - 1) / step <= 5) ?? 1000;
  // Graduations sur des valeurs rondes : 1×, puis les multiples du pas (ex : 1×, 5×, 10×)
  const ticks = [1];
  for (let m = Math.ceil(1 / yStep + 1e-9) * yStep; m <= yMax; m += yStep) {
    if (m > 1) ticks.push(m);
  }
  for (const m of ticks) {
    ctx.strokeStyle = rgba('on-surface', 0.05);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y(m));
    ctx.lineTo(width - PAD.right, y(m));
    ctx.stroke();
    ctx.fillStyle = rgba('muted', 0.7);
    ctx.fillText(`${Number(m.toFixed(1))}×`, PAD.left - 8, y(m));
  }

  const color = tierColor(flight.multiplier);

  if ((running || crashed) && flight.elapsedMs > 0) {
    // Courbe m(t) = e^(g·t), avec halo
    const steps = 100;
    const path = new Path2D();
    for (let i = 0; i <= steps; i++) {
      const t = (flight.elapsedMs * i) / steps;
      const m = Math.min(Math.exp(GROWTH_PER_MS * t), current);
      if (i === 0) path.moveTo(x(t), y(m));
      else path.lineTo(x(t), y(m));
    }
    const headX = x(flight.elapsedMs);
    const headY = y(current);

    const area = new Path2D(path);
    area.lineTo(headX, y(1));
    area.lineTo(x(0), y(1));
    area.closePath();
    const fill = ctx.createLinearGradient(0, headY, 0, y(1));
    fill.addColorStop(0, rgba(color, 0.35));
    fill.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = fill;
    ctx.fill(area);

    ctx.save();
    ctx.shadowColor = rgba(color, 0.9);
    ctx.shadowBlur = 22;
    ctx.strokeStyle = rgba(color);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path);
    ctx.restore();

    // Orientation de l'avion = pente de la courbe à l'écran
    const back = Math.max(0, flight.elapsedMs - 300);
    const angle = Math.atan2(
      headY - y(Math.min(Math.exp(GROWTH_PER_MS * back), current)),
      headX - x(back),
    );
    plane = { x: headX, y: headY, angle };

    // Traînée de réacteur
    if (running && !reducedMotion) {
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: headX - Math.cos(angle) * 18,
          y: headY - Math.sin(angle) * 18,
          vx: -Math.cos(angle) * rand(40, 90) + rand(-15, 15),
          vy: -Math.sin(angle) * rand(40, 90) + rand(-15, 15),
          life: 0,
          maxLife: rand(0.35, 0.7),
          size: rand(2, 4.5),
          color: rgba(i ? 'primary' : 'accent', 0.8),
          gravity: 0,
        });
      }
    }
  } else {
    // En attente : l'avion patiente sur la piste
    const bob = reducedMotion ? 0 : Math.sin(ts / 400) * 3;
    plane = { x: x(0) + 26, y: y(1) - 14 + bob, angle: -0.08 };
  }

  pendingEffects.forEach((effect) => effect());
  pendingEffects = [];

  // Particules (traînée, étincelles, confettis, encaissements)
  particles = particles.filter((p) => p.life < p.maxLife);
  for (const p of particles) {
    p.life += dt;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const alpha = Math.max(0, 1 - p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    if (p.text) {
      ctx.font = `600 ${p.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // L'avion n'existe plus après le crash
  if (!crashed) {
    drawPlane(ctx, plane.x, plane.y, plane.angle, Math.min(1.25, Math.max(0.75, width / 700)));
  }

  // Flash blanc du crash
  if (flash > 0) {
    ctx.fillStyle = rgba('error', flash * 0.35);
    ctx.fillRect(-20, -20, width + 40, height + 40);
    flash = Math.max(0, flash - dt * 2.5);
  }
}

watch(
  () => props.phase,
  (phase, previous) => {
    if (phase === 'CRASHED' && previous === 'RUNNING' && !reducedMotion) {
      pendingEffects.push(() => spawnExplosion(plane.x, plane.y));
    }
    if (phase === 'BETTING') {
      seenCashOuts.clear();
      // Onglet resté en arrière-plan : on ne rejoue pas les effets des parties précédentes
      pendingEffects = [];
    }
  },
);

// Les encaissements des joueurs s'envolent depuis l'avion
watch(
  () => props.players,
  (players) => {
    for (const player of players) {
      if (player.cashedOutAt === null || seenCashOuts.has(player.key)) continue;
      seenCashOuts.add(player.key);
      // Seulement les encaissements qui viennent d'arriver (pas ceux d'un état chargé en cours de partie)
      const isFresh = player.cashedOutAt >= store.currentMultiplier() * 0.92;
      if (!reducedMotion && props.phase === 'RUNNING' && isFresh) {
        const text = `${player.username} ${formatMultiplier(player.cashedOutAt)}`;
        pendingEffects.push(() => spawnLabel(text, rgba('success', 0.95)));
      }
    }
  },
);

watch(
  () => props.myCashOut,
  (cashOut, previous) => {
    if (cashOut && !previous && !reducedMotion) {
      const text = `+${(cashOut.payout - cashOut.amount).toLocaleString('fr-FR')}`;
      pendingEffects.push(() => {
        spawnConfetti();
        spawnLabel(text, rgba('success'), true);
      });
    }
  },
);

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  resize();
  resizeObserver = new ResizeObserver(resize);
  if (canvas.value) resizeObserver.observe(canvas.value);
  frame = requestAnimationFrame(draw);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
});
</script>

<template>
  <canvas ref="canvas" class="block h-full w-full" aria-hidden="true" />
</template>
