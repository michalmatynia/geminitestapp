'use client';

import React from 'react';

import { cn, type FolderTreeInstance } from '@/shared/utils';

export interface FolderTreePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  bodyClassName?: string;
  masterInstance?: FolderTreeInstance;
  masterSettingsHref?: string;
  onOpenMasterSettings?: (instance: FolderTreeInstance) => void;
}

const getMasterInstanceSettingsHref = (instance: FolderTreeInstance): string =>
  `/admin/settings/folder-trees#folder-tree-instance-${instance}`;

export function FolderTreePanel({
  header,
  bodyClassName,
  className,
  masterInstance,
  masterSettingsHref,
  onOpenMasterSettings,
  children,
  ...props
}: FolderTreePanelProps): React.JSX.Element {
  return (
    <div className={cn('relative flex h-full flex-col', className)} {...props}>
      {header}
      <div className={cn('flex-1 min-h-0', bodyClassName)}>
        {children}
      </div>
      {masterInstance ? (
        <button
          type='button'
          className='absolute bottom-2 right-2 z-20 inline-flex size-6 items-center justify-center rounded-full border border-border bg-muted/80 text-[11px] font-semibold lowercase text-gray-300 shadow-sm transition hover:bg-muted hover:text-white'
          title='Open master tree instance settings'
          aria-label='Open master tree instance settings'
          onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
            event.stopPropagation();
          }}
          onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
            event.preventDefault();
            event.stopPropagation();
            if (onOpenMasterSettings) {
              onOpenMasterSettings(masterInstance);
              return;
            }
            if (typeof window === 'undefined') return;
            window.location.assign(masterSettingsHref ?? getMasterInstanceSettingsHref(masterInstance));
          }}
        >
          m
        </button>
      ) : null}
    </div>
  );
}
