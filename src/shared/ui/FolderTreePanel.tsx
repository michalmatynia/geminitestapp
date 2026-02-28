'use client';

import React from 'react';

import { cn, type FolderTreeInstance } from '@/shared/utils';

import { MasterTreeSettingsButton } from './MasterTreeSettingsButton';

export interface FolderTreePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  bodyClassName?: string;
  masterInstance?: FolderTreeInstance;
  masterSettingsHref?: string;
  onOpenMasterSettings?: (instance: FolderTreeInstance) => void;
}

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
      <div className={cn('flex-1 min-h-0', bodyClassName)}>{children}</div>
      {masterInstance ? (
        <MasterTreeSettingsButton
          instance={masterInstance}
          href={masterSettingsHref}
          onOpen={onOpenMasterSettings}
        />
      ) : null}
    </div>
  );
}
