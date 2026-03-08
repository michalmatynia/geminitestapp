'use client';

import {
  Brush,
  Circle,
  Eye,
  EyeOff,
  Lasso,
  PenLine,
  RectangleHorizontal,
  Type,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useState } from 'react';

import type { VectorShape, VectorShapeRole } from '@/shared/contracts/vector';
import { Button, Input, SelectSimple } from '@/shared/ui';
import { focusOnMount } from '@/shared/utils/focus-on-mount';
import { cn } from '@/shared/utils';

import { useMaskingState, useMaskingActions } from '../context/MaskingContext';
import type { GenerationHistoryPanelProps as ShapeListPanelProps } from './GenerationHistoryPanel';

const ROLE_OPTIONS: Array<{ value: VectorShapeRole; label: string }> = [
  { value: 'product', label: 'Product' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'background', label: 'Background' },
  { value: 'custom', label: 'Custom' },
];

const SHAPE_COLOR_MAP: Record<string, string> = {
  polygon: 'rgb(56, 189, 248)',
  lasso: 'rgb(56, 189, 248)',
  rect: 'rgb(251, 146, 60)',
  ellipse: 'rgb(251, 146, 60)',
  brush: 'rgb(168, 85, 247)',
};

const SHAPE_ICON_MAP = {
  polygon: PenLine,
  lasso: Lasso,
  rect: RectangleHorizontal,
  ellipse: Circle,
  brush: Brush,
  path: PenLine,
  text: Type,
  circle: Circle,
  line: PenLine,
  freehand: Brush,
} as const;

const SHAPE_ICON_COLOR_MAP: Record<string, string> = {
  polygon: 'text-sky-300',
  lasso: 'text-sky-300',
  rect: 'text-orange-300',
  ellipse: 'text-orange-300',
  brush: 'text-violet-300',
};

const isVectorShapeRole = (value: string): value is VectorShapeRole =>
  value === 'product' || value === 'shadow' || value === 'background' || value === 'custom';

export type { ShapeListPanelProps };

export function ShapeListPanel({ className }: ShapeListPanelProps): React.JSX.Element {
  const { maskShapes, activeMaskId } = useMaskingState();
  const { setMaskShapes, setActiveMaskId } = useMaskingActions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleUpdateShape = useCallback(
    (id: string, updates: Partial<VectorShape>) => {
      setMaskShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    },
    [setMaskShapes]
  );

  const handleDeleteShape = useCallback(
    (id: string) => {
      setMaskShapes((prev) => prev.filter((s) => s.id !== id));
      if (activeMaskId === id) setActiveMaskId(null);
    },
    [setMaskShapes, activeMaskId, setActiveMaskId]
  );

  const startRename = useCallback((shape: VectorShape) => {
    setEditingId(shape.id);
    setEditName(shape.label ?? shape.name ?? '');
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editName.trim()) {
      handleUpdateShape(editingId, { label: editName.trim() });
    }
    setEditingId(null);
    setEditName('');
  }, [editingId, editName, handleUpdateShape]);

  if (maskShapes.length === 0) {
    return (
      <div className={cn('px-2 py-3 text-center text-xs text-muted-foreground', className)}>
        No shapes drawn yet.
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {maskShapes.map((shape) => {
        const isActive = shape.id === activeMaskId;
        const displayColor = shape.color ?? SHAPE_COLOR_MAP[shape.type] ?? '#888';
        const ShapeIcon = SHAPE_ICON_MAP[shape.type] ?? PenLine;
        const iconColorClass = SHAPE_ICON_COLOR_MAP[shape.type] ?? 'text-gray-300';
        const isMaskEligible =
          (shape.type === 'polygon' || shape.type === 'lasso') &&
          shape.closed &&
          shape.points.length >= 3;

        return (
          <div
            key={shape.id}
            className={cn(
              'group flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors cursor-pointer',
              isActive ? 'bg-accent/20 ring-1 ring-accent/40' : 'hover:bg-accent/10'
            )}
          >
            {editingId === shape.id ? (
              <>
                <span
                  className='inline-block size-2.5 shrink-0 rounded-full'
                  style={{ backgroundColor: displayColor }}
                />
                <ShapeIcon className={cn('size-3 shrink-0', iconColorClass)} aria-hidden='true' />
                <div className='min-w-0 flex-1'>
                  <Input
                    ref={focusOnMount}
                    size='sm'
                    value={editName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') {
                        setEditingId(null);
                        setEditName('');
                      }
                    }}
                    className='h-5 px-1 text-xs'
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  />
                </div>
              </>
            ) : (
              <button
                type='button'
                onClick={() => setActiveMaskId(shape.id)}
                onDoubleClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  startRename(shape);
                }}
                aria-pressed={isActive}
                className='flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
              >
                <span
                  className='inline-block size-2.5 shrink-0 rounded-full'
                  style={{ backgroundColor: displayColor }}
                />
                <ShapeIcon className={cn('size-3 shrink-0', iconColorClass)} aria-hidden='true' />
                <span className='min-w-0 flex-1 truncate' title={shape.label ?? shape.name}>
                  {shape.label ?? shape.name}
                  {isMaskEligible ? (
                    <span className='ml-1 text-[9px] font-semibold text-sky-400'>M</span>
                  ) : null}
                </span>
              </button>
            )}

            {/* Role selector */}
            {isActive && (
              <div
                className='shrink-0'
                onClickCapture={(e: React.MouseEvent) => e.stopPropagation()}
                onMouseDownCapture={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <SelectSimple
                  size='xs'
                  className='w-[86px]'
                  triggerClassName='h-5 px-1 text-[10px]'
                  value={shape.role ?? ''}
                  onValueChange={(value: string) => {
                    const nextValue = value.trim();
                    if (!nextValue) {
                      handleUpdateShape(shape.id, { role: 'custom' });
                      return;
                    }
                    if (!isVectorShapeRole(nextValue)) {
                      handleUpdateShape(shape.id, { role: 'custom' });
                      return;
                    }
                    handleUpdateShape(shape.id, { role: nextValue });
                  }}
                  options={[
                    { value: '', label: 'Role' },
                    ...ROLE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                  ]}
                />
              </div>
            )}

            {/* Visibility toggle */}
            <Button
              size='xs'
              type='button'
              variant='ghost'
              className='size-5 shrink-0 text-gray-300 opacity-90 hover:text-white hover:opacity-100'
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleUpdateShape(shape.id, { visible: !shape.visible });
              }}
              title={shape.visible ? 'Hide shape' : 'Show shape'}
            >
              {shape.visible ? <Eye className='size-3.5' /> : <EyeOff className='size-3.5' />}
            </Button>

            {/* Delete */}
            <Button
              size='xs'
              type='button'
              variant='ghost'
              className='size-5 shrink-0 text-destructive/80 opacity-70 hover:opacity-100 hover:text-destructive'
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleDeleteShape(shape.id);
              }}
              title='Delete shape'
            >
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
