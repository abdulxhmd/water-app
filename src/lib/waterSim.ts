// Pure spring-row water simulation. The surface is a row of vertical spring
// columns: each column's height is pulled back to equilibrium by TENSION,
// slowed by DAMPING, and leaks displacement to its neighbors via SPREAD —
// the classic 2D game-water model. Disturb a column and the ripple
// propagates outward and settles naturally.
//
// Everything here is renderer-agnostic (no DOM, no canvas) so it can be
// unit-tested and reused by other views.

// --- Surface tuning ---------------------------------------------------------
export const NUM_COLUMNS = 48;
/** Pull of each column back toward equilibrium. Higher = stiffer, faster waves. */
export const TENSION = 0.025;
/** Velocity kept per step. Lower = calms faster; 1 = never settles. */
export const DAMPING = 0.987;
/** Fraction of neighbor height-difference transferred per pass. Higher = ripples travel faster/wider. */
export const SPREAD = 0.12;
/** Neighbor-propagation passes per step. More = smoother, wider ripples. */
export const SPREAD_PASSES = 2;

// --- Disturbance tuning -----------------------------------------------------
/** Velocity kick (px/step) applied at the pour column while water is rising. */
export const POUR_FORCE = 1.1;
/** Velocity kick for a tap; drags scale up to ~2x with pointer speed. */
export const TOUCH_FORCE = 2.2;
/** How strongly a change in device angle sloshes the surface. */
export const TILT_SLOSH = 0.35;
/** Max amplitude (px) of the tiny idle ripples. */
export const AMBIENT_NOISE = 0.18;
/** Steps between idle ripple impulses. */
export const AMBIENT_INTERVAL = 40;

// --- Level spring (fill changes overshoot then settle) -----------------------
export const LEVEL_STIFFNESS = 0.012;
export const LEVEL_DAMPING = 0.9;

// --- Particles ----------------------------------------------------------------
export const PARTICLE_GRAVITY = 0.32;
export const PARTICLE_DRAG = 0.985;
export const MAX_PARTICLES = 110;

export type Surface = {
  heights: Float32Array;
  velocities: Float32Array;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  /** splash particles fall back into the surface; spill particles fall away */
  kind: "splash" | "spill";
};

export function createSurface(columns: number = NUM_COLUMNS): Surface {
  return {
    heights: new Float32Array(columns),
    velocities: new Float32Array(columns),
  };
}

// Scratch buffers reused across steps to avoid per-frame allocation.
let scratchLeft = new Float32Array(NUM_COLUMNS);
let scratchRight = new Float32Array(NUM_COLUMNS);

export function stepSurface(
  surface: Surface,
  tension: number = TENSION,
  damping: number = DAMPING,
  spread: number = SPREAD,
  spreadPasses: number = SPREAD_PASSES
): void {
  const { heights, velocities } = surface;
  const n = heights.length;

  for (let i = 0; i < n; i++) {
    velocities[i] += -tension * heights[i];
    velocities[i] *= damping;
    heights[i] += velocities[i];
  }

  if (scratchLeft.length !== n) {
    scratchLeft = new Float32Array(n);
    scratchRight = new Float32Array(n);
  }

  for (let pass = 0; pass < spreadPasses; pass++) {
    for (let i = 0; i < n; i++) {
      if (i > 0) {
        scratchLeft[i] = spread * (heights[i] - heights[i - 1]);
        velocities[i - 1] += scratchLeft[i];
      }
      if (i < n - 1) {
        scratchRight[i] = spread * (heights[i] - heights[i + 1]);
        velocities[i + 1] += scratchRight[i];
      }
    }
    for (let i = 0; i < n; i++) {
      if (i > 0) heights[i - 1] += scratchLeft[i];
      if (i < n - 1) heights[i + 1] += scratchRight[i];
    }
  }
}

/** Kick one column's velocity; the springs propagate it outward. */
export function disturb(surface: Surface, index: number, force: number): void {
  const n = surface.heights.length;
  if (n === 0) return;
  const i = Math.max(0, Math.min(n - 1, Math.round(index)));
  surface.velocities[i] += force;
}

/** Surface height at a fractional column position, linearly interpolated. */
export function heightAt(surface: Surface, position: number): number {
  const { heights } = surface;
  const n = heights.length;
  if (n === 0) return 0;
  const clamped = Math.max(0, Math.min(n - 1, position));
  const i = Math.floor(clamped);
  const frac = clamped - i;
  if (i >= n - 1) return heights[n - 1];
  return heights[i] * (1 - frac) + heights[i + 1] * frac;
}

export function spawnParticle(particles: Particle[], particle: Particle): void {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push(particle);
}

export function stepParticles(
  particles: Particle[],
  gravity: number = PARTICLE_GRAVITY,
  drag: number = PARTICLE_DRAG
): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += gravity;
    p.vx *= drag;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

/** Shortest-path angular difference in degrees, for smoothing across ±180°. */
export function shortestAngleDelta(target: number, current: number): number {
  return ((target - current + 540) % 360) - 180;
}
