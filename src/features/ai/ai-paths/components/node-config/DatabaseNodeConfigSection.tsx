'use client';

import React from 'react';

import { resolveNodeLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import {
  getProviderActionCategoryOptions,
  getProviderActionOptions,
  isProviderActionCategorySupported,
  resolveProviderAction,
} from '@/shared/lib/ai-paths/core/utils/provider-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

import { DatabaseConstructorContextProvider } from './database/DatabaseConstructorContext';
import { DatabaseConstructorTab } from './database/DatabaseConstructorTab';
import { DatabasePresetsTab } from './database/DatabasePresetsTab';
import { DatabasePresetsTabContextProvider } from './database/DatabasePresetsTabContext';
import { DatabaseQueryInputControlsContextProvider } from './database/DatabaseQueryInputControlsContext';
import { DatabaseQueryValidatorPanel } from './database/DatabaseQueryValidatorPanel';
import { DatabaseQueryValidatorPanelContextProvider } from './database/DatabaseQueryValidatorPanelContext';
import { DatabaseSaveQueryPresetDialog } from './database/DatabaseSaveQueryPresetDialog';
import { DatabaseSaveQueryPresetDialogContextProvider } from './database/DatabaseSaveQueryPresetDialogContext';
import { DatabaseSettingsTab } from './database/DatabaseSettingsTab';
import {
  buildMongoQueryValidation,
  formatAndFixMongoQuery,
  getQueryPlaceholderByAction,
  getQueryPlaceholderByOperation,
  getUpdatePlaceholderByAction,
  type QueryValidationResult,
} from './database/query-utils';
import { useDatabaseNodeConfigState } from '../../hooks/useDatabaseNodeConfigState';

import type { DatabaseConstructorContextValue } from './database/DatabaseConstructorContext';
import type { DatabaseQueryInputControlsContextValue } from './database/DatabaseQueryInputControlsContext';

export function DatabaseNodeConfigSection(): React.JSX.Element | null {
  const state = useDatabaseNodeConfigState();
  const { selectedNode } = state;

  if (selectedNode?.type !== 'database') return null;

  const actionCategoryOptions = React.useMemo(
    () => getProviderActionCategoryOptions(state.resolvedProvider),
    [state.resolvedProvider]
  );
  const resolvedActionCategory = React.useMemo(
    () =>
      isProviderActionCategorySupported(state.resolvedProvider, state.actionCategory)
        ? state.actionCategory
        : (actionCategoryOptions[0]?.value ?? 'read'),
    [actionCategoryOptions, state.actionCategory, state.resolvedProvider]
  );
  const actionOptions = React.useMemo(
    () => getProviderActionOptions(state.resolvedProvider, resolvedActionCategory),
    [resolvedActionCategory, state.resolvedProvider]
  );
  const resolvedAction = React.useMemo(
    () =>
      resolveProviderAction(
        state.resolvedProvider,
        resolvedActionCategory,
        state.action,
        state.queryConfig.single ?? false
      ),
    [resolvedActionCategory, state.action, state.queryConfig.single, state.resolvedProvider]
  );
  const activeQueryTemplateValue = state.isUpdateAction
    ? (state.databaseConfig.updateTemplate ?? '')
    : state.queryTemplateValue;
  const queryPlaceholder = state.isUpdateAction
    ? getUpdatePlaceholderByAction(resolvedAction)
    : getQueryPlaceholderByAction(resolvedAction) ||
      getQueryPlaceholderByOperation(state.operation);
  const filterPlaceholder = getQueryPlaceholderByAction(resolvedAction);
  const validationTargetTemplate = activeQueryTemplateValue;
  const queryValidation: QueryValidationResult = React.useMemo(() => {
    return buildMongoQueryValidation(validationTargetTemplate);
  }, [validationTargetTemplate]);

  const constructorValue: DatabaseConstructorContextValue = {
    pendingAiQuery: state.pendingAiQuery,
    setPendingAiQuery: state.setPendingAiQuery,
    aiQueries: state.aiQueries,
    setAiQueries: state.setAiQueries,
    selectedAiQueryId: state.selectedAiQueryId,
    setSelectedAiQueryId: state.setSelectedAiQueryId,
    presetOptions: state.presetOptions,
    applyDatabasePreset: state.applyDatabasePreset,
    openSaveQueryPresetModal: state.openSaveQueryPresetModal,
    databaseConfig: state.databaseConfig,
    queryConfig: state.queryConfig,
    resolvedProvider: state.resolvedProvider,
    operation: state.operation,
    queryTemplateValue: state.queryTemplateValue,
    queryTemplateRef: state.queryTemplateRef,
    sampleState: state.sampleState ?? {
      entityType: 'product',
      entityId: '',
      json: '{}',
      mappingMode: 'top',
      depth: 1,
      keyStyle: 'leaf',
      includeContainers: false,
    },
    parsedSampleError: state.parsedSampleError ?? '',
    updateQueryConfig: (patch) => state.updateQueryConfig(patch),
    connectedPlaceholders: state.connectedPlaceholders,
    hasSchemaConnection: !!state.schemaConnection.snapshot,
    fetchedDbSchema: state.fetchedDbSchema ?? null,
    schemaMatrix: state.fetchedDbSchema ?? null,
    onSyncSchema: state.handleSyncSchema,
    schemaSyncing: state.schemaSyncMutation.isPending,
    schemaLoading: state.schemaQuery.isFetching,
    mapInputsToTargets: state.mapInputsToTargets,
    bundleKeys: new Set(state.bundleKeys),
    aiPromptRef: state.aiPromptRef,
    mappings: state.mappings,
    updateMapping: state.updateMapping,
    removeMapping: state.removeMapping,
    addMapping: state.addMapping,
    availablePorts: state.availablePorts,
    uniqueTargetPathOptions: state.uniqueTargetPathOptions.map((path) => ({
      label: path,
      value: path,
    })),
    codeSnippets: state.codeSnippets,
    selectedSnippetIndex: state.selectedSnippetIndex ?? 0,
    setSelectedSnippetIndex: state.setSelectedSnippetIndex as React.Dispatch<
      React.SetStateAction<number>
    >,
    insertTemplateSnippet: state.insertTemplateSnippet,
    applyQueryTemplateUpdate: state.applyQueryTemplateUpdate,
    insertQueryPlaceholder: state.insertQueryPlaceholder,
    insertAiPromptPlaceholder: state.insertAiPromptPlaceholder,
  };

  const queryInputControlsValue: DatabaseQueryInputControlsContextValue = {
    provider: state.resolvedProvider,
    requestedProvider: state.queryConfig.provider ?? 'auto',
    actionCategory: resolvedActionCategory,
    action: resolvedAction,
    actionCategoryOptions,
    actionOptions,
    queryTemplateValue: activeQueryTemplateValue,
    queryPlaceholder,
    showFilterInput: state.isUpdateAction,
    filterTemplateValue: state.queryConfig.queryTemplate || '',
    filterPlaceholder,
    onFilterChange: (val) => state.updateQueryConfig({ queryTemplate: val }),
    runDry: state.databaseConfig.dryRun || false,
    onToggleRunDry: () =>
      state.updateSelectedNodeConfig({
        database: { ...state.databaseConfig, dryRun: !state.databaseConfig.dryRun },
      }),
    queryValidation,
    queryFormatterEnabled: state.queryFormatterEnabled,
    queryValidatorEnabled: state.queryValidatorEnabled,
    testQueryLoading: state.testQueryLoading,
    queryTemplateRef: state.queryTemplateRef,
    onActionCategoryChange: state.handleActionCategoryChange,
    onActionChange: (val) => state.applyActionConfig(resolvedActionCategory, val),
    onProviderChange: state.handleProviderChange,
    onFormatClick: () => {
      const targetValue = activeQueryTemplateValue;
      if (!targetValue.trim()) return;
      const formatted = formatAndFixMongoQuery(targetValue);
      if (state.isUpdateAction) {
        state.updateSelectedNodeConfig({
          database: {
            ...state.databaseConfig,
            updateTemplate: formatted,
          },
        });
      } else {
        state.updateQueryConfig({ queryTemplate: formatted });
      }
    },
    onFormatContextMenu: (event) => {
      event.preventDefault();
      state.setQueryFormatterEnabled(!state.queryFormatterEnabled);
      state.toast(
        state.queryFormatterEnabled ? 'Smart formatter disabled.' : 'Smart formatter enabled.',
        { variant: 'info' }
      );
    },
    onToggleValidator: () => state.setQueryValidatorEnabled(!state.queryValidatorEnabled),
    onRunQuery: () => {
      void state.handleRunQuery();
    },
    onQueryChange: (val) => {
      if (state.isUpdateAction) {
        state.updateSelectedNodeConfig({
          database: {
            ...state.databaseConfig,
            updateTemplate: val,
          },
        });
        return;
      }
      state.updateQueryConfig({ queryTemplate: val });
    },
  };

  return (
    <DatabaseQueryValidatorPanelContextProvider
      value={{
        queryValidation,
        queryConfig: state.queryConfig,
        resolvedProvider: state.resolvedProvider,
        operation: state.operation,
        queryTemplateValue: validationTargetTemplate,
        databaseConfig: state.databaseConfig,
      }}
    >
      <DatabaseQueryInputControlsContextProvider value={queryInputControlsValue}>
        <DatabaseConstructorContextProvider value={constructorValue}>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <h3 className='text-sm font-medium text-white'>
                Database Node:{' '}
                {resolveNodeLabel(
                  selectedNode.type,
                  (selectedNode.config?.database as { label?: string } | undefined)?.label
                )}
              </h3>
            </div>

            <Tabs
              value={state.databaseTab}
              onValueChange={(value: string) =>
                state.setDatabaseTab(value as 'query' | 'advanced' | 'constructor')
              }
              className='space-y-4'
            >
              <TabsList
                className='justify-start border border-border bg-card/60'
                aria-label='Database node tabs'
              >
                <TabsTrigger value='settings'>Query</TabsTrigger>
                <TabsTrigger value='constructor'>Constructor</TabsTrigger>
                <TabsTrigger value='presets'>Presets</TabsTrigger>
              </TabsList>

              <TabsContent value='settings' className='space-y-4'>
                <DatabaseSettingsTab />
              </TabsContent>

              <TabsContent value='constructor' className='space-y-3'>
                <DatabaseConstructorTab />
                {state.queryValidatorEnabled ? <DatabaseQueryValidatorPanel /> : null}
              </TabsContent>

              <TabsContent value='presets'>
                <DatabasePresetsTabContextProvider
                  value={{
                    builtInPresets: state.presetOptions,
                    onApplyBuiltInPreset: state.applyDatabasePreset,
                    onRenameQueryPreset: state.handleRenameQueryPreset,
                    onDeleteQueryPreset: state.handleDeleteQueryPresetById,
                  }}
                >
                  <DatabasePresetsTab />
                </DatabasePresetsTabContextProvider>
              </TabsContent>
            </Tabs>

            <DatabaseSaveQueryPresetDialogContextProvider
              value={{
                open: state.saveQueryPresetModalOpen,
                onOpenChange: (open) => {
                  if (!open) state.closeSaveQueryPresetModal();
                },
                newQueryPresetName: state.newQueryPresetName,
                setNewQueryPresetName: state.setNewQueryPresetName,
                queryTemplateValue: state.queryTemplateValue,
                onCancel: state.closeSaveQueryPresetModal,
                onSave: () => {
                  void state.handleSaveQueryPreset();
                },
              }}
            >
              <DatabaseSaveQueryPresetDialog />
            </DatabaseSaveQueryPresetDialogContextProvider>

            <state.ConfirmationModal />
          </div>
        </DatabaseConstructorContextProvider>
      </DatabaseQueryInputControlsContextProvider>
    </DatabaseQueryValidatorPanelContextProvider>
  );
}
