'use client';

import { Brush, Circle, Eye, EyeOff, Lasso, PenLine, RectangleHorizontal, Trash2 } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import type { VectorShape, VectorShapeRole } from '@/shared/contracts/vector';
import {
  Button,
  Input,
  SelectSimple,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useMaskingState, useMaskingActions } from '../context/MaskingContext';

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

export interface ShapeListPanelProps {
  className?: string | undefined;
}

export function ShapeListPanel({
  className,
}: ShapeListPanelProps): React.JSX.Element {
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
    setEditName(shape.label ?? shape.name);
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
              isActive
                ? 'bg-accent/20 ring-1 ring-accent/40'
                : 'hover:bg-accent/10'
            )}
            onClick={() => setActiveMaskId(shape.id)}
          >
            {/* Color dot */}
            <span
              className='inline-block size-2.5 shrink-0 rounded-full'
              style={{ backgroundColor: displayColor }}
            />
            <ShapeIcon
              className={cn('size-3 shrink-0', iconColorClass)}
              aria-hidden='true'
            />

            {/* Name / rename */}
            <div className='min-w-0 flex-1'>
              {editingId === shape.id ? (
                <Input size='sm'
                  value={editName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                  }}
                  className='h-5 px-1 text-xs'
                  autoFocus
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                />
              ) : (
                <span
                  className='block truncate'
                  onDoubleClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    startRename(shape);
                  }}
                  title={shape.label ?? shape.name}
                >
                  {shape.label ?? shape.name}
                  {isMaskEligible && (
                    <span className='ml-1 text-[9px] font-semibold text-sky-400'>M</span>
                  )}
                </span>
              )}
            </div>

            {/* Role selector */}
            {isActive && (
              <div
                className='shrink-0'
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <SelectSimple
                  size='xs'
                  className='w-[86px]'
                  triggerClassName='h-5 px-1 text-[10px]'
                  value={shape.role ?? ''}
                  onValueChange={(value: string) => {
                    const nextValue = value.trim();
                    if (!nextValue) {
                      handleUpdateShape(shape.id, { role: undefined });
                      return;
                    }
                    if (!isVectorShapeRole(nextValue)) return;
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
            <Button size='xs'
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
            <Button size='xs'
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
