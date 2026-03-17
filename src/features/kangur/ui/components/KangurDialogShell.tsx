'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/features/kangur/shared/utils';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

const DEFAULT_OVERLAY_CLASSNAME = cn(
  'fixed inset-0 z-50 backdrop-blur-[2px]',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
);
const DEFAULT_CONTENT_CLASSNAME = cn(
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
  const { className: overlayClassName, style: overlayStyle, ...overlayRest } =
    overlayProps ?? {};
  const { className: contentClassName, style: contentStyle, ...contentRest } =
    contentProps ?? {};

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(DEFAULT_OVERLAY_CLASSNAME, overlayClassName)}
        style={overlayStyle}
        {...overlayRest}
      />
      <DialogPrimitive.Content
        className={cn(DEFAULT_CONTENT_CLASSNAME, contentClassName)}
        style={contentStyle}
        {...contentRest}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
