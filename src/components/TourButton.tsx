"use client";

import { useEffect, useRef } from "react";
import type { DriveStep } from "driver.js";
import { useTour } from "@/hooks/useTour";

interface TourButtonProps {
  steps: DriveStep[];
  /** When set, the tour auto-starts once per browser the first time this key is seen. */
  autoStartKey?: string;
  label?: string;
}

export function TourButton({ steps, autoStartKey, label = "Take a tour" }: TourButtonProps) {
  const { start } = useTour(steps);
  const autoStarted = useRef(false);

  useEffect(() => {
    if (!autoStartKey || autoStarted.current) return;
    const seenKey = `supplierpulse-tour-seen:${autoStartKey}`;
    if (localStorage.getItem(seenKey)) return;

    autoStarted.current = true;
    localStorage.setItem(seenKey, "1");
    const timer = setTimeout(start, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartKey]);

  return (
    <button
      onClick={start}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-2"
    >
      <span aria-hidden>✦</span>
      {label}
    </button>
  );
}
