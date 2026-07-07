"use client";

import { useEffect, useRef } from "react";

type WaterFillProps = {
  fillPercent: number;
  tiltEnabled?: boolean;
  className?: string;
};

export default function WaterFill({ fillPercent, tiltEnabled = false, className = "" }: WaterFillProps) {
  const clampedFill = Math.max(0, Math.min(100, fillPercent));
  const frameRef = useRef<HTMLDivElement | null>(null);

  // The water lives inside a "gravity frame" — an oversized square that
  // rotates so the surface stays level with the real world at ANY device
  // angle (90° sideways, fully upside down, anything between). The angle
  // comes from the gravity vector in devicemotion: the on-screen direction
  // of "down" is atan2(gx, gy), and the frame counter-rotates to match.
  //
  // The value is written straight to a CSS variable inside rAF (with a
  // shortest-path low-pass filter to absorb hand tremor) — never through
  // React state, since the sensor fires at up to 60Hz and re-rendering the
  // page per tick causes scroll jank.
  useEffect(() => {
    if (!tiltEnabled) return;
    const el = frameRef.current;
    if (!el) return;

    let rafId = 0;
    let targetAngle = 0;
    let currentAngle = 0;

    const step = () => {
      rafId = 0;
      const delta = ((targetAngle - currentAngle + 540) % 360) - 180;
      currentAngle += delta * 0.15;
      el.style.setProperty("--g-angle", `${currentAngle.toFixed(2)}deg`);
      if (Math.abs(delta) > 0.1) {
        rafId = requestAnimationFrame(step);
      }
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      const g = event.accelerationIncludingGravity;
      if (!g || g.x == null || g.y == null) return;

      // Phone lying flat: gravity is mostly along z, the on-screen direction
      // is undefined and noisy — hold the last stable angle instead.
      if (Math.hypot(g.x, g.y) < 1.5) return;

      let angle = Math.atan2(g.x, g.y) * (180 / Math.PI);
      // If the OS rotated the display (landscape), CSS coords no longer match
      // physical device coords — compensate.
      if (typeof screen !== "undefined" && screen.orientation) {
        angle -= screen.orientation.angle;
      }

      targetAngle = angle;
      if (!rafId) rafId = requestAnimationFrame(step);
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      if (rafId) cancelAnimationFrame(rafId);
      el.style.removeProperty("--g-angle");
    };
  }, [tiltEnabled]);

  // The frame is 200% of the card and centered, so the card stays covered at
  // every rotation. Fill % is remapped so the surface sits at the same card
  // height as before: 0% → card bottom, 100% → card top.
  const frameFillPercent = 25 + clampedFill / 2;

  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-3xl border border-[#E3E8F5] bg-white/70 ${className}`}
    >
      <div
        ref={frameRef}
        className="absolute left-1/2 top-1/2 h-[200%] w-[200%] will-change-transform"
        style={{ transform: "translate(-50%, -50%) rotate(var(--g-angle, 0deg))" }}
      >
        <div
          className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-in-out"
          style={{ height: `${frameFillPercent}%` }}
        >
          <div className="absolute inset-0 top-3 bg-brand/25" />

          <div
            className="absolute inset-x-0 top-0 h-6 overflow-hidden"
            style={{ transform: "translateY(-50%)" }}
          >
            <svg
              className="absolute inset-0 h-full w-[200%] animate-wave-slow"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
            >
              <path
                fill="var(--color-brand)"
                fillOpacity="0.45"
                d="M0,160 C240,220 480,100 720,160 C960,220 1200,100 1440,160 L1440,320 L0,320 Z"
              />
            </svg>
            <svg
              className="absolute inset-0 h-full w-[200%] animate-wave-fast"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
            >
              <path
                fill="var(--color-brand)"
                fillOpacity="0.3"
                d="M0,180 C240,120 480,240 720,180 C960,120 1200,240 1440,180 L1440,320 L0,320 Z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
