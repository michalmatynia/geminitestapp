/* eslint-disable */
// @ts-nocheck
'use client';

import React from 'react';
import { 
  Undo, Redo, Bold, Italic, Underline, Strikethrough, Code, 
  Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, 
  CheckSquare, Quote, Minus, Link as LinkIcon, Image as ImageIcon, 
  Table as TableIcon, AlignLeft, AlignRight, AlignCenter, AlignJustify, Eraser 
} from 'lucide-react';
import { Button, SelectSimple } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { RichTextEditorVariant } from '../types';

export interface ToolbarButtonProps {
  title: string;
  onClick: () => void;
  isActive?: boolean | undefined;
  disabled?: boolean | undefined;
  variant: RichTextEditorVariant;
  children: React.ReactNode;
}

export function ToolbarButton({
  title,
  onClick,
  isActive = false,
  disabled = false,
  variant,
  children,
}: ToolbarButtonProps): React.JSX.Element {
  if (variant === 'full') {
    return (
      <Button
        type='button'
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
          'rounded p-1.5 transition-colors',
          isActive
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-200 hover:bg-gray-700',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      type='button'
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-7 w-7 rounded border p-0',
        isActive
          ? 'border-blue-500/50 bg-blue-500/20 text-blue-100'
          : 'border-border/60 bg-card/60 text-gray-200 hover:bg-muted/50'
      )}
    >
      {children}
    </Button>
  );
}
