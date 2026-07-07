type WaterFillProps = {
  fillPercent: number;
  tilt?: number;
  className?: string;
};

export default function WaterFill({ fillPercent, tilt = 0, className = "" }: WaterFillProps) {
  const clampedFill = Math.max(0, Math.min(100, fillPercent));
  const rotateDeg = tilt * 6;
  const shiftPx = tilt * 8;

  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-3xl border border-[#E3E8F5] bg-white/70 ${className}`}
    >
      <div
        className="absolute -inset-x-[6%] bottom-0 transition-all duration-700 ease-in-out"
        style={{ height: `${clampedFill}%`, transform: `translateX(${shiftPx}px)` }}
      >
        <div className="absolute inset-0 top-3 bg-brand/25" />

        <div
          className="absolute inset-x-0 top-0 h-6 overflow-hidden transition-transform duration-500 ease-out"
          style={{ transform: `translateY(-50%) rotate(${rotateDeg}deg)` }}
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
  );
}
