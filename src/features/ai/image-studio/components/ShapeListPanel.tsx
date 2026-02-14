'use client';

import { Eye, EyeOff, Trash2 } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import type { VectorShape, VectorShapeRole } from '@/shared/types/domain/vector';
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
              <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <SelectSimple size='sm'
                  className='w-[72px]'
                  value={shape.role ?? undefined}
                  onValueChange={(value: string) =>
                    handleUpdateShape(shape.id, { role: value as VectorShapeRole })
                  }
                  options={ROLE_OPTIONS}
                  placeholder='Role'
                  triggerClassName='h-5 px-1 text-[10px]'
                  ariaLabel='Shape role'
                />
              </div>
            )}

            {/* Visibility toggle */}
            <Button size='xs'
              type='button'
              variant='ghost'
              className='size-5 opacity-60 hover:opacity-100'
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleUpdateShape(shape.id, { visible: !shape.visible });
              }}
              title={shape.visible ? 'Hide shape' : 'Show shape'}
            >
              {shape.visible ? <Eye className='size-3' /> : <EyeOff className='size-3' />}
            </Button>

            {/* Delete */}
            <Button size='xs'
              type='button'
              variant='ghost'
              className='size-5 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-destructive'
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleDeleteShape(shape.id);
              }}
              title='Delete shape'
            >
              <Trash2 className='size-3' />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
