'use client';

import { GripVertical, Trash2, Edit } from 'lucide-react';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { ICON_LIBRARY_MAP } from '@/features/icons';
import {
  AiTriggerButtonDto,
} from '@/shared/contracts/ai-trigger-buttons';
import {
  Button,
  DataTable,
  StatusBadge,
  Switch,
} from '@/shared/ui';

import type { ColumnDef } from '@tanstack/react-table';

// Define the record type for clarity as it's used extensively
export type AiTriggerButtonRecord = AiTriggerButtonDto & {
  pathName?: string;
  pathId?: string;
  pathNames?: string[];
  pathIds?: string[];
};

type TriggerButtonListManagerProps = {
  data: AiTriggerButtonRecord[];
  onEdit: (item: AiTriggerButtonRecord) => void;
  onDelete: (id: string) => void;
  onOrderChange: (orderedIds: string[]) => void;
  onToggleVisibility: (item: AiTriggerButtonRecord, enabled: boolean) => void;
  isLoading: boolean;
};

export const TriggerButtonListManager: React.FC<TriggerButtonListManagerProps> = ({
  data,
  onEdit,
  onDelete,
  onOrderChange,
  onToggleVisibility,
  isLoading,
}: TriggerButtonListManagerProps) => {
  const [localRows, setLocalRows] = useState<AiTriggerButtonRecord[]>(data);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    // Keep in sync with server data, but do not reset local drag state mid-drag.
    if (draggingId) return;
    setLocalRows(data);
  }, [data, draggingId]);

  const applyOrder = useCallback(
    (rows: AiTriggerButtonRecord[], sourceId: string, targetId: string): AiTriggerButtonRecord[] => {
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

  const handleDragStart = useCallback((event: React.DragEvent, id: string): void => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
    setOverId(id);
  }, []);

  const handleDragEnter = useCallback((id: string): void => {
    if (!draggingId) return;
    if (id === overId) return;
    setOverId(id);
  }, [draggingId, overId]);

  const handleDrop = useCallback((targetId: string): void => {
    if (!draggingId) return;
    const nextRows = applyOrder(localRows, draggingId, targetId);
    if (nextRows !== localRows) {
      setLocalRows(nextRows);
      onOrderChange(nextRows.map((row) => row.id));
    }
    setDraggingId(null);
    setOverId(null);
  }, [applyOrder, draggingId, localRows, onOrderChange]);

  const handleDragEnd = useCallback((): void => {
    setDraggingId(null);
    setOverId(null);
  }, []);

  const columns = useMemo<ColumnDef<AiTriggerButtonRecord>[]>(() => [
    {
      id: 'drag',
      header: () => null,
      cell: ({ row }) => (
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, row.original.id)}
          onDragEnter={() => handleDragEnter(row.original.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(row.original.id);
          }}
          className='cursor-grab active:cursor-grabbing p-2'
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
      cell: ({ row }) => <StatusBadge status={row.original.mode ?? ''} variant='neutral' size='sm' />,
    },
    {
      id: 'visibility',
      header: 'Visibility',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Switch
            checked={row.original.enabled !== false}
            onCheckedChange={(checked: boolean) => onToggleVisibility(row.original, checked)}
          />
          <span className='text-xs text-gray-400'>
            {row.original.enabled === false ? 'Hidden' : 'Visible'}
          </span>
        </div>
      ),
    },
    {
      id: 'display',
      header: 'Display',
      cell: ({ row }) => {
        const Icon = row.original.iconId ? ICON_LIBRARY_MAP[row.original.iconId] : undefined;
        if (!Icon) return <span className='text-xs text-gray-400'>{row.original.display}</span>;
        return (
          <div className='flex items-center gap-2 text-gray-300'>
            <Icon className='size-4' />
            {row.original.display === 'icon_label' && <span className='text-xs'>{row.original.display}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'pathName',
      header: 'AI Paths',
      cell: ({ row }) => {
        const names = Array.isArray(row.original.pathNames)
          ? row.original.pathNames.filter((name): name is string => Boolean(name?.trim()))
          : [];
        if (names.length === 0) {
          return <span className='text-xs text-gray-500'>Not linked</span>;
        }
        return (
          <div className='flex max-w-[360px] flex-wrap gap-1'>
            {names.map((name: string, idx: number): React.JSX.Element => (
              <StatusBadge
                key={`${name}-${idx}`}
                status={name}
                variant='neutral'
                size='sm'
                className='font-medium'
              />
            ))}
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
          >
            <Edit className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='xs'
            onClick={() => onDelete(row.original.id)}
            className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300'
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ),
    },
  ], [handleDragStart, handleDragEnter, handleDragEnd, handleDrop, onEdit, onDelete, onToggleVisibility]);

  if (isLoading && localRows.length === 0) {
    return <p className='text-sm text-gray-500'>Loading trigger buttons...</p>;
  }

  if (localRows.length === 0) {
    return <p className='text-sm text-gray-500'>No trigger buttons defined yet.</p>;
  }

  return (
    <div className='w-full rounded-md border border-border bg-gray-950/20'>
      <DataTable
        columns={columns}
        data={localRows}
        getRowId={(row) => row.id}
      />
    </div>
  );
};
