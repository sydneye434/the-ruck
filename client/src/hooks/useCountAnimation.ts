// Developed by Sydney Edwards
import { useEffect, useRef, useState } from "react";

/**
 * Smoothly interpolates displayed number toward `target` over `durationMs`.
 * Cancels in-flight animation when `target` changes (rapid input).
 */
export function useCountAnimation(
  target: number | null,
  durationMs = 300,
  reducedMotion?: boolean
): number | null {
  const effectiveDuration = reducedMotion ? 0 : durationMs;
  const [display, setDisplay] = useState<number | null>(() => target);
  const valueRef = useRef<number | null>(display);

  useEffect(() => {
    valueRef.current = display;
  }, [display]);

  useEffect(() => {
    if (target == null) {
      valueRef.current = null;
      setDisplay(null);
      return;
    }
    if (effectiveDuration <= 0) {
      valueRef.current = target;
      setDisplay(target);
      return;
    }
    let raf = 0;
    const from = valueRef.current ?? target;
    if (Math.abs(from - target) < 1e-9) {
      valueRef.current = target;
      setDisplay(target);
      return;
    }
    const startTime = performance.now();
    const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / effectiveDuration);
      const eased = easeOut(t);
      const next = from + (target - from) * eased;
      valueRef.current = next;
      setDisplay(next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        valueRef.current = target;
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, effectiveDuration]);

  return display;
}
