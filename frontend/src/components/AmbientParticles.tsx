import { useEffect, useRef } from 'react';

// Drifting abstract glyphs behind the UI. Canvas-based so it stays cheap.
const GLYPHS = ['∫', 'π', '∞', 'Σ', '∆', '√', '∂', 'λ', 'φ', 'ψ', 'Ω', 'ξ', '≈', '±'];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  glyph: string;
  size: number;
  alpha: number;
  targetAlpha: number;
  rot: number;
  rotSpeed: number;
};

export function AmbientParticles({ intensity = 1 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particleCount = Math.max(14, Math.min(34, Math.floor((width * height) / 42000)));
    particlesRef.current = Array.from({ length: particleCount }, () => spawn(width, height));

    window.addEventListener('resize', resize);

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particlesRef.current) {
        p.x += p.vx * intensity;
        p.y += p.vy * intensity;
        p.rot += p.rotSpeed;
        p.alpha += (p.targetAlpha - p.alpha) * 0.02;

        if (p.x < -30) p.x = width + 30;
        if (p.x > width + 30) p.x = -30;
        if (p.y < -30) p.y = height + 30;
        if (p.y > height + 30) p.y = -30;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.font = `${p.size}px 'Inter', ui-sans-serif`;
        ctx.fillStyle = '#7dd3fc';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(p.glyph, 0, 0);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}

function spawn(w: number, h: number): Particle {
  const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  const size = 16 + Math.random() * 38;
  const baseAlpha = 0.04 + Math.random() * 0.08;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.2,
    vy: -0.05 - Math.random() * 0.15,
    glyph,
    size,
    alpha: 0,
    targetAlpha: baseAlpha,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.002,
  };
}
