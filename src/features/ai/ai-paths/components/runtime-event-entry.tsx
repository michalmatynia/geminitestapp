'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { RuntimeEventKindBadge, RuntimeEventLevelBadge } from './runtime-event-badges';

type RuntimeEventEntryProps = {
  timestamp: React.ReactNode;
  level: string | null | undefined;
  kind: string | null | undefined;
  message: React.ReactNode;
  details?: React.ReactNode;
  className?: string;
  timeClassName?: string;
  levelClassName?: string;
  kindClassName?: string;
  messageClassName?: string;
  metadataClassName?: string;
  trailingMetadata?: React.ReactNode;
  inlinePrefix?: React.ReactNode;
  stacked?: boolean;
  hideLevelLabel?: boolean;
  hideKindBadge?: boolean;
};

export function RuntimeEventEntry({
  timestamp,
  level,
  kind,
  message,
  details,
  className,
  timeClassName,
  levelClassName,
  kindClassName,
  messageClassName,
  metadataClassName,
  trailingMetadata,
  inlinePrefix,
  stacked = false,
  hideLevelLabel = false,
  hideKindBadge = false,
}: RuntimeEventEntryProps): React.JSX.Element {
  if (stacked) {
    return (
      <div className={className}>
        <div className={cn('flex flex-wrap items-center gap-1.5 text-[10px]', metadataClassName)}>
          <span className={timeClassName}>{timestamp}</span>
          <RuntimeEventLevelBadge
            level={level}
            hideLabel={hideLevelLabel}
            className={levelClassName}
          />
          {!hideKindBadge ? <RuntimeEventKindBadge kind={kind} className={kindClassName} /> : null}
          {trailingMetadata}
        </div>
        <div className={cn('mt-1 text-gray-200', messageClassName)}>{message}</div>
        {details}
      </div>
    );
  }

  return (
    <div className={className}>
      <span className={timeClassName}>{timestamp}</span>
      <RuntimeEventLevelBadge
        level={level}
        hideLabel={hideLevelLabel}
        className={levelClassName}
      />
      {!hideKindBadge ? <RuntimeEventKindBadge kind={kind} className={kindClassName} /> : null}
      {trailingMetadata}
      {inlinePrefix}
      <span className={cn('truncate text-gray-200', messageClassName)}>{message}</span>
      {details}
    </div>
  );
}
