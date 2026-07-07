"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import {
  AMBIENT_INTERVAL,
  AMBIENT_NOISE,
  LEVEL_DAMPING,
  LEVEL_STIFFNESS,
  NUM_COLUMNS,
  POUR_FORCE,
  TILT_SLOSH,
  TOUCH_FORCE,
  createSurface,
  disturb,
  heightAt,
  shortestAngleDelta,
  spawnParticle,
  stepParticles,
  stepSurface,
  type Particle,
} from "@/lib/waterSim";

type WaterFillProps = {
  fillPercent: number;
  tiltEnabled?: boolean;
  className?: string;
};

/** Canvas bleed around the card so spill droplets can fall outside it. */
const CANVAS_PAD = 32;
const CARD_RADIUS = 24; // matches rounded-3xl
const FIXED_STEP_MS = 1000 / 60;
const ANGLE_SMOOTHING = 0.12;
const GRAVITY_DEAD_ZONE = 1.5;

export default function WaterFill(props: WaterFillProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  if (prefersReducedMotion) return <CalmWaterFill {...props} />;
  return <SimulatedWaterFill {...props} />;
}

function SimulatedWaterFill({ fillPercent, tiltEnabled = false, className = "" }: WaterFillProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // All mutable sim state lives outside React so the loop never re-renders.
  const simRef = useRef({
    surface: createSurface(NUM_COLUMNS),
    particles: [] as Particle[],
    level: 0,
    levelVel: 0,
    targetLevel: 0,
    angle: 0,
    targetAngle: 0,
    prevAngle: 0,
    stepCount: 0,
    width: 0,
    height: 0,
    brand: { r: 127, g: 184, b: 255 },
    pointerActive: false,
    lastPointer: { x: 0, y: 0 },
  });

  useEffect(() => {
    simRef.current.targetLevel = Math.max(0, Math.min(100, fillPercent)) / 100;
  }, [fillPercent]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sim = simRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let rafId = 0;
    let running = false;
    let visible = !document.hidden;
    let onScreen = true;
    let lastTime = 0;
    let accumulator = 0;

    const readBrandColor = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-brand")
        .trim();
      const match = /^#([0-9a-f]{6})$/i.exec(raw);
      if (match) {
        const hex = match[1];
        sim.brand = {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        };
      }
    };
    readBrandColor();
    const brandInterval = setInterval(readBrandColor, 2000);

    const resize = () => {
      const rect = root.getBoundingClientRect();
      sim.width = rect.width;
      sim.height = rect.height;
      canvas.width = Math.round((rect.width + CANVAS_PAD * 2) * dpr);
      canvas.height = Math.round((rect.height + CANVAS_PAD * 2) * dpr);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);

    // --- geometry helpers (world frame = gravity down, origin card center) --
    const span = () => Math.hypot(sim.width, sim.height) / 2 + 4;
    const columnX = (i: number) => -span() + (i / (NUM_COLUMNS - 1)) * span() * 2;
    const columnOf = (worldX: number) =>
      ((worldX + span()) / (span() * 2)) * (NUM_COLUMNS - 1);
    const angleRad = () => (sim.angle * Math.PI) / 180;
    const projectedHeight = () => {
      const a = angleRad();
      return Math.abs(Math.cos(a)) * sim.height + Math.abs(Math.sin(a)) * sim.width;
    };
    const surfaceBaseY = () => (0.5 - sim.level) * projectedHeight();
    const toWorld = (cx: number, cy: number) => {
      const a = -angleRad();
      return {
        x: cx * Math.cos(a) - cy * Math.sin(a),
        y: cx * Math.sin(a) + cy * Math.cos(a),
      };
    };
    const surfaceYAt = (worldX: number) =>
      surfaceBaseY() + heightAt(sim.surface, columnOf(worldX));
    const isPouring = () => sim.targetLevel - sim.level > 0.004;
    const pourWorld = () => toWorld(0, -sim.height / 2);

    // ---------------------------- physics step ------------------------------
    const physicsStep = () => {
      sim.stepCount += 1;

      // Smooth the angle; the *change* in angle is angular momentum that
      // sloshes the surface (overshoot + settle comes from the springs).
      sim.angle += shortestAngleDelta(sim.targetAngle, sim.angle) * ANGLE_SMOOTHING;
      const kickRad = ((sim.angle - sim.prevAngle) * Math.PI) / 180;
      sim.prevAngle = sim.angle;
      if (Math.abs(kickRad) > 0.0002) {
        const s = span();
        for (let i = 0; i < NUM_COLUMNS; i++) {
          sim.surface.velocities[i] += -kickRad * (columnX(i) / s) * s * TILT_SLOSH * 0.02;
        }
      }

      // Level rises through a spring so it overshoots and settles.
      sim.levelVel += (sim.targetLevel - sim.level) * LEVEL_STIFFNESS;
      sim.levelVel *= LEVEL_DAMPING;
      sim.level += sim.levelVel;

      // Pour stream disturbs the impact column and splashes.
      if (isPouring() && sim.width > 0) {
        const impact = pourWorld();
        const col = columnOf(impact.x);
        disturb(sim.surface, col + (Math.random() - 0.5) * 2, POUR_FORCE * (0.6 + Math.random() * 0.8));
        if (sim.stepCount % 4 === 0) {
          const sy = surfaceYAt(impact.x);
          spawnParticle(sim.particles, {
            x: impact.x + (Math.random() - 0.5) * 10,
            y: sy,
            vx: (Math.random() - 0.5) * 2.4,
            vy: -(1.5 + Math.random() * 2),
            life: 40,
            maxLife: 40,
            r: 1.5 + Math.random() * 1.5,
            kind: "splash",
          });
        }
      }

      // Idle: occasional tiny ripples so the surface never looks frozen.
      if (sim.stepCount % AMBIENT_INTERVAL === 0) {
        disturb(sim.surface, Math.random() * (NUM_COLUMNS - 1), (Math.random() - 0.5) * 2 * AMBIENT_NOISE);
      }

      stepSurface(sim.surface);
      stepParticles(sim.particles);

      // Splash particles falling back through the surface re-disturb it.
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        if (p.kind !== "splash" || p.vy <= 0) continue;
        if (p.y >= surfaceYAt(p.x)) {
          disturb(sim.surface, columnOf(p.x), Math.min(1, p.vy * 0.12));
          sim.particles.splice(i, 1);
        }
      }

      // Spill: a top corner of the card dipping under the world waterline
      // pours droplets outside. Visual only — the logged ml never changes.
      if (sim.width > 0 && sim.stepCount % 2 === 0) {
        for (const cornerX of [-sim.width / 2, sim.width / 2]) {
          const c = toWorld(cornerX, -sim.height / 2);
          if (c.y > surfaceYAt(c.x) + 2) {
            spawnParticle(sim.particles, {
              x: c.x + (Math.random() - 0.5) * 4,
              y: c.y,
              vx: Math.sign(c.x || 1) * Math.random() * 0.8,
              vy: 0.5 + Math.random(),
              life: 55,
              maxLife: 55,
              r: 1.2 + Math.random() * 1.4,
              kind: "spill",
            });
          }
        }
      }
    };

    // ------------------------------- drawing --------------------------------
    const rgba = (alpha: number) =>
      `rgba(${sim.brand.r},${sim.brand.g},${sim.brand.b},${alpha})`;

    const traceSurface = () => {
      ctx.beginPath();
      ctx.moveTo(columnX(0), surfaceBaseY() + sim.surface.heights[0]);
      for (let i = 1; i < NUM_COLUMNS; i++) {
        ctx.lineTo(columnX(i), surfaceBaseY() + sim.surface.heights[i]);
      }
    };

    const draw = () => {
      const { width: w, height: h } = sim;
      if (w === 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, (w / 2 + CANVAS_PAD) * dpr, (h / 2 + CANVAS_PAD) * dpr);
      ctx.clearRect(-w / 2 - CANVAS_PAD, -h / 2 - CANVAS_PAD, w + CANVAS_PAD * 2, h + CANVAS_PAD * 2);

      const deep = span() * 1.6;

      // Water body + splashes, clipped to the card.
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, CARD_RADIUS);
      ctx.clip();
      ctx.rotate(angleRad());

      traceSurface();
      ctx.lineTo(span(), deep);
      ctx.lineTo(-span(), deep);
      ctx.closePath();
      ctx.fillStyle = rgba(0.28);
      ctx.fill();

      traceSurface();
      ctx.strokeStyle = rgba(0.55);
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.stroke();

      if (isPouring()) {
        const impact = pourWorld();
        const sy = surfaceYAt(impact.x);
        if (sy > impact.y) {
          ctx.strokeStyle = rgba(0.5);
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(impact.x, impact.y);
          ctx.lineTo(impact.x, sy);
          ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      for (const p of sim.particles) {
        if (p.kind !== "splash") continue;
        ctx.fillStyle = rgba(0.8 * (p.life / p.maxLife));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Spill droplets + trickles render outside the clip.
      ctx.save();
      ctx.rotate(angleRad());
      for (const p of sim.particles) {
        if (p.kind !== "spill") continue;
        ctx.fillStyle = rgba(0.7 * (p.life / p.maxLife));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const cornerX of [-w / 2, w / 2]) {
        const c = toWorld(cornerX, -h / 2);
        if (c.y > surfaceYAt(c.x) + 2) {
          ctx.strokeStyle = rgba(0.3);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x, c.y + 26);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    // ------------------------------ main loop -------------------------------
    const tick = (time: number) => {
      if (!running) return;
      accumulator += Math.min(time - lastTime, 100);
      lastTime = time;
      let steps = 0;
      while (accumulator >= FIXED_STEP_MS && steps < 4) {
        physicsStep();
        accumulator -= FIXED_STEP_MS;
        steps += 1;
      }
      draw();
      rafId = requestAnimationFrame(tick);
    };

    const syncRunning = () => {
      const shouldRun = visible && onScreen;
      if (shouldRun && !running) {
        running = true;
        lastTime = performance.now();
        accumulator = 0;
        rafId = requestAnimationFrame(tick);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(rafId);
      }
    };

    const onVisibility = () => {
      visible = !document.hidden;
      syncRunning();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const intersection = new IntersectionObserver((entries) => {
      onScreen = entries[0]?.isIntersecting ?? true;
      syncRunning();
    });
    intersection.observe(root);

    // --------------------------- tilt via gravity ---------------------------
    const onMotion = (event: DeviceMotionEvent) => {
      const g = event.accelerationIncludingGravity;
      if (!g || g.x == null || g.y == null) return;
      // Phone flat on a table: gravity is along z, on-screen "down" is
      // undefined and noisy — hold the last stable angle.
      if (Math.hypot(g.x, g.y) < GRAVITY_DEAD_ZONE) return;
      let angle = Math.atan2(g.x, g.y) * (180 / Math.PI);
      if (typeof screen !== "undefined" && screen.orientation) {
        angle -= screen.orientation.angle;
      }
      sim.targetAngle = angle;
    };
    if (tiltEnabled) {
      window.addEventListener("devicemotion", onMotion);
    }

    // ------------------------------- touch ----------------------------------
    const pointerToWorld = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = event.clientX - rect.left - CANVAS_PAD - sim.width / 2;
      const cy = event.clientY - rect.top - CANVAS_PAD - sim.height / 2;
      return toWorld(cx, cy);
    };

    const disturbAt = (world: { x: number; y: number }, force: number) => {
      // Only react near or below the surface — poking the air shouldn't ripple.
      if (world.y < surfaceYAt(world.x) - 50) return;
      disturb(sim.surface, columnOf(world.x), force);
    };

    const onPointerDown = (event: PointerEvent) => {
      sim.pointerActive = true;
      sim.lastPointer = { x: event.clientX, y: event.clientY };
      disturbAt(pointerToWorld(event), TOUCH_FORCE);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!sim.pointerActive) return;
      const speed = Math.hypot(
        event.clientX - sim.lastPointer.x,
        event.clientY - sim.lastPointer.y
      );
      sim.lastPointer = { x: event.clientX, y: event.clientY };
      disturbAt(pointerToWorld(event), Math.min(2, speed * 0.08) * TOUCH_FORCE * 0.5);
    };
    const onPointerEnd = () => {
      sim.pointerActive = false;
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerEnd);
    canvas.addEventListener("pointercancel", onPointerEnd);
    canvas.addEventListener("pointerleave", onPointerEnd);

    syncRunning();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      clearInterval(brandInterval);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("devicemotion", onMotion);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      canvas.removeEventListener("pointerleave", onPointerEnd);
    };
  }, [tiltEnabled]);

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 rounded-3xl border border-[#E3E8F5] bg-white/70 ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)]"
        style={{ touchAction: "pan-y" }}
      />
    </div>
  );
}

// Calm fallback for prefers-reduced-motion: the previous CSS/SVG water with
// no simulation, no sensors, no particles.
function CalmWaterFill({ fillPercent, className = "" }: WaterFillProps) {
  const clampedFill = Math.max(0, Math.min(100, fillPercent));
  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-3xl border border-[#E3E8F5] bg-white/70 ${className}`}
    >
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-in-out"
        style={{ height: `${clampedFill}%` }}
      >
        <div className="absolute inset-0 top-3 bg-brand/25" />
        <div
          className="absolute inset-x-0 top-0 h-6 overflow-hidden"
          style={{ transform: "translateY(-50%)" }}
        >
          <svg
            className="absolute inset-0 h-full w-[200%]"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="var(--color-brand)"
              fillOpacity="0.45"
              d="M0,160 C240,220 480,100 720,160 C960,220 1200,100 1440,160 L1440,320 L0,320 Z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}
