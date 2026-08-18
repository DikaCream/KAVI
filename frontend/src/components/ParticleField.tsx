import { useEffect, useRef } from "react";

interface P3 {
  x: number;
  y: number;
  z: number;
}

const COUNT = 110;
const PERSPECTIVE = 2.6;
const LINK_DIST = 0.62;

/** A slowly rotating sphere of nodes linked into a constellation. */
export default function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const points: P3[] = Array.from({ length: COUNT }, () => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
      };
    });

    const mouse = { x: 0, y: 0 };

    const resize = () => {
      const parent = canvas.parentElement;
      width = parent?.clientWidth ?? window.innerWidth;
      height = parent?.clientHeight ?? 400;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMouse = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const projected: { x: number; y: number; z: number; s: number }[] = [];

    const draw = (t: number) => {
      const a = t * 0.00016 + mouse.x * 0.4;
      const b = t * 0.0001 + mouse.y * 0.3;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const cosB = Math.cos(b);
      const sinB = Math.sin(b);

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        // rotate Y
        const x1 = p.x * cosA + p.z * sinA;
        const z1 = -p.x * sinA + p.z * cosA;
        // rotate X
        const y1 = p.y * cosB - z1 * sinB;
        const z2 = p.y * sinB + z1 * cosB;
        const s = PERSPECTIVE / (PERSPECTIVE + z2);
        projected[i] = {
          x: x1 * s * (Math.min(width, height) * 0.42) + width / 2,
          y: y1 * s * (Math.min(width, height) * 0.42) + height / 2,
          z: z2,
          s,
        };
      }

      // links
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i];
          const b = projected[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST * Math.min(width, height) * 0.6) {
            const alpha = (1 - d / (LINK_DIST * Math.min(width, height) * 0.6)) * 0.35;
            ctx.strokeStyle = `rgba(140, 200, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const p of projected) {
        const r = 0.8 + p.s * 1.6;
        ctx.fillStyle = `rgba(160, 220, 255, ${0.25 + p.s * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouse, { passive: true });
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return <canvas ref={ref} className="particle-field" aria-hidden="true" />;
}
