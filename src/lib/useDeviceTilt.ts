"use client";

import { useState } from "react";

type TiltPermission = "unknown" | "unnecessary" | "granted" | "denied";

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function detectSupport() {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

function detectInitialPermission(): TiltPermission {
  if (!detectSupport()) return "unknown";
  const requestPermission = (DeviceMotionEvent as DeviceMotionEventWithPermission)
    .requestPermission;
  return typeof requestPermission === "function" ? "unknown" : "unnecessary";
}

// Manages only the permission handshake (iOS gates devicemotion behind a
// user-gesture prompt). The actual sensor subscription lives in WaterFill,
// which writes the gravity angle to a CSS variable — never through React
// state, since the sensor fires at up to 60Hz.
export function useDeviceTilt() {
  const [supported] = useState(detectSupport);
  const [permission, setPermission] = useState<TiltPermission>(detectInitialPermission);

  const enableTilt = async () => {
    const requestPermission = (DeviceMotionEvent as DeviceMotionEventWithPermission)
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

  const tiltEnabled = supported && (permission === "granted" || permission === "unnecessary");

  return { supported, permission, enableTilt, tiltEnabled };
}
