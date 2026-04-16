'use client';

import React, { startTransition } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { Drawer } from '@/shared/ui/navigation-and-layout.public';
import { Button, DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives.public';
import {
  usePersistenceState,
  useSelectionState,
  useSelectionActions,
} from '@/features/ai/ai-paths/context';
import {
  useAiPathsSettingsPageCanvasInteractionsContext,
  useAiPathsSettingsPageDiagnosticsContext,
  useAiPathsSettingsPagePathActionsContext,
  useAiPathsSettingsPagePersistenceContext,
  useAiPathsSettingsPageRuntimeContext,
  useAiPathsSettingsPageWorkspaceContext,
} from '../AiPathsSettingsPageContext';

import { AiPathsRuntimeKernelSettings } from './AiPathsRuntimeKernelSettings';

export function AiPathsCanvasToolbar(): React.JSX.Element | null {
  const router = useRouter();
  const [runtimeKernelDrawerOpen, setRuntimeKernelDrawerOpen] = React.useState(false);
  const {
    setPathSettingsModalOpen,
    toast,
  } = useAiPathsSettingsPageWorkspaceContext();
  const {
    activePathId,
    handleTogglePathLock,
    isPathLocked,
    isPathActive,
    handleTogglePathActive,
  } = useAiPathsSettingsPagePathActionsContext();
  const {
    handleDeleteSelectedNode,
    isInspectorVisible,
    setIsInspectorVisible,
    isPathTreeVisible,
    setIsPathTreeVisible,
  } = useAiPathsSettingsPageCanvasInteractionsContext();

  const onToggleInspector = () => setIsInspectorVisible((current) => !current);
  const onTogglePathTree = () => setIsPathTreeVisible((current) => !current);
  const {
    savePathConfig,
    saving,
    persistLastError,
    incrementLoadNonce,
    handleClearConnectorData,
    handleClearHistory,
  } = useAiPathsSettingsPagePersistenceContext();
  const {
    diagnosticsReady,
    nodeValidationEnabled: nodeValidationEnabledFromContext,
    updateAiPathsValidation,
    validationPreflightReport,
    handleOpenNodeValidator,
    docsTooltipsEnabled,
    setDocsTooltipsEnabled,
    handleRunNodeValidationCheck,
    selectionScopeMode,
    setSelectionScopeMode,
  } = useAiPathsSettingsPageDiagnosticsContext();
  const { lastError } = useAiPathsSettingsPageRuntimeContext();

  const {
    selectionToolMode,
    nodeConfigDirty: nodeConfigDirtySelection,
    selectedNodeIds: selectedNodeIdsCtx,
    selectedEdgeId: selectedEdgeIdCtx,
  } = useSelectionState();
  const { setSelectionToolMode } = useSelectionActions();
  const { isPathSwitching } = usePersistenceState();

  const notify = toast ?? (() => undefined);
  const savePath = savePathConfig ?? (async (): Promise<boolean> => false);
  const openPathSettings = setPathSettingsModalOpen ?? (() => undefined);
  const toggleDocsTooltips = setDocsTooltipsEnabled ?? (() => undefined);
  const togglePathLock = handleTogglePathLock ?? (() => undefined);
  const runNodeValidationCheck = handleRunNodeValidationCheck ?? (() => undefined);
  const openNodeValidator = handleOpenNodeValidator ?? (() => undefined);
  const patchAiPathsValidation = updateAiPathsValidation ?? (() => undefined);
  const clearConnectorData = handleClearConnectorData ?? (async (): Promise<void> => undefined);
  const clearHistory = handleClearHistory ?? (async (): Promise<void> => undefined);
  const togglePathActive = handleTogglePathActive ?? (() => undefined);
  const persistLastErrorSafe = persistLastError ?? (async (): Promise<void> => undefined);
  const bumpLoadNonce = incrementLoadNonce ?? (() => undefined);
  const validationDiagnosticsReady = diagnosticsReady !== false;
  const nodeValidationEnabled = nodeValidationEnabledFromContext !== false;
  const validationBlocked =
    validationDiagnosticsReady && Boolean(validationPreflightReport?.blocked);
  const validationWarn =
    validationDiagnosticsReady && Boolean(validationPreflightReport?.shouldWarn);
  const validationScore = validationDiagnosticsReady
    ? (validationPreflightReport?.score ?? 0)
    : null;
  const validationFailedRules = validationDiagnosticsReady
    ? (validationPreflightReport?.failedRules ?? 0)
    : null;
  const selectedCount = selectedNodeIdsCtx.length;
  const removeSelection = handleDeleteSelectedNode ?? (() => undefined);
  const canDeleteSelection = !isPathSwitching && (selectedCount > 0 || Boolean(selectedEdgeIdCtx));
  const scopeMode = selectionScopeMode === 'wiring' ? 'wiring' : 'portion';
  const setScopeMode = setSelectionScopeMode ?? (() => undefined);
  const docsTooltipsOn = Boolean(docsTooltipsEnabled);
  const activePath = activePathId ?? null;
  const menuTriggerClassName =
    'h-8 rounded-md border border-border/60 bg-card/45 px-3 text-xs text-gray-200 hover:bg-card/70';
  const toolbarGroupClassName =
    'flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/20 p-2';
  const validationStatus = !nodeValidationEnabled
    ? 'Validation: off'
    : !validationDiagnosticsReady
      ? 'Validation: loading'
      : validationBlocked
        ? 'Validation: blocked'
        : validationWarn
          ? 'Validation: warning'
          : 'Validation: ready';
  const validationVariant = !nodeValidationEnabled
    ? 'neutral'
    : !validationDiagnosticsReady
      ? 'neutral'
      : validationBlocked
        ? 'error'
        : validationWarn
          ? 'warning'
          : 'success';

  return (
    <>
      <div className='flex flex-col items-start gap-3'>
        <div className='flex w-full flex-wrap items-start gap-2'>
          <div className={toolbarGroupClassName}>
            <Button
              data-doc-id='canvas_save_path'
              className='rounded-md border text-sm text-white hover:bg-muted/60'
              onClick={() => {
                if (nodeConfigDirtySelection) {
                  notify(
                    'Unsaved node-config dialog changes are not included. Click "Update Node" first, then "Save Path".',
                    { variant: 'info' }
                  );
                }
                void savePath();
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Path'}
            </Button>
            <Button
              data-doc-id='canvas_paths_settings'
              type='button'
              className='rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
              onClick={() => {
                openPathSettings(true);
              }}
              disabled={!activePath}
            >
              Path Settings
            </Button>
            <Button
              type='button'
              className='rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
              onClick={() => {
                setRuntimeKernelDrawerOpen(true);
              }}
            >
              Runtime Kernel
            </Button>
            <Button
              data-doc-id='canvas_remove_selected'
              type='button'
              variant='destructive'
              className='rounded-md text-sm'
              onClick={removeSelection}
              disabled={!canDeleteSelection}
              title={
                isPathSwitching
                  ? 'Delete is temporarily disabled while switching paths'
                  : canDeleteSelection
                    ? 'Delete selected nodes or selected edge'
                    : 'Select at least one node or edge to delete'
              }
            >
              Remove Selected
            </Button>
          </div>

          <div className={toolbarGroupClassName}>
            <Button
              data-doc-id='canvas_toggle_path_tree'
              type='button'
              className='rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
              onClick={onTogglePathTree}
              aria-pressed={isPathTreeVisible}
              title={isPathTreeVisible ? 'Hide path groups' : 'Show path groups'}
            >
              {isPathTreeVisible ? 'Hide Path Groups' : 'Show Path Groups'}
            </Button>

            <div className='flex items-center rounded-md border border-border/60 bg-card/40 p-0.5'>
              <Button
                type='button'
                className={`h-8 rounded-md px-2 text-xs ${
                  selectionToolMode === 'pan'
                    ? 'bg-sky-500/20 text-sky-200'
                    : 'text-gray-300 hover:bg-card/60'
                }`}
                onClick={() => setSelectionToolMode('pan')}
                title='Pan canvas'
              >
                Pan
              </Button>
              <Button
                type='button'
                className={`h-8 rounded-md px-2 text-xs ${
                  selectionToolMode === 'select'
                    ? 'bg-sky-500/20 text-sky-200'
                    : 'text-gray-300 hover:bg-card/60'
                }`}
                onClick={() => setSelectionToolMode('select')}
                title='Rectangle selection tool'
              >
                Select
              </Button>
            </div>

            <ActionMenu
              trigger={<span>Path</span>}
              variant='outline'
              size='sm'
              ariaLabel='Open path actions'
              align='end'
              triggerClassName={menuTriggerClassName}
            >
              <DropdownMenuItem onClick={togglePathLock} disabled={!activePath}>
                {isPathLocked ? 'Unlock Path' : 'Lock Path'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={togglePathActive} disabled={!activePath}>
                {isPathActive ? 'Deactivate Path' : 'Activate Path'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void clearHistory();
                }}
                disabled={!activePath}
              >
                Clear History
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void clearConnectorData();
                }}
                disabled={!activePath}
              >
                Clear Connector Data
              </DropdownMenuItem>
            </ActionMenu>

            <ActionMenu
              trigger={<span>Validation</span>}
              variant='outline'
              size='sm'
              ariaLabel='Open validation actions'
              align='end'
              triggerClassName={menuTriggerClassName}
            >
              <DropdownMenuItem
                data-doc-id='canvas_enable_node_validation'
                onClick={() => {
                  const nextEnabled = !nodeValidationEnabled;
                  patchAiPathsValidation({ enabled: nextEnabled });
                  notify(
                    nextEnabled
                      ? 'AI Paths node validation enabled.'
                      : 'AI Paths node validation disabled.',
                    {
                      variant: nextEnabled ? 'success' : 'info',
                    }
                  );
                }}
                disabled={!activePath || isPathLocked}
              >
                {!nodeValidationEnabled ? 'Enable Node Validation' : 'Disable Node Validation'}
              </DropdownMenuItem>
              <DropdownMenuItem
                data-doc-id='canvas_validate_nodes'
                onClick={runNodeValidationCheck}
                disabled={!activePath || !nodeValidationEnabled}
              >
                Validate Nodes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-doc-id='canvas_open_node_validator'
                onClick={openNodeValidator}
                disabled={!activePath}
              >
                Open Node Validator
              </DropdownMenuItem>
            </ActionMenu>

            <ActionMenu
              trigger={<span>View</span>}
              variant='outline'
              size='sm'
              ariaLabel='Open canvas view options'
              align='end'
              triggerClassName={menuTriggerClassName}
            >
              <DropdownMenuItem
                data-doc-id='docs_tooltips_toggle'
                onClick={() => toggleDocsTooltips(!docsTooltipsOn)}
              >
                {docsTooltipsOn ? 'Turn Docs Tooltips Off' : 'Turn Docs Tooltips On'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleInspector}>
                {isInspectorVisible ? 'Hide Inspector' : 'Show Inspector'}
              </DropdownMenuItem>
              {selectionToolMode === 'select' ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setScopeMode('portion')}>
                    Selection Scope: Portion
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScopeMode('wiring')}>
                    Selection Scope: With Wiring
                  </DropdownMenuItem>
                </>
              ) : null}
            </ActionMenu>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <StatusBadge
            status={validationStatus}
            variant={validationVariant}
            size='sm'
            className='font-medium'
          />
          <StatusBadge
            status={
              validationDiagnosticsReady
                ? `Score ${validationScore} · ${validationFailedRules} failed`
                : 'Validation details loading'
            }
            variant={
              !validationDiagnosticsReady
                ? 'neutral'
                : (validationFailedRules ?? 0) > 0
                  ? 'warning'
                  : 'success'
            }
            size='sm'
            className='font-medium'
          />
          <StatusBadge
            status={isPathLocked ? 'Path locked' : 'Path editable'}
            variant={isPathLocked ? 'warning' : 'neutral'}
            size='sm'
            className='font-medium'
          />
          <StatusBadge
            status={isPathActive ? 'Runs active' : 'Runs paused'}
            variant={isPathActive ? 'success' : 'warning'}
            size='sm'
            className='font-medium'
          />
          <StatusBadge
            status={`Selected: ${selectedCount}`}
            variant='neutral'
            size='sm'
            className='font-medium'
            title='Selected nodes count'
          />
          <StatusBadge
            status={isInspectorVisible ? 'Inspector visible' : 'Inspector hidden'}
            variant='neutral'
            size='sm'
            className='font-medium'
          />
          {selectionToolMode === 'select' ? (
            <StatusBadge
              status={`Selection: ${scopeMode === 'wiring' ? 'With Wiring' : 'Portion'}`}
              variant='info'
              size='sm'
              className='font-medium'
            />
          ) : null}
          {isPathSwitching ? (
            <StatusBadge
              status='Switching path...'
              variant='processing'
              size='sm'
              className='font-medium'
            />
          ) : null}
          {selectionToolMode === 'select' ? (
            <div className='text-[11px] text-gray-400'>
              Adjust selection scope from the View menu. Shift adds to selection, Alt subtracts.
            </div>
          ) : null}
        </div>

        {lastError ? (
          <div className='flex flex-wrap items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200'>
            <span className='max-w-[320px] truncate'>
              Last error: {lastError.message}
            </span>
            <Button
              type='button'
              className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
              onClick={() => {
                void persistLastErrorSafe(null);
              }}
            >
              Clear
            </Button>
            {lastError.message.startsWith('Failed to load AI Paths settings') ? (
              <Button
                type='button'
                className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
                onClick={() => {
                  void persistLastErrorSafe(null);
                  bumpLoadNonce();
                }}
              >
                Retry
              </Button>
            ) : null}
            <Button
              type='button'
              className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
              onClick={(): void => {
                startTransition(() => {
                  router.push(
                    `/admin/system/logs?level=error&source=client&query=${encodeURIComponent(
                      'AI Paths'
                    )}`
                  );
                });
              }}
            >
              View logs
            </Button>
          </div>
        ) : null}
      </div>

      <Drawer
        open={runtimeKernelDrawerOpen}
        onClose={() => {
          setRuntimeKernelDrawerOpen(false);
        }}
        title='Runtime Kernel'
        description='Review global runtime-kernel defaults and override resolver settings for the active path.'
        width={720}
      >
        <div className='space-y-3'>
          <AiPathsRuntimeKernelSettings />
        </div>
      </Drawer>
    </>
  );
}
