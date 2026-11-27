"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";

const DURATION_MS = 280;

/** Rolls from the previous amount to the new one so a price change is noticed, not just swapped. */
export function AnimatedMoney({ minor, currency, className }: { minor: number; currency?: string; className?: string }) {
  const [shown, setShown] = useState(minor);
  const from = useRef(minor);

  useEffect(() => {
    const start = from.current;
    if (start === minor) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DURATION_MS;
    const began = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - began) / duration);
      const eased = 1 - (1 - t) ** 3;
      const value = Math.round(start + (minor - start) * eased);
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [minor]);

  return (
    <span className={className} aria-live="polite">
      {formatMoney(shown, currency)}
    </span>
  );
}
