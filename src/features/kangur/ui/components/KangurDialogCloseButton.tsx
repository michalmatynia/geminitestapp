import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/features/kangur/shared/utils';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type KangurDialogCloseButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children'
> & {
  label?: ReactNode;
};

const closeButtonClassName = cn(
  'absolute right-4 top-4 z-10 cursor-pointer rounded-full border border-amber-200/80',
  'px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] touch-manipulation select-none min-h-11 active:scale-[0.97]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
  'shadow-[0_16px_34px_-26px_rgba(249,115,22,0.5)] transition'
);
const closeButtonStyle = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, rgba(254,243,199,0.95)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, rgba(255,237,213,0.9)) 100%)',
  color: '#9a5418',
} as const;

export function KangurDialogCloseButton({
  label = 'Zamknij',
  className,
  style,
  ...props
}: KangurDialogCloseButtonProps): React.JSX.Element {
  return (
    <DialogPrimitive.Close asChild>
      <button
        type='button'
        className={cn(closeButtonClassName, className)}
        style={{ ...closeButtonStyle, ...style }}
        {...props}
      >
        {label}
      </button>
    </DialogPrimitive.Close>
  );
}
