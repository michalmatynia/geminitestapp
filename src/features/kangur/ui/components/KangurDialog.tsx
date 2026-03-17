'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';

import { KangurDialogShell } from '@/features/kangur/ui/components/KangurDialogShell';
import { cn } from '@/features/kangur/shared/utils';

import type { ComponentPropsWithoutRef, ReactNode, CSSProperties } from 'react';

type KangurDialogOverlayVariant = 'soft' | 'standard' | 'dark';
type KangurDialogContentVariant = 'standard' | 'choice';
type KangurDialogContentSize = 'sm' | 'md';

const OVERLAY_VARIANT_PROPS: Record<
  KangurDialogOverlayVariant,
  { className?: string; style?: CSSProperties }
> = {
  soft: {
    style: {
      background:
        'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 14%, rgba(2,6,23,0.72))',
    },
  },
  standard: {
    style: {
      background:
        'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 16%, rgba(2,6,23,0.7))',
    },
  },
  dark: {
    className: 'bg-black/60 !backdrop-blur-0',
  },
};

const CONTENT_VARIANT_CLASSNAMES: Record<KangurDialogContentVariant, string> = {
  standard: '',
  choice:
    'w-[92vw] max-w-sm border-0 bg-transparent p-0 shadow-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
};

const CONTENT_SIZE_CLASSNAMES: Record<KangurDialogContentSize, string> = {
  sm: 'w-[min(calc(100vw-2rem),32rem)]',
  md: 'w-[min(calc(100vw-2rem),42rem)]',
};

type KangurDialogContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  'data-testid'?: string;
};

type KangurDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal?: boolean;
  overlayVariant?: KangurDialogOverlayVariant;
  contentVariant?: KangurDialogContentVariant;
  contentSize?: KangurDialogContentSize;
  overlayProps?: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;
  contentProps?: KangurDialogContentProps;
  children: ReactNode;
};

export function KangurDialog({
  open,
  onOpenChange,
  modal,
  overlayVariant,
  contentVariant = 'standard',
  contentSize,
  overlayProps,
  contentProps,
  children,
}: KangurDialogProps): React.JSX.Element {
  const variantProps = overlayVariant ? OVERLAY_VARIANT_PROPS[overlayVariant] : undefined;
  const mergedOverlayProps = {
    ...variantProps,
    ...overlayProps,
    className: cn(variantProps?.className, overlayProps?.className),
    style: { ...variantProps?.style, ...overlayProps?.style },
  };

  const mergedContentProps = {
    ...contentProps,
    className: cn(
      CONTENT_VARIANT_CLASSNAMES[contentVariant],
      contentSize ? CONTENT_SIZE_CLASSNAMES[contentSize] : null,
      contentProps?.className
    ),
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <KangurDialogShell overlayProps={mergedOverlayProps} contentProps={mergedContentProps}>
        {children}
      </KangurDialogShell>
    </DialogPrimitive.Root>
  );
}
