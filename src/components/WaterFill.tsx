"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import {
  IDLE_WAVE_AMPLITUDE,
  IDLE_WAVE_SPEED,
  LEVEL_EASE,
  NUM_COLUMNS,
  TILT_SLOSH,
  TOUCH_FORCE,
  createSurface,
  disturb,
  heightAt,
  shortestAngleDelta,
  stepSurface,
  waterlineY,
} from "@/lib/waterSim";

type WaterFillProps = {
  fillPercent: number;
  tiltEnabled?: boolean;
  className?: string;
};

const CARD_RADIUS = 24; // matches rounded-3xl
const FIXED_STEP_MS = 1000 / 60;
const ANGLE_SMOOTHING = 0.1;
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
    level: 0,
    targetLevel: 0,
    angle: 0,
    targetAngle: 0,
    prevAngle: 0,
    time: 0,
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
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
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
    // Exact volume-conserving waterline: the submerged area of the rotated
    // card is always precisely level × card area, so tilting never appears
    // to add or remove water.
    const surfaceBaseY = () => waterlineY(sim.level, sim.width, sim.height, angleRad());
    const toWorld = (cx: number, cy: number) => {
      const a = -angleRad();
      return {
        x: cx * Math.cos(a) - cy * Math.sin(a),
        y: cx * Math.sin(a) + cy * Math.cos(a),
      };
    };

    // Gentle ambient swell, purely visual — two slow phase-shifted sines so
    // the idle surface breathes like the original CSS waves, without pumping
    // energy into the springs.
    const idleOffset = (worldX: number) => {
      const k = (Math.PI * 2) / (span() * 1.6);
      return (
        Math.sin(worldX * k + sim.time * IDLE_WAVE_SPEED) * IDLE_WAVE_AMPLITUDE * 0.6 +
        Math.sin(worldX * k * 1.7 - sim.time * IDLE_WAVE_SPEED * 0.8) * IDLE_WAVE_AMPLITUDE * 0.4
      );
    };

    const surfaceYAt = (worldX: number) =>
      surfaceBaseY() + heightAt(sim.surface, columnOf(worldX)) + idleOffset(worldX);

    // ---------------------------- physics step ------------------------------
    const physicsStep = () => {
      sim.stepCount += 1;
      sim.time += FIXED_STEP_MS / 1000;

      // Smooth the angle; the *change* injects a soft slosh so tilting feels
      // like liquid, not a hinged plate.
      sim.angle += shortestAngleDelta(sim.targetAngle, sim.angle) * ANGLE_SMOOTHING;
      const kickRad = ((sim.angle - sim.prevAngle) * Math.PI) / 180;
      sim.prevAngle = sim.angle;
      if (Math.abs(kickRad) > 0.0002) {
        const s = span();
        for (let i = 0; i < NUM_COLUMNS; i++) {
          sim.surface.velocities[i] += -kickRad * (columnX(i) / s) * s * TILT_SLOSH * 0.02;
        }
      }

      // Level eases exponentially — smooth rise, no bounce, no fanfare.
      sim.level += (sim.targetLevel - sim.level) * LEVEL_EASE;

      stepSurface(sim.surface);
    };

    // ------------------------------- drawing --------------------------------
    const rgba = (alpha: number) =>
      `rgba(${sim.brand.r},${sim.brand.g},${sim.brand.b},${alpha})`;

    const traceSurface = () => {
      ctx.beginPath();
      ctx.moveTo(columnX(0), surfaceYAt(columnX(0)));
      for (let i = 1; i < NUM_COLUMNS; i++) {
        const x = columnX(i);
        ctx.lineTo(x, surfaceYAt(x));
      }
    };

    const draw = () => {
      const { width: w, height: h } = sim;
      if (w === 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, (w / 2) * dpr, (h / 2) * dpr);
      ctx.clearRect(-w / 2, -h / 2, w, h);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, CARD_RADIUS);
      ctx.clip();
      ctx.rotate(angleRad());

      const deep = span() * 1.6;

      traceSurface();
      ctx.lineTo(span(), deep);
      ctx.lineTo(-span(), deep);
      ctx.closePath();
      ctx.fillStyle = rgba(0.25);
      ctx.fill();

      traceSurface();
      ctx.strokeStyle = rgba(0.4);
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();

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
      const cx = event.clientX - rect.left - sim.width / 2;
      const cy = event.clientY - rect.top - sim.height / 2;
      return toWorld(cx, cy);
    };

    const disturbAt = (world: { x: number; y: number }, force: number) => {
      // Only react near or below the surface — poking the air shouldn't ripple.
      if (world.y < surfaceYAt(world.x) - 40) return;
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
      disturbAt(pointerToWorld(event), Math.min(1, speed * 0.05) * TOUCH_FORCE * 0.4);
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
      className={`absolute inset-0 overflow-hidden rounded-3xl border border-[#E3E8F5] bg-white/70 ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: "pan-y" }}
      />
    </div>
  );
}

// Calm fallback for prefers-reduced-motion: static CSS water, no simulation,
// no sensors.
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
