import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

const inputVariants = cva(
  'flex h-10 w-full rounded-md border border-foreground/10 px-3 py-2 text-sm transition-colors ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:border-foreground/30 hover:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        subtle: 'bg-foreground/5 border-foreground/5 focus:bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
