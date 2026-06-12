import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'square' | 'circle' | 'triangle';
  life: number;
}

interface ConfettiEffectProps {
  active: boolean;
  duration?: number;
}

const COLORS = [
  '#FF006E', // ig-pink
  '#8338EC', // ig-purple
  '#FB5607', // ig-orange
  '#FFBE0B', // ig-yellow
  '#3A86FF', // blue
  '#06FFB4', // mint
  '#FF4081', // hot pink
  '#E040FB', // purple accent
];

const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ active, duration = 4000 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(0);

  const createParticles = (count: number): Particle[] => {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    return Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 3 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
      shape: (['square', 'circle', 'triangle'] as const)[Math.floor(Math.random() * 3)],
      life: 1,
    }));
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle) => {
    ctx.save();
    ctx.globalAlpha = p.opacity * p.life;
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);

    if (p.shape === 'square') {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    } else if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -p.size / 2);
      ctx.lineTo(p.size / 2, p.size / 2);
      ctx.lineTo(-p.size / 2, p.size / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(animRef.current);
      particlesRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    startTimeRef.current = Date.now();
    particlesRef.current = createParticles(180);

    let burstInterval: ReturnType<typeof setInterval>;
    let burstCount = 0;
    burstInterval = setInterval(() => {
      burstCount++;
      particlesRef.current.push(...createParticles(60));
      if (burstCount >= 3) clearInterval(burstInterval);
    }, 600);

    const animate = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const elapsed = Date.now() - startTimeRef.current;
      const progress = elapsed / duration;

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.vx *= 0.99; // air resistance
        p.rotation += p.rotationSpeed;
        p.life = Math.max(0, 1 - (p.y / canvas.height) * 1.2);
        drawParticle(ctx, p);
        return p.y < canvas.height + 20 && p.life > 0.01;
      });

      if (elapsed < duration || particlesRef.current.length > 0) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      clearInterval(burstInterval);
      cancelAnimationFrame(animRef.current);
    };
  }, [active, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default ConfettiEffect;
