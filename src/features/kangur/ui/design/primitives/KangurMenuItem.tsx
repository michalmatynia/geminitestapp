import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

export const kangurMenuItemVariants = cva(
  'kangur-menu-item relative flex cursor-default select-none items-center font-medium [color:var(--kangur-page-muted-text)] outline-none transition-colors focus:[background:var(--kangur-nav-item-hover-background)] focus:[color:var(--kangur-page-text)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:[background:var(--kangur-nav-item-hover-background)] data-[highlighted]:[color:var(--kangur-page-text)]'
);

export type KangurMenuItemProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
};

export const KangurMenuItem = React.forwardRef<HTMLDivElement, KangurMenuItemProps>(
  ({ asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        ref={ref}
        className={cn(kangurMenuItemVariants(), className)}
        {...props}
      />
    );
  }
);
KangurMenuItem.displayName = 'KangurMenuItem';
