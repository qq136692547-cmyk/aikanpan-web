"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

const LINE_COLORS = [
  "rgba(0,229,199,0.9)",
  "rgba(108,99,255,0.8)",
  "rgba(124,212,255,0.75)",
];

export function TechCanvasBackground({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let t = 0;
    let particles: Particle[] = [];
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(rect.width * dpr));
      h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      const count = Math.min(90, Math.max(24, Math.round((w * h) / 22000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25 * dpr,
        vy: (Math.random() - 0.5) * 0.2 * dpr,
        r: (Math.random() * 1.1 + 0.4) * dpr,
      }));
    };

    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "#07090D");
      bg.addColorStop(0.55, "#0A0E14");
      bg.addColorStop(1, "#080A0F");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // fine grid
      ctx.strokeStyle = "rgba(148,163,184,0.07)";
      ctx.lineWidth = 1;
      const gs = Math.max(34, Math.round(w / 18));
      ctx.beginPath();
      for (let x = 0; x <= w; x += gs) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
      }
      for (let y = 0; y <= h; y += gs) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
      }
      ctx.stroke();

      // flowing K-line style traces
      for (let li = 0; li < 3; li++) {
        const baseY = h * (0.3 + li * 0.2);
        const n = 46;
        const pts: [number, number][] = [];
        for (let i = 0; i <= n; i++) {
          const x = (i / n) * w;
          const y =
            baseY +
            Math.sin(i * 0.42 + t * 0.024 + li * 2.1) * h * 0.085 +
            Math.cos(i * 0.2 + t * 0.016) * h * 0.04;
          pts.push([x, y]);
        }
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, LINE_COLORS[li]);
        grad.addColorStop(0.78, LINE_COLORS[li]);
        grad.addColorStop(1, "transparent");
        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = LINE_COLORS[li];
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.68;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.restore();
      }

      // arc trails
      ctx.save();
      ctx.lineWidth = 1;
      for (let a = 0; a < 2; a++) {
        const cx = w * (0.3 + a * 0.4);
        const cy = h * (0.42 + a * 0.2);
        const r = Math.min(w, h) * 0.22;
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = a ? "rgba(108,99,255,0.45)" : "rgba(0,229,199,0.45)";
        ctx.beginPath();
        ctx.arc(cx, cy, r, -0.6 + t * 0.002, 1.6 + t * 0.002);
        ctx.stroke();
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.72, -0.2 + t * 0.003, 2.0 + t * 0.003);
        ctx.stroke();
      }
      ctx.restore();

      // particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.fillStyle = "rgba(148,203,255,0.7)";
        ctx.fillRect(p.x, p.y, p.r, p.r);
      }

      // particle links
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = "rgba(0,229,199,0.6)";
      ctx.lineWidth = 0.6;
      const linkDist = 120 * dpr;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          if (dx * dx + dy * dy < linkDist * linkDist) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
