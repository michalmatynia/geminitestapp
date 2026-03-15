'use client';

import { Lock, Edit, Copy, Trash2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import type { PathConfig, PathMeta } from '@/shared/lib/ai-paths';
import {
  PATH_TEMPLATES,
  buildPortablePathPackage,
  createDefaultPathConfig,
  createPathId,
  resolvePortablePathInput,
} from '@/shared/lib/ai-paths';
import {
  ActionMenu,
  AppModal,
  Button,
  DropdownMenuItem,
  DropdownMenuSeparator,
  StandardDataTablePanel,
  Textarea,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useGraphActions, useGraphState } from '../../context';
import { sanitizePathConfig } from '../AiPathsSettingsUtils';
import { usePathsTabPanelActions } from '../hooks/usePathsTabPanelActions';

import type { ColumnDef } from '@tanstack/react-table';

export type PathsTabPanelProps = {
  onPathOpen?: ((id: string) => void) | undefined;
};

export function PathsTabPanel({ onPathOpen }: PathsTabPanelProps): React.JSX.Element {
  const {
    handleCreatePath,
    handleSwitchPath,
    handleDeletePath,
    handleDuplicatePath,
    handleCreateFromTemplate,
    savePathIndex,
    persistPathSettings,
    toast,
    reportAiPathsError,
    ConfirmationModal,
  } = usePathsTabPanelActions();
  const { paths: graphPaths, pathConfigs } = useGraphState();
  const { setPaths, setPathConfigs } = useGraphActions();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPayload, setImportPayload] = useState('');
  const [importing, setImporting] = useState(false);

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

  const handleSaveList = () => {
    void savePathIndex(graphPaths).catch(() => {});
  };
  const handleOpenPath = (pathId: string) => {
    handleSwitchPath(pathId);
    onPathOpen?.(pathId);
  };
  const handleDeletePathById = (pathId: string) => {
    void handleDeletePath(pathId).catch(() => {});
  };
  const handleDuplicatePathById = (pathId: string) => {
    handleDuplicatePath(pathId);
  };
  const handleCopyPathJson = async (pathId: string): Promise<void> => {
    const pathConfig = pathConfigs[pathId];
    if (!pathConfig) {
      toast('Path config is not loaded. Open this path first, then retry.', {
        variant: 'info',
      });
      return;
    }

    const payload = JSON.stringify(
      buildPortablePathPackage(pathConfig, {
        exporterVersion: 'ai-paths.paths-tab.v1',
        workspace: 'admin-ai-paths',
      }),
      null,
      2
    );

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast('Clipboard API unavailable.', { variant: 'warning' });
      return;
    }

    try {
      await navigator.clipboard.writeText(payload);
      toast('Path JSON copied.', { variant: 'success' });
    } catch (error) {
      reportAiPathsError(
        error,
        { action: 'copyPathJson', pathId },
        'Failed to copy path JSON:'
      );
      toast('Failed to copy path JSON.', { variant: 'error' });
    }
  };

  const handleOpenImportModal = (): void => {
    setImportModalOpen(true);
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.readText().then(
      (text) => {
        if (typeof text === 'string' && text.trim().length > 0) {
          setImportPayload(text);
        }
      },
      () => {
        // Ignore clipboard read errors; manual paste remains available.
      }
    );
  };

  const handleImportPathJson = async (): Promise<void> => {
    const payload = importPayload.trim();
    if (!payload) {
      toast('Paste AI Path JSON first.', { variant: 'error' });
      return;
    }

    setImporting(true);
    try {
      const resolved = resolvePortablePathInput(payload, {
        repairIdentities: true,
        includeConnections: false,
        signingPolicyTelemetrySurface: 'canvas',
        nodeCodeObjectHashVerificationMode: 'strict',
      });
      if (!resolved.ok) {
        toast(`Invalid path JSON: ${resolved.error}`, { variant: 'error' });
        return;
      }

      const importedPathConfig = resolved.value.pathConfig;
      const requestedPathId =
        typeof importedPathConfig.id === 'string' && importedPathConfig.id.trim().length > 0
          ? importedPathConfig.id.trim()
          : createPathId();
      const pathIdExists = graphPaths.some(
        (path: PathMeta): boolean => path.id === requestedPathId
      );
      const nextPathId = pathIdExists ? createPathId() : requestedPathId;
      const baseConfig = createDefaultPathConfig(nextPathId);
      const importedName =
        typeof importedPathConfig.name === 'string' && importedPathConfig.name.trim().length > 0
          ? importedPathConfig.name.trim()
          : `Imported Path ${graphPaths.length + 1}`;
      const nextConfig = sanitizePathConfig({
        ...baseConfig,
        ...importedPathConfig,
        id: nextPathId,
        name: pathIdExists ? `${importedName} (Imported)` : importedName,
      } as PathConfig);
      const now = new Date().toISOString();
      const nextMeta: PathMeta = {
        id: nextPathId,
        name: nextConfig.name,
        createdAt: now,
        updatedAt:
          typeof nextConfig.updatedAt === 'string' && nextConfig.updatedAt.trim().length > 0
            ? nextConfig.updatedAt
            : now,
      };
      const nextPaths = [
        ...graphPaths.filter((path: PathMeta): boolean => path.id !== nextPathId),
        nextMeta,
      ];

      await persistPathSettings(nextPaths, nextPathId, nextConfig);
      setPaths(nextPaths);
      setPathConfigs(
        (prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
          ...prev,
          [nextPathId]: nextConfig,
        })
      );
      setImportModalOpen(false);
      setImportPayload('');
      toast('Path imported.', { variant: 'success' });
      handleOpenPath(nextPathId);
    } catch (error) {
      reportAiPathsError(
        error,
        { action: 'importPathJson' },
        'Failed to import path JSON:'
      );
      toast('Failed to import path JSON.', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const columns = useMemo<ColumnDef<PathMeta>[]>(
    () => [
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
        cell: ({ row }) => (
          <span className='text-xs text-gray-400'>
            {row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString() : '—'}
          </span>
        ),
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
                onClick={() => handleDuplicatePathById(row.original.id)}
              >
                <Copy className='mr-2 size-3.5' />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                className='text-indigo-300 focus:text-indigo-200'
                onClick={() => {
                  void handleCopyPathJson(row.original.id);
                }}
              >
                <Copy className='mr-2 size-3.5' />
                Copy JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-rose-400 focus:text-rose-300'
                onClick={() => handleDeletePathById(row.original.id)}
              >
                <Trash2 className='mr-2 size-3.5' />
                Delete
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    [resolvedPathFlagsById, handleOpenPath, handleDuplicatePathById, handleDeletePathById]
  );

  return (
    <>
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='text-sm text-gray-300'>
            Manage and rename your AI paths, then open them for editing.
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={handleCreatePath}>
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
                  onClick={() => handleCreateFromTemplate(t.templateId)}
                >
                  {t.name}
                </DropdownMenuItem>
              ))}
            </ActionMenu>
            <Button variant='outline' size='sm' onClick={handleSaveList}>
              Save List
            </Button>
            <Button variant='outline' size='sm' onClick={handleOpenImportModal}>
              Import JSON
            </Button>
          </div>
        </div>

        <StandardDataTablePanel columns={columns} data={graphPaths} variant='flat' />
        <AppModal
          open={importModalOpen}
          onClose={() => {
            if (!importing) {
              setImportModalOpen(false);
            }
          }}
          title='Import Path JSON'
          size='xl'
        >
          <div className='space-y-3'>
            <p className='text-xs text-gray-400'>
              Paste portable package JSON, semantic canvas JSON, or raw path config JSON.
            </p>
            <Textarea
              className='min-h-[260px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
              value={importPayload}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setImportPayload(event.target.value)
              }
              aria-label='Import path JSON'
              placeholder='Paste AI Path JSON payload here...'
             title='Paste AI Path JSON payload here...'/>
            <div className='flex items-center justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setImportModalOpen(false);
                }}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button
                type='button'
                variant='default'
                onClick={() => {
                  void handleImportPathJson();
                }}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import Path'}
              </Button>
            </div>
          </div>
        </AppModal>
      </div>
      <ConfirmationModal />
    </>
  );
}
