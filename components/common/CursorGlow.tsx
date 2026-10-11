'use client';

import React, { useEffect, useRef } from 'react';

export function CursorGlow() {
  const auraRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let targetX = -1000;
    let targetY = -1000;
    let currentX = -1000;
    let currentY = -1000;
    let rafId: number | null = null;
    let isInitialized = false;

    const tick = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      currentX += dx * 0.16;
      currentY += dy * 0.16;

      if (auraRef.current) {
        auraRef.current.style.left = `${(currentX - 220).toFixed(0)}px`;
        auraRef.current.style.top = `${(currentY - 220).toFixed(0)}px`;
      }

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!isInitialized) {
        currentX = targetX;
        currentY = targetY;
        isInitialized = true;
      }

      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      <div
        ref={auraRef}
        className="absolute h-[440px] w-[440px] rounded-full"
        style={{
          left: '-1000px',
          top: '-1000px',
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.055) 0%, rgba(14, 165, 233, 0.02) 40%, rgba(7, 9, 14, 0) 70%)',
        }}
      />
    </div>
  );
}
