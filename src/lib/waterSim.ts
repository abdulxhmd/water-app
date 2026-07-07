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

// --- Feel tuning ------------------------------------------------------------
/** Velocity kick for a tap; drags scale with pointer speed. */
export const TOUCH_FORCE = 3.2;
/** How strongly a change in device angle sloshes the surface. */
export const TILT_SLOSH = 0.2;
/** Peak size (px) of the idle swell. Purely visual. */
export const IDLE_WAVE_AMPLITUDE = 2.8;
/** Idle swell speed (radians/second). */
export const IDLE_WAVE_SPEED = 1.3;
/** Size of the occasional wandering idle ripple. */
export const AMBIENT_RIPPLE_FORCE = 0.4;
/** Steps between idle ripples (~60 steps = 1s). */
export const AMBIENT_RIPPLE_INTERVAL = 200;
/** Exponential ease applied to level changes per step. Higher = faster rise. */
export const LEVEL_EASE = 0.05;

export type Surface = {
  heights: Float32Array;
  velocities: Float32Array;
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

/** Shortest-path angular difference in degrees, for smoothing across ±180°. */
export function shortestAngleDelta(target: number, current: number): number {
  return ((target - current + 540) % 360) - 180;
}

/**
 * World-space y of the waterline for a w×h card rotated by angleRad, such
 * that the submerged area is EXACTLY fill×(w×h) — volume is conserved at
 * every angle instead of appearing to gain/lose water as the device tilts.
 *
 * The card's cross-section width as a function of world-y is a trapezoid
 * (grows linearly from the top corner, flat in the middle, shrinks at the
 * bottom), so the air-area function is piecewise quadratic/linear and can be
 * inverted in closed form. Coordinates: y grows downward, card centered at 0.
 */
export function waterlineY(fill: number, w: number, h: number, angleRad: number): number {
  const f = Math.max(0, Math.min(1, fill));
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Corner world-y values; by symmetry y4 = -y1 and y3 = -y2.
  const ys = [
    -(w / 2) * sin - (h / 2) * cos,
    -(w / 2) * sin + (h / 2) * cos,
    (w / 2) * sin - (h / 2) * cos,
    (w / 2) * sin + (h / 2) * cos,
  ].sort((a, b) => a - b);
  const [y1, y2, , y4] = ys;

  const area = w * h;
  const t = y2 - y1; // height of the top (and bottom) triangle segment
  const m = y4 - y1 - 2 * t; // height of the constant-width middle segment
  const widthMid = area / (t + m); // cross-section width in the middle

  const airTarget = (1 - f) * area;
  const triArea = (widthMid * t) / 2;

  if (t > 1e-6 && airTarget <= triArea) {
    return y1 + Math.sqrt((2 * t * airTarget) / widthMid);
  }
  if (t > 1e-6 && airTarget >= area - triArea) {
    return y4 - Math.sqrt((2 * t * (area - airTarget)) / widthMid);
  }
  return y2 + (airTarget - triArea) / widthMid;
}
