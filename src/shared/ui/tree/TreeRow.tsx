'use client';

import { Slot } from '@radix-ui/react-slot';
import React from 'react';

import { cn } from '@/shared/utils';

import { useTreeNodeState } from './TreeContext';

export type TreeRowTone = 'primary' | 'subtle' | 'neutral' | 'none';

const TONE_CLASSES: Record<TreeRowTone, { base: string; selected: string; dragOver: string }> = {
  primary: {
    base: 'text-gray-300 hover:bg-muted/50 hover:text-white',
    selected: 'bg-blue-600 text-white',
    dragOver: 'bg-emerald-600 text-white',
  },
  subtle: {
    base: 'text-gray-200 hover:bg-muted/40',
    selected: 'bg-muted text-white',
    dragOver: 'bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50',
  },
  neutral: {
    base: 'text-gray-200 hover:bg-muted/30',
    selected: 'bg-gray-700 text-white',
    dragOver: 'bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50',
  },
  none: {
    base: '',
    selected: '',
    dragOver: '',
  },
};

export interface TreeRowProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  nodeId?: string;
  depth?: number;
  baseIndent?: number;
  indent?: number;
  disableIndent?: boolean;
  tone?: TreeRowTone;
  selected?: boolean;
  dragOver?: boolean;
  selectedClassName?: string;
  dragOverClassName?: string;
}

export function TreeRow({
  asChild = false,
  nodeId,
  depth = 0,
  baseIndent = 8,
  indent = 16,
  disableIndent = false,
  tone = 'primary',
  selected: propSelected,
  dragOver = false,
  selectedClassName,
  dragOverClassName,
  className,
  style,
  ...props
}: TreeRowProps): React.JSX.Element {
  const { isSelected: contextSelected } = useTreeNodeState(nodeId);
  const selected = propSelected ?? contextSelected;

  const toneClasses = TONE_CLASSES[tone];
  const mergedClassName = cn(
    'group relative flex items-center gap-2 rounded px-2 py-1.5 transition',
    toneClasses.base,
    selected ? selectedClassName ?? toneClasses.selected : '',
    dragOver ? dragOverClassName ?? toneClasses.dragOver : '',
    className
  );
  const mergedStyle: React.CSSProperties | undefined = disableIndent
    ? style
    : { paddingLeft: baseIndent + depth * indent, ...style };
  const Comp = asChild ? Slot : 'div';

  return <Comp className={mergedClassName} style={mergedStyle} {...props} />;
}
