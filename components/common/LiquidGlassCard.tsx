'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export function LiquidGlassCard({
  className,
  children,
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl',
        'bg-[#0B0F19]/85 transition-colors duration-200',
        'border border-white/[0.08]',
        'shadow-[0_8px_32px_0_rgba(0,0,0,0.42),inset_0_1px_0_0_rgba(255,255,255,0.08)]',
        interactive &&
          'cursor-pointer hover:bg-[#0E1422]/90 hover:border-white/[0.16] hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.52),inset_0_1px_0_0_rgba(255,255,255,0.12)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
