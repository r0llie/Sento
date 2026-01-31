// ============================================
// Sento - Button Component
// Clear hierarchy: Primary > Secondary > Ghost
// Only ONE primary button per screen
// ============================================

'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium select-none
      transition-all duration-[120ms] ease-out
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090A]
      disabled:cursor-not-allowed disabled:transform-none
    `;

    const variants = {
      // Primary - Main CTA (LEVEL A: brightest, max 1 per screen)
      primary: `
        bg-[#5ED9B3] text-[#09090B]
        hover:bg-[#6FE9C3]
        active:scale-[0.98]
        focus-visible:ring-[#5ED9B3]/40
        disabled:bg-[#3F3F46] disabled:text-[#52525B]
      `,
      // Secondary - Supporting actions (LEVEL C: muted)
      secondary: `
        bg-transparent text-[#71717A]
        border border-[rgba(255,255,255,0.07)]
        hover:text-[#FAFAFA] hover:border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.02)]
        active:scale-[0.98]
        focus-visible:ring-[rgba(255,255,255,0.15)]
        disabled:text-[#3F3F46] disabled:border-[rgba(255,255,255,0.04)]
      `,
      // Ghost - Tertiary (LEVEL C: most muted)
      ghost: `
        bg-transparent text-[#52525B]
        hover:text-[#71717A] hover:bg-[rgba(255,255,255,0.02)]
        active:scale-[0.98]
        focus-visible:ring-[rgba(255,255,255,0.15)]
        disabled:text-[#3F3F46]
      `,
    };

    const sizes = {
      sm: 'h-[34px] px-4 text-[12px] gap-1.5 rounded-[5px]',
      md: 'h-[42px] px-5 text-[13px] gap-2 rounded-[6px]',
      lg: 'h-12 px-6 text-[14px] gap-2 rounded-[6px]',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
