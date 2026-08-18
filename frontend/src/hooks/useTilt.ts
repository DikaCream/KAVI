import { useRef, type MouseEvent } from "react";

/** Adds a subtle 3D tilt that follows the cursor. */
export function useTilt<T extends HTMLElement>(max = 7) {
  const ref = useRef<T>(null);

  const onMouseMove = (e: MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(
      2,
    )}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
  };

  const onMouseLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return { ref, onMouseMove, onMouseLeave };
}
