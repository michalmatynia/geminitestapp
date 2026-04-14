'use client';

import React, { useState } from 'react';

import type { PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import { sanitizePathConfig } from '@/shared/lib/ai-paths/core/utils/path-config-sanitization';
import { PATH_TEMPLATES } from '@/shared/lib/ai-paths/core/utils/path-templates';
import { buildPortablePathPackage, resolvePortablePathInput } from '@/shared/lib/ai-paths/portable-engine';
import { createDefaultPathConfig, createPathId } from '@/shared/lib/ai-paths/core/utils';
import { normalizeAiPathFolderPath } from '@/shared/lib/ai-paths/core/utils/path-folders';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { AppModal } from '@/shared/ui/feedback.public';
import { Button, DropdownMenuItem, Textarea } from '@/shared/ui/primitives.public';

import { useGraphActions, usePathMetadataState } from '../../context';
import { AiPathsMasterTreePanel } from '../ai-paths-settings/AiPathsMasterTreePanel';
import { usePathsTabPanelActions } from '../hooks/usePathsTabPanelActions';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type PathsTabPanelProps = {
  onPathOpen?: ((id: string) => void) | undefined;
};

export function PathsTabPanel({ onPathOpen }: PathsTabPanelProps): React.JSX.Element {
  const {
    handleCreatePath,
    handleCreateFromTemplate,
    handleSwitchPath,
    handleDeletePath,
    handleDuplicatePath,
    handleMoveFolder,
    handleMovePathToFolder,
    handleRenameFolder,
    savePathIndex,
    persistPathSettings,
    toast,
    reportAiPathsError,
    ConfirmationModal,
  } = usePathsTabPanelActions();
  const { paths: graphPaths, pathConfigs, activePathId } = usePathMetadataState();
  const { setPaths, setPathConfigs } = useGraphActions();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPayload, setImportPayload] = useState('');
  const [importing, setImporting] = useState(false);

  const handleSaveList = () => {
    void savePathIndex(graphPaths).catch(() => {});
  };

  const handleOpenPath = (pathId: string) => {
    handleSwitchPath(pathId);
    onPathOpen?.(pathId);
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
      logClientError(error);
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
      const importedFolderPath = (importedPathConfig as { folderPath?: unknown }).folderPath;
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
        folderPath: normalizeAiPathFolderPath(importedFolderPath),
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
      logClientError(error);
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

  return (
    <>
      <div className='space-y-4'>
        <AiPathsMasterTreePanel
          activePathId={activePathId}
          adapter={{
            handleCreatePath,
            handleDeletePath,
            handleDuplicatePath,
            handleMoveFolder,
            handleMovePathToFolder,
            handleRenameFolder,
            handleSwitchPath,
          }}
          headerDescription='Browse, group, and reorganize AI paths with nested folders.'
          headerTitle='Paths'
          emptyLabel='No AI paths yet. Create a path, folder, or template here.'
          onCopyPathJson={(pathId: string): void => {
            void handleCopyPathJson(pathId);
          }}
          onPathOpen={onPathOpen}
          panelClassName='min-h-[680px] overflow-hidden rounded-2xl border border-border/60 bg-card/20 shadow-xl'
          pathClickBehavior='select'
          paths={graphPaths}
          renderHeaderActions={({ selectedFolderPath }) => (
            <>
              <ActionMenu
                trigger='From Template ▾'
                variant='outline'
                size='sm'
                ariaLabel='Create path from template'
                align='end'
              >
                {PATH_TEMPLATES.map((template) => (
                  <DropdownMenuItem
                    key={template.templateId}
                    onClick={() =>
                      handleCreateFromTemplate(template.templateId, {
                        folderPath: selectedFolderPath,
                      })
                    }
                  >
                    {template.name}
                  </DropdownMenuItem>
                ))}
              </ActionMenu>
              <Button variant='outline' size='sm' onClick={handleSaveList}>
                Save List
              </Button>
              <Button variant='outline' size='sm' onClick={handleOpenImportModal}>
                Import JSON
              </Button>
            </>
          )}
          searchAriaLabel='Search paths'
          searchPlaceholder='Search folders or paths'
          showPathHoverActions
          toast={toast}
        />
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
              title='Paste AI Path JSON payload here...'
            />
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
