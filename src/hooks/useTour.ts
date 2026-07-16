"use client";

import { useCallback, useRef } from "react";
import { driver, type DriveStep } from "driver.js";

export function useTour(steps: DriveStep[]) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const start = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = driver({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: "sp-tour-popover",
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      steps,
    });
    driverRef.current.drive();
  }, [steps]);

  return { start };
}
