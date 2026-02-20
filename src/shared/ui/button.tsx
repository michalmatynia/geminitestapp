import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-transparent text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ring-offset-background cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'border-foreground/15 bg-transparent text-foreground/90 hover:bg-foreground/8 hover:text-foreground',
        primary:
          'border-foreground/25 bg-transparent text-foreground hover:bg-foreground/10',
        solid:
          'bg-blue-600 text-white hover:bg-blue-700 border-transparent',
        'solid-destructive':
          'bg-red-600 text-white hover:bg-red-700 border-transparent',
        destructive:
          'bg-destructive/15 text-destructive hover:bg-destructive/25',
        outline:
          'border-foreground/15 bg-transparent hover:bg-foreground/8',
        secondary:
          'bg-muted/30 hover:bg-muted/45',
        success:
          'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
        warning:
          'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20',
        info:
          'bg-sky-500/10 text-sky-500 border-sky-500/20 hover:bg-sky-500/20',
        ghost: 'bg-transparent hover:bg-foreground/8',
        link: 'text-foreground/80 underline-offset-4 hover:underline hover:text-foreground',
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        xs: 'h-7 rounded-md px-2 text-xs',
        sm: 'h-8 rounded-lg px-3',
        lg: 'h-10 rounded-lg px-4',
        icon: 'size-9 rounded-full',
        'icon-lg': 'size-14 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    const content = loading ? (
      <>
        <Loader2 className='size-4 animate-spin' />
        {loadingText || children}
      </>
    ) : (
      children
    );

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), loading && 'gap-2')}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
