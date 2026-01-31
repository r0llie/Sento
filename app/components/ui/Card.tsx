// ============================================
// Sento - Card Component
// Flat, premium, layered depth system
// ============================================

'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'private' | 'public';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', padding = 'md', className = '', ...props }, ref) => {
    const variants = {
      // Default card - standard surface
      default: `
        bg-[#111113] 
        border border-[rgba(255,255,255,0.05)]
        shadow-[0_1px_2px_rgba(0,0,0,0.4)]
      `,
      // Elevated - Dropdowns, modals
      elevated: `
        bg-[#18181B]
        border border-[rgba(255,255,255,0.07)]
        shadow-[0_2px_8px_rgba(0,0,0,0.5)]
      `,
      // Interactive - Clickable cards
      interactive: `
        bg-[#111113]
        border border-[rgba(255,255,255,0.05)]
        shadow-[0_1px_2px_rgba(0,0,0,0.4)]
        transition-all duration-150 ease-out
        cursor-pointer
        hover:bg-[#16161A] hover:border-[rgba(255,255,255,0.07)]
      `,
      // Private - PREMIUM treatment (magic, glow)
      private: `
        bg-[#0F1412]
        border border-[rgba(94,217,179,0.15)]
        shadow-[0_0_20px_rgba(94,217,179,0.06)]
        relative
        before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none
        before:bg-gradient-to-br before:from-[rgba(94,217,179,0.04)] before:to-transparent
      `,
      // Public - Utility, flat, muted
      public: `
        bg-[#111113]
        border border-[rgba(255,255,255,0.04)]
        opacity-80
      `,
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={`rounded-lg ${variants[variant]} ${paddings[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className = '', ...props }, ref) => (
    <h3 ref={ref} className={`text-[12px] font-medium text-[#71717A] uppercase tracking-[0.04em] ${className}`} {...props}>
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ children, className = '', ...props }, ref) => (
    <p ref={ref} className={`text-[12px] text-[#52525B] mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] flex items-center gap-3 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export type { CardProps };
