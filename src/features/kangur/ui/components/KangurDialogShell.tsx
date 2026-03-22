'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';

import { RadixOverlayContentShell } from '@/shared/ui/radix-overlay-content-shell';
import { cn } from '@/features/kangur/shared/utils';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export const KANGUR_DIALOG_OVERLAY_BASE_CLASSNAME = cn(
  'fixed inset-0 z-50 backdrop-blur-[2px]',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
);
export const KANGUR_DIALOG_CONTENT_BASE_CLASSNAME = cn(
  'fixed left-1/2 top-1/2 z-50',
  'kangur-max-h-screen-2 -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
  'outline-none'
);

type KangurDialogShellProps = {
  children: ReactNode;
  overlayProps?: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;
  contentProps?: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>;
};

export function KangurDialogShell({
  children,
  overlayProps,
  contentProps,
}: KangurDialogShellProps): React.JSX.Element {
  return (
    <RadixOverlayContentShell
      Portal={DialogPrimitive.Portal}
      Overlay={DialogPrimitive.Overlay}
      Content={DialogPrimitive.Content}
      overlayBaseClassName={KANGUR_DIALOG_OVERLAY_BASE_CLASSNAME}
      contentBaseClassName={KANGUR_DIALOG_CONTENT_BASE_CLASSNAME}
      overlayProps={overlayProps}
      contentProps={contentProps}
    >
      {children}
    </RadixOverlayContentShell>
  );
}
