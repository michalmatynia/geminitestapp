'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import React from 'react';

import type { TreeCaretProps } from '@/shared/contracts/ui/ui/menus';
import { cn } from '@/shared/utils/ui-utils';

import { useTreeNodeState } from './TreeContext';

export type { TreeCaretProps };

export function TreeCaret({
  nodeId,
  isOpen: propIsOpen,
  hasChildren = false,
  showDot = false,
  onToggle: propOnToggle,
  ariaLabel,
  className,
  buttonClassName,
  iconClassName,
  placeholderClassName,
  dotClassName,
}: TreeCaretProps): React.JSX.Element {
  const { isExpanded: contextExpanded, onToggleExpand: contextToggle } = useTreeNodeState(nodeId);

  const isOpen = propIsOpen ?? contextExpanded;
  const onToggle = propOnToggle ?? (nodeId ? contextToggle : undefined);

  const Icon = isOpen ? ChevronDown : ChevronRight;
  const iconClasses = cn('size-3.5', iconClassName);
  const sharedClasses = cn('inline-flex w-4 justify-center', className);

  if (!hasChildren) {
    if (showDot) {
      return (
        <span className={cn(sharedClasses, 'text-gray-500', dotClassName)} aria-hidden='true'>
          &bull;
        </span>
      );
    }
    return <span className={cn(sharedClasses, placeholderClassName)} aria-hidden='true' />;
  }

  if (!onToggle) {
    return (
      <span className={sharedClasses} aria-hidden='true'>
        <Icon className={iconClasses} aria-hidden='true' />
      </span>
    );
  }

  return (
    <button
      type='button'
      aria-label={ariaLabel ?? (isOpen ? 'Collapse section' : 'Expand section')}
      aria-expanded={isOpen}
      className={cn('rounded p-0.5 hover:bg-muted/50', sharedClasses, buttonClassName)}
      onClick={(event: React.MouseEvent): void => {
        event.stopPropagation();
        onToggle(event);
      }}
      onDoubleClick={(event: React.MouseEvent): void => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event: React.MouseEvent): void => event.stopPropagation()}
      onKeyDown={(event: React.KeyboardEvent): void => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onToggle(event);
        }
      }}
      title={ariaLabel ?? (isOpen ? 'Collapse section' : 'Expand section')}>
      <Icon className={iconClasses} aria-hidden='true' />
    </button>
  );
}
