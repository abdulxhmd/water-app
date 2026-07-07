"use client";

import { useEffect, useState } from "react";

type TiltPermission = "unknown" | "unnecessary" | "granted" | "denied";

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const MAX_GAMMA = 30;

function detectSupport() {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

function detectInitialPermission(): TiltPermission {
  if (!detectSupport()) return "unknown";
  const requestPermission = (DeviceOrientationEvent as DeviceOrientationEventWithPermission)
    .requestPermission;
  return typeof requestPermission === "function" ? "unknown" : "unnecessary";
}

export function useDeviceTilt() {
  const [tilt, setTilt] = useState(0);
  const [supported] = useState(detectSupport);
  const [permission, setPermission] = useState<TiltPermission>(detectInitialPermission);

  useEffect(() => {
    if (permission !== "granted" && permission !== "unnecessary") return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma == null) return;
      const clamped = Math.max(-MAX_GAMMA, Math.min(MAX_GAMMA, event.gamma));
      setTilt(clamped / MAX_GAMMA);
    };

    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [permission]);

  const enableTilt = async () => {
    const requestPermission = (DeviceOrientationEvent as DeviceOrientationEventWithPermission)
      .requestPermission;

    if (typeof requestPermission !== "function") {
      setPermission("unnecessary");
      return;
    }

    try {
      const result = await requestPermission();
      setPermission(result === "granted" ? "granted" : "denied");
    } catch {
      setPermission("denied");
    }
  };

  return { tilt, supported, permission, enableTilt };
}
