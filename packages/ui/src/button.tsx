import * as React from 'react';
import { cn } from './cn';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]':
              variant === 'primary',
            'bg-[var(--secondary)] text-white hover:opacity-90':
              variant === 'secondary',
            'border border-[var(--border)] bg-white hover:bg-[var(--background)]':
              variant === 'outline',
            'hover:bg-[var(--primary-light)]': variant === 'ghost',
            'bg-[var(--danger)] text-white hover:opacity-90':
              variant === 'danger',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
