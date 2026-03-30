import * as DialogPrimitive from '@radix-ui/react-dialog';

import {
  KANGUR_DIALOG_CONTENT_BASE_CLASSNAME,
  KANGUR_DIALOG_OVERLAY_BASE_CLASSNAME,
} from '@/features/kangur/ui/components/KangurDialogShell';
import { cn } from '@/features/kangur/shared/utils';
import { RadixOverlayContentShell } from '@/shared/ui/radix-overlay-content-shell';

import type { ComponentPropsWithoutRef, ReactNode, CSSProperties } from 'react';

type KangurDialogOverlayVariant = 'soft' | 'standard' | 'dark' | 'solid';
type KangurDialogContentVariant = 'standard' | 'choice' | 'panel';
type KangurDialogContentSize = 'sm' | 'md' | 'lg';

const OVERLAY_VARIANT_PROPS: Record<
  KangurDialogOverlayVariant,
  { className?: string; style?: CSSProperties }
> = {
  soft: {
    className: 'bg-slate-950/64 backdrop-blur-[6px]',
    style: {
      background:
        'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 14%, rgba(2,6,23,0.72))',
    },
  },
  standard: {
    className: 'bg-slate-950/72 backdrop-blur-[8px]',
    style: {
      background:
        'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 16%, rgba(2,6,23,0.7))',
    },
  },
  dark: {
    className: 'bg-black/60 !backdrop-blur-0',
  },
  solid: {
    className: 'bg-slate-950/72 !backdrop-blur-0',
  },
};

const CONTENT_VARIANT_CLASSNAMES: Record<KangurDialogContentVariant, string> = {
  standard: '',
  choice:
    'w-[92vw] max-w-sm border-0 bg-transparent p-0 shadow-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  panel:
    'rounded-[1.75rem] border border-[color:var(--kangur-page-border)] bg-[var(--kangur-page-background,#f8fafc)] p-0 shadow-[0_42px_124px_-52px_rgba(15,23,42,0.56)]',
};

const CONTENT_SIZE_CLASSNAMES: Record<KangurDialogContentSize, string> = {
  sm: 'w-[min(calc(100vw-2rem),32rem)]',
  md: 'w-[min(calc(100vw-2rem),42rem)]',
  lg: 'w-[min(calc(100vw-1rem),74rem)]',
};

type KangurDialogContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  'data-testid'?: string;
};

type KangurDialogOverlayProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
  'data-testid'?: string;
};

type KangurDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal?: boolean;
  overlayVariant?: KangurDialogOverlayVariant;
  contentVariant?: KangurDialogContentVariant;
  contentSize?: KangurDialogContentSize;
  overlayProps?: KangurDialogOverlayProps;
  contentProps?: KangurDialogContentProps;
  children: ReactNode;
};

const resolveKangurDialogOverlayProps = ({
  overlayProps,
  overlayVariant,
}: {
  overlayProps: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> | undefined;
  overlayVariant: KangurDialogOverlayVariant | undefined;
}): ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> => {
  const variantProps = overlayVariant ? OVERLAY_VARIANT_PROPS[overlayVariant] : undefined;
  return {
    ...variantProps,
    ...overlayProps,
    className: cn(variantProps?.className, overlayProps?.className),
    style: { ...variantProps?.style, ...overlayProps?.style },
  };
};

const resolveKangurDialogContentProps = ({
  contentProps,
  contentSize,
  contentVariant,
}: {
  contentProps: KangurDialogContentProps | undefined;
  contentSize: KangurDialogContentSize | undefined;
  contentVariant: KangurDialogContentVariant;
}): KangurDialogContentProps => ({
  ...contentProps,
  className: cn(
    CONTENT_VARIANT_CLASSNAMES[contentVariant],
    contentSize ? CONTENT_SIZE_CLASSNAMES[contentSize] : null,
    contentProps?.className
  ),
});

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
  const mergedOverlayProps = resolveKangurDialogOverlayProps({ overlayProps, overlayVariant });
  const mergedContentProps = resolveKangurDialogContentProps({
    contentProps,
    contentSize,
    contentVariant,
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <RadixOverlayContentShell
        Portal={DialogPrimitive.Portal}
        Overlay={DialogPrimitive.Overlay}
        Content={DialogPrimitive.Content}
        overlayBaseClassName={KANGUR_DIALOG_OVERLAY_BASE_CLASSNAME}
        contentBaseClassName={KANGUR_DIALOG_CONTENT_BASE_CLASSNAME}
        overlayProps={mergedOverlayProps}
        contentProps={mergedContentProps}
      >
        {children}
      </RadixOverlayContentShell>
    </DialogPrimitive.Root>
  );
}
