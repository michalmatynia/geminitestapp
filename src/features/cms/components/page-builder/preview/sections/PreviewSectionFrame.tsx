'use client';

import React from 'react';

import { cn } from '@/shared/utils';

interface PreviewSectionFrameProps {
  sectionId?: string;
  selectedRing: string;
  sectionStyles: React.CSSProperties;
  onSelect: () => void;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
  renderSectionActions: () => React.ReactNode;
  divider?: React.ReactNode;
  dividerPosition?: 'before' | 'after';
  topSlot?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function PreviewSectionFrame({
  sectionId,
  selectedRing,
  sectionStyles,
  onSelect,
  wrapInspector,
  renderSectionActions,
  divider,
  dividerPosition = 'before',
  topSlot,
  className,
  children,
}: PreviewSectionFrameProps): React.JSX.Element {
  const frame = (
    <div
      role='button'
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event: React.KeyboardEvent): void => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}
      style={sectionStyles}
      className={cn(
        'relative group w-full cursor-pointer text-left transition',
        selectedRing,
        sectionId ? `cms-node-${sectionId}` : null,
        className
      )}
    >
      {renderSectionActions()}
      {dividerPosition === 'before' ? divider : null}
      {topSlot}
      {dividerPosition === 'after' ? divider : null}
      {children}
    </div>
  );

  return <>{wrapInspector(frame)}</>;
}
