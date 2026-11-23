/**
 * TRAE 黑客松视觉元素：代码粒子流、发光网格、数据脉冲
 * 纯 CSS/SVG 实现，支持减少动效设置
 */

import { useEffect, useRef, useState } from 'react';

interface CodeParticle {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  char: string;
}

interface CodeParticlesProps {
  count?: number;
  intensity?: 'low' | 'medium' | 'high';
  paused?: boolean;
}

const CODE_CHARS = [
  'function',
  'const',
  'AI',
  '{',
  '}',
  '=>',
  '==',
  '01',
  'if',
  'async',
  'await',
  'λ',
  '&&',
  '||',
  '...',
  'map',
  'filter',
];

export function CodeParticles({ count = 50, intensity = 'medium', paused = false }: CodeParticlesProps) {
  const [particles, setParticles] = useState<CodeParticle[]>([]);

  useEffect(() => {
    const generated: CodeParticle[] = [];
    for (let i = 0; i < count; i++) {
      generated.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 20,
        duration: 15 + Math.random() * 25,
        char: CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
      });
    }
    setParticles(generated);
  }, [count]);

  if (paused || particles.length === 0) return null;

  const opacity = intensity === 'low' ? 0.08 : intensity === 'high' ? 0.2 : 0.14;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ opacity }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="code-particle"
          style={
            {
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            } as React.CSSProperties
          }
        >
          {p.char}
        </div>
      ))}
      <style>{`
        .code-particle {
          position: absolute;
          font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
          font-size: clamp(10px, 1.2vw, 18px);
          font-weight: 400;
          color: var(--ec-accent);
          opacity: 0;
          animation: particle-float infinite ease-in-out;
          will-change: transform, opacity;
        }
        @keyframes particle-float {
          0%, 100% {
            opacity: 0;
            transform: translate(0, 0) scale(0.9);
          }
          10% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.3;
            transform: translate(calc(-20px + 40px * var(--rand-x, 0.5)), -60px) scale(1.1);
          }
          90% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}

export function GridPattern({ paused = false }: { paused?: boolean }) {
  if (paused) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.15]"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="trae-grid"
          x="0"
          y="0"
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 80 0 L 0 0 0 80"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-[var(--ec-accent)]"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#trae-grid)" />
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          #trae-grid { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}

interface DataPulseProps {
  active?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  paused?: boolean;
}

export function DataPulse({ active = false, position = 'top-left', paused = false }: DataPulseProps) {
  if (paused) return null;

  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0',
  };

  return (
    <div
      className={`pointer-events-none absolute ${positionClasses[position]} w-[400px] h-[400px] opacity-20`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 400 400" className="h-full w-full">
        <circle
          cx="200"
          cy="200"
          r="80"
          fill="none"
          stroke="var(--ec-accent)"
          strokeWidth="1.5"
          className={active ? 'data-pulse-ring' : ''}
        />
        <circle
          cx="200"
          cy="200"
          r="120"
          fill="none"
          stroke="var(--ec-accent)"
          strokeWidth="1"
          opacity="0.5"
          className={active ? 'data-pulse-ring' : ''}
          style={{ animationDelay: '0.5s' } as React.CSSProperties}
        />
      </svg>
      <style>{`
        .data-pulse-ring {
          animation: pulse-ring 3s ease-out infinite;
        }
        @keyframes pulse-ring {
          0% {
            r: 60;
            opacity: 0.8;
          }
          100% {
            r: 180;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export function CooperationGraph({ paused = false }: { paused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (paused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const nodes = Array.from({ length: 8 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    }));

    let frame = 0;
    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 更新节点位置
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
      });

      // 绘制连线
      ctx.strokeStyle = 'rgba(147, 173, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // 绘制节点
      ctx.fillStyle = 'rgba(147, 173, 255, 0.4)';
      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [paused]);

  if (paused) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
      aria-hidden="true"
    />
  );
}
