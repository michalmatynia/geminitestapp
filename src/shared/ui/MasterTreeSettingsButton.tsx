'use client';

import React from 'react';

import { cn, getFolderTreeInstanceSettingsHref, type FolderTreeInstance } from '@/shared/utils';

export interface MasterTreeSettingsButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'onMouseDown'
> {
  instance: FolderTreeInstance;
  href?: string;
  onOpen?: (instance: FolderTreeInstance) => void;
}

export function MasterTreeSettingsButton({
  instance,
  href,
  onOpen,
  className,
  ...props
}: MasterTreeSettingsButtonProps): React.JSX.Element {
  return (
    <button
      type='button'
      className={cn(
        'absolute bottom-2 right-2 z-20 inline-flex size-6 items-center justify-center rounded-full border border-border bg-muted/80 text-[11px] font-semibold lowercase text-gray-300 shadow-sm transition hover:bg-muted hover:text-white',
        className
      )}
      title='Open master tree instance settings'
      aria-label='Open master tree instance settings'
      onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation();
      }}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        if (onOpen) {
          onOpen(instance);
          return;
        }
        if (typeof window === 'undefined') return;
        window.location.assign(href ?? getFolderTreeInstanceSettingsHref(instance));
      }}
      {...props}
    >
      m
    </button>
  );
}
