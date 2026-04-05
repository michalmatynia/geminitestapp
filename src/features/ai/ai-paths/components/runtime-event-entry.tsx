import React from 'react';

import { StatusBadge } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';

import {
  getRuntimeEventDotVariant,
  getRuntimeEventKindLabel,
  getRuntimeEventKindVariant,
  getRuntimeEventLevelVariant,
} from './runtime-event-badges';

export type RuntimeEventEntryProps = {
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

export function renderRuntimeEventEntry({
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
  const levelBadge = (
    <StatusBadge
      status={hideLevelLabel ? '' : level ?? 'info'}
      variant={hideLevelLabel ? getRuntimeEventDotVariant(level) : getRuntimeEventLevelVariant(level)}
      size='sm'
      hideLabel={hideLevelLabel}
      className={levelClassName}
    />
  );
  const kindBadge = hideKindBadge ? null : (
    <StatusBadge
      status={getRuntimeEventKindLabel(kind)}
      variant={getRuntimeEventKindVariant(kind)}
      size='sm'
      className={kindClassName}
    />
  );

  if (stacked) {
    return (
      <div className={className}>
        <div className={cn('flex flex-wrap items-center gap-1.5 text-[10px]', metadataClassName)}>
          <span className={timeClassName}>{timestamp}</span>
          {levelBadge}
          {kindBadge}
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
      {levelBadge}
      {kindBadge}
      {trailingMetadata}
      {inlinePrefix}
      <span className={cn('truncate text-gray-200', messageClassName)}>{message}</span>
      {details}
    </div>
  );
}
