'use client';

import { GripVertical, Trash2 } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';

import { ICON_LIBRARY_MAP } from '@/features/icons';
import {
  AiTriggerButtonDto,
} from '@/shared/dtos/ai-trigger-buttons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

// Define the record type for clarity as it's used extensively
export type AiTriggerButtonRecord = AiTriggerButtonDto & {
  pathName?: string;
  pathId?: string;
};

type TriggerButtonListManagerProps = {
  data: AiTriggerButtonRecord[];
  onEdit: (item: AiTriggerButtonRecord) => void;
  onDelete: (id: string) => void;
  onOrderChange: (orderedIds: string[]) => void;
  isLoading: boolean;
};

export const TriggerButtonListManager: React.FC<TriggerButtonListManagerProps> = ({
  data,
  onEdit,
  onDelete,
  onOrderChange,
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
      const sourceIndex = rows.findIndex((row: AiTriggerButtonRecord): boolean => row.id === sourceId);
      const targetIndex = rows.findIndex((row: AiTriggerButtonRecord): boolean => row.id === targetId);
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
      onOrderChange(nextRows.map((row: AiTriggerButtonRecord): string => row.id));
    }
    setDraggingId(null);
    setOverId(null);
  }, [applyOrder, draggingId, localRows, onOrderChange]);

  const handleDragEnd = useCallback((): void => {
    setDraggingId(null);
    setOverId(null);
  }, []);

  if (isLoading && localRows.length === 0) {
    return <p>Loading trigger buttons...</p>;
  }

  if (localRows.length === 0) {
    return <p>No trigger buttons defined yet.</p>;
  }

  return (
    <Table className="max-w-4xl">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="w-[200px]">Location</TableHead>
          <TableHead className="w-[150px]">Mode</TableHead>
          <TableHead className="w-[150px]">Display</TableHead>
          <TableHead className="w-[100px]">Path</TableHead>
          <TableHead className="w-[100px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {localRows.map((row: AiTriggerButtonRecord) => (
          <TableRow
            key={row.id}
            draggable
            onDragStart={(event: React.DragEvent): void => handleDragStart(event, row.id)}
            onDragEnter={(): void => handleDragEnter(row.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(event: React.DragEvent): void => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event: React.DragEvent): void => {
              event.preventDefault();
              handleDrop(row.id);
            }}
            className={cn(
              'cursor-grab',
              draggingId === row.id && 'opacity-50',
              overId === row.id && 'bg-muted'
            )}
          >
            <TableCell>
              <GripVertical className="size-4 text-muted-foreground" />
            </TableCell>
            <TableCell>{row.name}</TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                {row.locations.map((loc: string, idx: number) => (
                  <span key={idx} className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
                    {loc}
                  </span>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20">
                {row.mode}
              </span>
            </TableCell>
            <TableCell>
              {(() : React.JSX.Element => {
                const Icon = row.iconId ? ICON_LIBRARY_MAP[row.iconId] : undefined;
                if (!Icon) return <span className="text-sm">{row.display}</span>;
                return (
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {row.display === 'icon_label' && <span className="text-sm">{row.display}</span>}
                  </span>
                );
              })()}
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {row.pathName || 'N/A'}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={(): void => onEdit(row)}
                className="text-muted-foreground hover:text-white"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(): void => onDelete(row.id)}
                className="text-destructive hover:text-red-500"
              >
                <Trash2 className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
