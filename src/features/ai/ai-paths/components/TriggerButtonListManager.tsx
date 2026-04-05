'use client';

import { GripVertical, Trash2, Edit, RefreshCw } from 'lucide-react';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import type { AiTriggerButtonRecord as StoredAiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { Button, Switch } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';

import type { ColumnDef, Row } from '@tanstack/react-table';

// Define the record type for clarity as it's used extensively
export type AiTriggerButtonRow = StoredAiTriggerButtonRecord & {
  usedPaths?: Array<{
    id: string;
    name: string;
  }>;
};

type TriggerButtonListManagerProps = {
  data: AiTriggerButtonRow[];
  onEdit: (item: AiTriggerButtonRow) => void;
  onDelete: (id: string) => void;
  onOrderChange: (orderedIds: string[]) => void;
  onToggleVisibility: (item: AiTriggerButtonRow, enabled: boolean) => void;
  onOpenPath?: ((pathId: string) => void) | undefined;
  isLoading: boolean;
  isReordering?: boolean;
};

export const TriggerButtonListManager: React.FC<TriggerButtonListManagerProps> = (
  props: TriggerButtonListManagerProps
) => {
  const {
    data,
    onEdit,
    onDelete,
    onOrderChange,
    onToggleVisibility,
    onOpenPath,
    isLoading,
    isReordering = false,
  } = props;

  const [localRows, setLocalRows] = useState<AiTriggerButtonRow[]>(data);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pendingOrderedIds, setPendingOrderedIds] = useState<string[] | null>(null);
  const dropHandledRef = useRef(false);
  const dragHandleArmedIdRef = useRef<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Keep local order while reorder mutation is in-flight, otherwise sync to server state.
    if (draggingId) return;
    if (pendingOrderedIds) {
      const incomingIds = data.map((row: AiTriggerButtonRow) => row.id);
      const isPendingOrderPersisted =
        incomingIds.length === pendingOrderedIds.length &&
        incomingIds.every((id: string, index: number) => id === pendingOrderedIds[index]);
      if (isPendingOrderPersisted) {
        setPendingOrderedIds(null);
        setLocalRows(data);
        return;
      }
      if (isReordering) return;
      setPendingOrderedIds(null);
      setLocalRows(data);
      return;
    }
    setLocalRows(data);
  }, [data, draggingId, isReordering, pendingOrderedIds]);

  const applyOrder = useCallback(
    (
      rows: AiTriggerButtonRow[],
      sourceId: string,
      targetId: string
    ): AiTriggerButtonRow[] => {
      if (sourceId === targetId) return rows;
      const sourceIndex = rows.findIndex((row) => row.id === sourceId);
      const targetIndex = rows.findIndex((row) => row.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return rows;

      const nextRows = [...rows];
      const [dragged] = nextRows.splice(sourceIndex, 1);
      if (!dragged) return rows;
      nextRows.splice(targetIndex, 0, dragged);
      return nextRows;
    },
    []
  );

  const commitReorder = useCallback(
    (sourceId: string, targetId: string): void => {
      const nextRows = applyOrder(localRows, sourceId, targetId);
      if (nextRows === localRows) return;
      const orderedIds = nextRows.map((row: AiTriggerButtonRow) => row.id);
      setLocalRows(nextRows);
      setPendingOrderedIds(orderedIds);
      onOrderChange(orderedIds);
    },
    [applyOrder, localRows, onOrderChange]
  );

  const resolveDropTargetId = useCallback((eventTarget: EventTarget | null): string | null => {
    if (!(eventTarget instanceof Element)) return null;
    const row = eventTarget.closest('tr[data-row-id]');
    if (!row) return null;
    const rowId = row.getAttribute('data-row-id')?.trim() ?? '';
    return rowId.length > 0 ? rowId : null;
  }, []);

  const armDragHandle = useCallback((id: string): void => {
    dragHandleArmedIdRef.current = id;
  }, []);

  const handleDragStart = useCallback((event: React.DragEvent, id: string): void => {
    if (dragHandleArmedIdRef.current !== id) {
      event.preventDefault();
      return;
    }
    dragHandleArmedIdRef.current = null;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    dropHandledRef.current = false;
    draggingIdRef.current = id;
    overIdRef.current = id;
    setDraggingId(id);
    setOverId(id);
  }, []);

  const handleTableDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      if (!draggingIdRef.current) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const targetId = resolveDropTargetId(event.target);
      if (targetId) overIdRef.current = targetId;
      setOverId((prev: string | null) => (prev === targetId ? prev : targetId));
    },
    [resolveDropTargetId]
  );

  const handleTableDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      if (!draggingIdRef.current) return;
      event.preventDefault();
      dropHandledRef.current = true;
      const sourceId = draggingIdRef.current;
      const targetId = resolveDropTargetId(event.target) ?? overIdRef.current;
      if (sourceId && targetId && sourceId !== targetId) {
        commitReorder(sourceId, targetId);
      }
      draggingIdRef.current = null;
      overIdRef.current = null;
      setDraggingId(null);
      setOverId(null);
    },
    [commitReorder, resolveDropTargetId]
  );

  const handleDragEnd = useCallback((): void => {
    const did = draggingIdRef.current;
    const oid = overIdRef.current;
    if (!dropHandledRef.current && did && oid && did !== oid) {
      commitReorder(did, oid);
    }
    dragHandleArmedIdRef.current = null;
    dropHandledRef.current = false;
    draggingIdRef.current = null;
    overIdRef.current = null;
    setDraggingId(null);
    setOverId(null);
  }, [commitReorder]);

  const handleVisibilityToggle = useCallback(
    (record: AiTriggerButtonRow, enabled: boolean): void => {
      setLocalRows((prev) => prev.map((row) => (row.id === record.id ? { ...row, enabled } : row)));
      onToggleVisibility(record, enabled);
    },
    [onToggleVisibility]
  );

  const isVisible = useCallback((record: AiTriggerButtonRow): boolean => {
    return record.enabled !== false;
  }, []);

  const getRowClassName = useCallback(
    (row: Row<AiTriggerButtonRow>): string | undefined =>
      overId === row.original.id && draggingId !== row.original.id ? 'bg-cyan-500/10' : undefined,
    [overId, draggingId]
  );

  const columns = useMemo<ColumnDef<AiTriggerButtonRow>[]>(
    () => [
      {
        id: 'drag',
        header: () => null,
        cell: ({ row }) => (
          <div
            draggable
            onPointerDown={() => {
              armDragHandle(row.original.id);
            }}
            onDragStart={(e) => handleDragStart(e, row.original.id)}
            onDragEnd={handleDragEnd}
            data-testid={`trigger-reorder-handle-${row.original.id}`}
            className='cursor-grab active:cursor-grabbing p-2'
            title='Drag to reorder'
          >
            <GripVertical className='size-4 text-muted-foreground' />
          </div>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className='font-medium text-gray-200'>{row.original.name}</span>,
      },
      {
        accessorKey: 'locations',
        header: 'Location',
        cell: ({ row }) => (
          <div className='flex flex-wrap gap-1'>
            {(row.original.locations ?? []).map((loc: string, idx: number) => (
              <StatusBadge key={idx} status={loc} variant='info' size='sm' className='font-bold' />
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'mode',
        header: 'Mode',
        cell: ({ row }) => (
          <StatusBadge status={row.original.mode ?? ''} variant='neutral' size='sm' />
        ),
      },
      {
        id: 'visibility',
        header: 'Visibility',
        cell: ({ row }) => (
          <div
            className='flex items-center gap-2'
            onPointerDownCapture={(event: React.PointerEvent<HTMLDivElement>): void => {
              event.stopPropagation();
            }}
            onClickCapture={(event: React.MouseEvent<HTMLDivElement>): void => {
              event.stopPropagation();
            }}
          >
            <Switch
              checked={isVisible(row.original)}
              onCheckedChange={(checked: boolean) => handleVisibilityToggle(row.original, checked)}
            />
            <span className='text-xs text-gray-400'>
              {isVisible(row.original) ? 'Visible' : 'Hidden'}
            </span>
          </div>
        ),
      },
      {
        id: 'display',
        header: 'Display',
        cell: ({ row }) => {
          const Icon = row.original.iconId ? ICON_LIBRARY_MAP[row.original.iconId] : undefined;
          const { label, showLabel } = row.original.display;
          const isIconOnly = showLabel === false;

          if (!Icon) {
            return (
              <span className='text-xs text-gray-400'>{isIconOnly ? 'Icon only' : label}</span>
            );
          }
          return (
            <div className='flex items-center gap-2 text-gray-300'>
              <Icon className='size-4' />
              {!isIconOnly && <span className='text-xs'>{label}</span>}
            </div>
          );
        },
      },
      {
        id: 'aiPaths',
        header: 'AI Paths',
        cell: ({ row }) => {
          const linkedPaths = Array.isArray(row.original.usedPaths)
            ? row.original.usedPaths
              .map((entry: { id: string; name: string }) => ({
                id: typeof entry.id === 'string' ? entry.id.trim() : '',
                name: typeof entry.name === 'string' ? entry.name.trim() : '',
              }))
              .filter((entry: { id: string; name: string }): boolean => entry.name.length > 0)
            : [];
          if (linkedPaths.length === 0) {
            return <span className='text-xs text-gray-500'>Not linked</span>;
          }
          return (
            <div className='flex max-w-[360px] flex-wrap gap-1'>
              {linkedPaths.map(
                (entry: { id: string; name: string }, idx: number): React.JSX.Element =>
                  (() => {
                    if (entry.id && onOpenPath) {
                      return (
                        <button
                          key={`${entry.name}-${entry.id}-${idx}`}
                          type='button'
                          className='cursor-pointer'
                          title={`Open AI Path: ${entry.name}`}
                          onClick={() => {
                            onOpenPath(entry.id);
                          }}
                          aria-label={`Open AI Path: ${entry.name}`}>
                          <StatusBadge
                            status={entry.name}
                            variant='neutral'
                            size='sm'
                            className='font-medium hover:border-primary/50 hover:text-white transition-colors'
                          />
                        </button>
                      );
                    }
                    return (
                      <StatusBadge
                        key={`${entry.name}-${idx}`}
                        status={entry.name}
                        variant='neutral'
                        size='sm'
                        className='font-medium'
                      />
                    );
                  })()
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex justify-end gap-2'>
            <Button
              variant='ghost'
              size='xs'
              onClick={() => onEdit(row.original)}
              className='h-7 w-7 p-0'
              aria-label={`Edit ${row.original.name}`}
              title='Edit trigger button'
            >
              <Edit className='size-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='xs'
              onClick={() => onDelete(row.original.id)}
              className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300'
              aria-label={`Delete ${row.original.name}`}
              title='Delete trigger button'
            >
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        ),
      },
    ],
    [
      armDragHandle,
      handleDragStart,
      handleDragEnd,
      onEdit,
      onDelete,
      handleVisibilityToggle,
      onOpenPath,
    ]
  );

  if (isLoading && localRows.length === 0) {
    return <p className='text-sm text-gray-500'>Loading trigger buttons...</p>;
  }

  if (localRows.length === 0) {
    return <p className='text-sm text-gray-500'>No trigger buttons defined yet.</p>;
  }

  return (
    <div onDragOver={handleTableDragOver} onDrop={handleTableDrop}>
      <StandardDataTablePanel
        columns={columns}
        data={localRows}
        getRowId={(row) => row.id}
        getRowClassName={getRowClassName}
        variant='flat'
        footer={
          <div className='flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2 rounded'>
            <RefreshCw className='size-3' />
            Reorder using the drag handle only. The same order is used in modals and lists.
          </div>
        }
      />
    </div>
  );
};
