'use client';

import { Lock, Edit, Copy, Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';

import type { PathMeta } from '@/shared/lib/ai-paths';
import { PATH_TEMPLATES } from '@/shared/lib/ai-paths';
import {
  ActionMenu,
  Button,
  StandardDataTablePanel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useGraphState } from '../../context';
import { useAiPathsSettingsOrchestrator } from '../ai-paths-settings/AiPathsSettingsOrchestratorContext';

import type { ColumnDef } from '@tanstack/react-table';

export type PathsTabPanelProps = {
  onPathOpen?: ((id: string) => void) | undefined;
};

export function PathsTabPanel({
  onPathOpen,
}: PathsTabPanelProps): React.JSX.Element {
  const orchestrator = useAiPathsSettingsOrchestrator();
  const { paths: graphPaths, pathConfigs } = useGraphState();
  
  const resolvedPathFlagsById = useMemo(() => {
    const next: Record<
      string,
      {
        isLocked?: boolean;
        isActive?: boolean;
        lastRunAt?: string | null;
        runCount?: number;
      }
    > = {};
    graphPaths.forEach((meta) => {
      const config = pathConfigs[meta.id];
      next[meta.id] = {
        isLocked: config?.isLocked ?? false,
        isActive: config?.isActive ?? true,
        lastRunAt: config?.lastRunAt ?? null,
        runCount:
          typeof config?.runCount === 'number' && Number.isFinite(config.runCount)
            ? Math.max(0, Math.trunc(config.runCount))
            : 0,
      };
    });
    return next;
  }, [graphPaths, pathConfigs]);

  const handleCreatePath = orchestrator.handleCreatePath;
  const handleSaveList = () => {
    void orchestrator.savePathIndex(graphPaths).catch(() => {});
  };
  const handleOpenPath = (pathId: string) => {
    orchestrator.handleSwitchPath(pathId);
    onPathOpen?.(pathId);
  };
  const handleDeletePath = (pathId: string) => {
    void orchestrator.handleDeletePath(pathId).catch(() => {});
  };
  const handleDuplicatePath = (pathId: string) => {
    orchestrator.handleDuplicatePath(pathId);
  };

  const columns = useMemo<ColumnDef<PathMeta>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Path Name',
      cell: ({ row }) => {
        const path = row.original;
        const flags = resolvedPathFlagsById[path.id] ?? {};
        const isLocked = Boolean(flags.isLocked);
        const isActive = flags.isActive !== false;
        
        return (
          <button
            type='button'
            className={cn(
              'inline-flex items-center gap-2 cursor-pointer text-left text-sm transition',
              isActive ? 'text-white hover:text-gray-200' : 'text-gray-400 hover:text-gray-300'
            )}
            onClick={() => handleOpenPath(path.id)}
          >
            {isLocked ? <Lock className='size-3 text-amber-300/90' /> : null}
            {path.name?.trim() || `Path ${path.id.slice(0, 6)}`}
          </button>
        );
      },
    },
    {
      id: 'lastRunAt',
      header: 'Last Run',
      cell: ({ row }) => {
        const path = row.original;
        const value = resolvedPathFlagsById[path.id]?.lastRunAt;
        return (
          <span className='text-xs text-gray-400'>
            {value ? new Date(value).toLocaleString() : '—'}
          </span>
        );
      },
    },
    {
      id: 'runCount',
      header: 'Runs',
      cell: ({ row }) => {
        const path = row.original;
        const value = resolvedPathFlagsById[path.id]?.runCount ?? 0;
        return <span className='text-xs text-gray-300'>{value}</span>;
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => <span className='text-xs text-gray-400'>{row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString() : '—'}</span>,
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex justify-end'>
          <ActionMenu>
            <DropdownMenuItem onClick={() => handleOpenPath(row.original.id)}>
              <Edit className='mr-2 size-3.5' />
              Edit Path
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-sky-300 focus:text-sky-200'
              onClick={() => handleDuplicatePath(row.original.id)}
            >
              <Copy className='mr-2 size-3.5' />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-rose-400 focus:text-rose-300'
              onClick={() => handleDeletePath(row.original.id)}
            >
              <Trash2 className='mr-2 size-3.5' />
              Delete
            </DropdownMenuItem>
          </ActionMenu>
        </div>
      ),
    },
  ], [resolvedPathFlagsById, handleOpenPath, handleDuplicatePath, handleDeletePath]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='text-sm text-gray-300'>
          Manage and rename your AI paths, then open them for editing.
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleCreatePath}
          >
            New Path
          </Button>
          <ActionMenu
            trigger='From Template ▾'
            variant='outline'
            size='sm'
            ariaLabel='Create path from template'
            align='end'
          >
            {PATH_TEMPLATES.map((t) => (
              <DropdownMenuItem
                key={t.templateId}
                onClick={() => orchestrator.handleCreateFromTemplate(t.templateId)}
              >
                {t.name}
              </DropdownMenuItem>
            ))}
          </ActionMenu>
          <Button
            variant='outline'
            size='sm'
            onClick={handleSaveList}
          >
            Save List
          </Button>
        </div>
      </div>

      <StandardDataTablePanel
        columns={columns}
        data={graphPaths}
        variant='flat'
      />
    </div>
  );
}
