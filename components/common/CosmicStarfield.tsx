'use client';

import React, { useEffect, useRef } from 'react';

interface StarNode {
  baseX: number;
  baseY: number;
  z: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  parallaxFactor: number;
  isCyanTint: boolean;
}

export function CosmicStarfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let stars: StarNode[] = [];
    let scrollY = window.scrollY || 0;
    const mouse = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
    };

    const initStars = (w: number, h: number) => {
      // Balanced star density (max 360 stars) for zero GPU backdrop-blur lag
      const count = Math.min(360, Math.max(200, Math.floor((w * h) / 5200)));
      stars = [];

      for (let i = 0; i < count; i++) {
        const depth = Math.random();
        stars.push({
          baseX: Math.random() * w,
          baseY: Math.random() * h,
          z: depth,
          size: depth > 0.85 ? 1.8 : depth > 0.5 ? 1.25 : 0.9,
          brightness: 0.32 + depth * 0.68,
          twinkleSpeed: 0.012 + Math.random() * 0.028,
          twinkleOffset: Math.random() * Math.PI * 2,
          parallaxFactor: 0.035 + depth * 0.14,
          isCyanTint: Math.random() < 0.42,
        });
      }
    };

    let currentW = window.innerWidth;
    let currentH = window.innerHeight;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      currentW = w;
      currentH = h;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars(w, h);
    };

    const handleScroll = () => {
      scrollY = window.scrollY || 0;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    handleResize();

    let time = 0;
    let lastFrameTime = 0;
    const FRAME_INTERVAL = 1000 / 28; // Smooth 28fps cadence avoids saturating GPU backdrop-blur

    const render = (now: number) => {
      animationFrameId = requestAnimationFrame(render);

      if (document.hidden || now - lastFrameTime < FRAME_INTERVAL) {
        return;
      }
      lastFrameTime = now;

      time += 0.035;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      const w = currentW;
      const h = currentH;

      ctx.clearRect(0, 0, w, h);

      const driftX = (mouse.x - w * 0.5) * 0.015;
      const driftY = (mouse.y - h * 0.5) * 0.015;

      const dimWhite: { x: number; y: number; sz: number }[] = [];
      const dimCyan: { x: number; y: number; sz: number }[] = [];
      const brightWhite: { x: number; y: number; r: number }[] = [];
      const brightCyan: { x: number; y: number; r: number }[] = [];

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle =
          0.45 + 0.55 * Math.sin(time * s.twinkleSpeed * 42 + s.twinkleOffset);
        const alpha = s.brightness * twinkle;

        const rawX =
          s.baseX +
          Math.sin(time * 0.1 + s.twinkleOffset) * 1.4 -
          driftX * (0.4 + s.z);
        const rawY =
          s.baseY -
          scrollY * s.parallaxFactor +
          Math.cos(time * 0.1 + s.twinkleOffset) * 1.4 -
          driftY * (0.4 + s.z);

        const x = ((rawX % w) + w) % w;
        const y = ((rawY % h) + h) % h;

        if (alpha > 0.55 && s.size > 1.2) {
          if (s.isCyanTint) {
            brightCyan.push({ x, y, r: s.size * 0.75 });
          } else {
            brightWhite.push({ x, y, r: s.size * 0.75 });
          }
        } else {
          if (s.isCyanTint) {
            dimCyan.push({ x, y, sz: s.size });
          } else {
            dimWhite.push({ x, y, sz: s.size });
          }
        }
      }

      ctx.fillStyle = 'rgba(224, 242, 254, 0.55)';
      for (let i = 0; i < dimWhite.length; i++) {
        const p = dimWhite[i];
        ctx.fillRect(p.x - p.sz * 0.5, p.y - p.sz * 0.5, p.sz, p.sz);
      }

      ctx.fillStyle = 'rgba(125, 211, 252, 0.48)';
      for (let i = 0; i < dimCyan.length; i++) {
        const p = dimCyan[i];
        ctx.fillRect(p.x - p.sz * 0.5, p.y - p.sz * 0.5, p.sz, p.sz);
      }

      ctx.fillStyle = 'rgba(240, 249, 255, 0.92)';
      ctx.beginPath();
      for (let i = 0; i < brightWhite.length; i++) {
        const p = brightWhite[i];
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.fillStyle = 'rgba(186, 230, 253, 0.88)';
      ctx.beginPath();
      for (let i = 0; i < brightCyan.length; i++) {
        const p = brightCyan[i];
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 h-full w-full select-none overflow-hidden">
      {/* Static GPU-cached cosmic nebula layer (zero per-frame gradient redraw cost) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 38%, rgba(14, 116, 185, 0.14) 0%, rgba(12, 74, 134, 0.06) 42%, rgba(7, 34, 72, 0.02) 72%, rgba(7, 9, 14, 0) 100%)',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
