'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AiQuery, DatabasePresetOption, SchemaData } from '@/shared/contracts/database';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type {
  DatabaseConfig,
  DatabaseOperation,
  DbQueryConfig,
  UpdaterMapping,
  UpdaterSampleState,
} from '@/shared/lib/ai-paths';

export type DatabaseConstructorContextValue = {
  pendingAiQuery: string;
  setPendingAiQuery: React.Dispatch<React.SetStateAction<string>>;
  aiQueries: AiQuery[];
  setAiQueries: React.Dispatch<React.SetStateAction<AiQuery[]>>;
  selectedAiQueryId: string;
  setSelectedAiQueryId: React.Dispatch<React.SetStateAction<string>>;
  presetOptions: DatabasePresetOption[];
  applyDatabasePreset: (presetId: string) => void;
  openSaveQueryPresetModal: () => void;
  databaseConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  resolvedProvider: 'mongodb';
  operation: DatabaseOperation;
  queryTemplateValue: string;
  queryTemplateRef?: React.RefObject<HTMLTextAreaElement | null>;
  sampleState: UpdaterSampleState;
  parsedSampleError?: string;
  updateQueryConfig: (patch: Partial<DbQueryConfig>) => void;
  connectedPlaceholders: string[];
  hasSchemaConnection: boolean;
  fetchedDbSchema: SchemaData | null;
  schemaMatrix: SchemaData | null;
  onSyncSchema?: () => void;
  schemaSyncing?: boolean;
  schemaLoading: boolean;
  mapInputsToTargets: () => void;
  bundleKeys: Set<string>;
  aiPromptRef?: React.RefObject<HTMLTextAreaElement | null>;
  mappings: UpdaterMapping[];
  updateMapping: (index: number, patch: Partial<UpdaterMapping>) => void;
  removeMapping: (index: number) => void;
  addMapping: () => void;
  availablePorts: string[];
  uniqueTargetPathOptions: Array<LabeledOptionDto<string>>;
  codeSnippets: string[];
  selectedSnippetIndex: number;
  setSelectedSnippetIndex: React.Dispatch<React.SetStateAction<number>>;
  insertTemplateSnippet: (snippet: string) => void;
  applyQueryTemplateUpdate: (nextQuery: string) => void;
  insertQueryPlaceholder: (placeholder: string) => void;
  insertAiPromptPlaceholder: (placeholder: string) => void;
};

type DatabaseConstructorActionKey =
  | 'setPendingAiQuery'
  | 'setAiQueries'
  | 'setSelectedAiQueryId'
  | 'applyDatabasePreset'
  | 'openSaveQueryPresetModal'
  | 'updateQueryConfig'
  | 'onSyncSchema'
  | 'mapInputsToTargets'
  | 'updateMapping'
  | 'removeMapping'
  | 'addMapping'
  | 'setSelectedSnippetIndex'
  | 'insertTemplateSnippet'
  | 'applyQueryTemplateUpdate'
  | 'insertQueryPlaceholder'
  | 'insertAiPromptPlaceholder';

export type DatabaseConstructorStateContextValue = Omit<
  DatabaseConstructorContextValue,
  DatabaseConstructorActionKey
>;
export type DatabaseConstructorActionsContextValue = Pick<
  DatabaseConstructorContextValue,
  DatabaseConstructorActionKey
>;

const { Context: DatabaseConstructorStateContext, useStrictContext: useDatabaseConstructorStateContext } =
  createStrictContext<DatabaseConstructorStateContextValue>({
    hookName: 'useDatabaseConstructorStateContext',
    providerName: 'DatabaseConstructorContextProvider',
    displayName: 'DatabaseConstructorStateContext',
    errorFactory: internalError,
  });
const {
  Context: DatabaseConstructorActionsContext,
  useStrictContext: useDatabaseConstructorActionsContext,
} = createStrictContext<DatabaseConstructorActionsContextValue>({
  hookName: 'useDatabaseConstructorActionsContext',
  providerName: 'DatabaseConstructorContextProvider',
  displayName: 'DatabaseConstructorActionsContext',
  errorFactory: internalError,
});

export function DatabaseConstructorContextProvider({
  value,
  children,
}: {
  value: DatabaseConstructorContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const {
    pendingAiQuery,
    aiQueries,
    selectedAiQueryId,
    presetOptions,
    databaseConfig,
    queryConfig,
    resolvedProvider,
    operation,
    queryTemplateValue,
    queryTemplateRef,
    sampleState,
    parsedSampleError,
    connectedPlaceholders,
    hasSchemaConnection,
    fetchedDbSchema,
    schemaMatrix,
    schemaSyncing,
    schemaLoading,
    bundleKeys,
    aiPromptRef,
    mappings,
    availablePorts,
    uniqueTargetPathOptions,
    codeSnippets,
    selectedSnippetIndex,
    setPendingAiQuery,
    setAiQueries,
    setSelectedAiQueryId,
    applyDatabasePreset,
    openSaveQueryPresetModal,
    updateQueryConfig,
    onSyncSchema,
    mapInputsToTargets,
    updateMapping,
    removeMapping,
    addMapping,
    setSelectedSnippetIndex,
    insertTemplateSnippet,
    applyQueryTemplateUpdate,
    insertQueryPlaceholder,
    insertAiPromptPlaceholder,
  } = value;

  const stateValue = useMemo<DatabaseConstructorStateContextValue>(
    () => ({
      pendingAiQuery,
      aiQueries,
      selectedAiQueryId,
      presetOptions,
      databaseConfig,
      queryConfig,
      resolvedProvider,
      operation,
      queryTemplateValue,
      queryTemplateRef,
      sampleState,
      parsedSampleError,
      connectedPlaceholders,
      hasSchemaConnection,
      fetchedDbSchema,
      schemaMatrix,
      schemaSyncing,
      schemaLoading,
      bundleKeys,
      aiPromptRef,
      mappings,
      availablePorts,
      uniqueTargetPathOptions,
      codeSnippets,
      selectedSnippetIndex,
    }),
    [
      pendingAiQuery,
      aiQueries,
      selectedAiQueryId,
      presetOptions,
      databaseConfig,
      queryConfig,
      resolvedProvider,
      operation,
      queryTemplateValue,
      queryTemplateRef,
      sampleState,
      parsedSampleError,
      connectedPlaceholders,
      hasSchemaConnection,
      fetchedDbSchema,
      schemaMatrix,
      schemaSyncing,
      schemaLoading,
      bundleKeys,
      aiPromptRef,
      mappings,
      availablePorts,
      uniqueTargetPathOptions,
      codeSnippets,
      selectedSnippetIndex,
    ]
  );

  const actionsValue = useMemo<DatabaseConstructorActionsContextValue>(
    () => ({
      setPendingAiQuery,
      setAiQueries,
      setSelectedAiQueryId,
      applyDatabasePreset,
      openSaveQueryPresetModal,
      updateQueryConfig,
      onSyncSchema,
      mapInputsToTargets,
      updateMapping,
      removeMapping,
      addMapping,
      setSelectedSnippetIndex,
      insertTemplateSnippet,
      applyQueryTemplateUpdate,
      insertQueryPlaceholder,
      insertAiPromptPlaceholder,
    }),
    [
      setPendingAiQuery,
      setAiQueries,
      setSelectedAiQueryId,
      applyDatabasePreset,
      openSaveQueryPresetModal,
      updateQueryConfig,
      onSyncSchema,
      mapInputsToTargets,
      updateMapping,
      removeMapping,
      addMapping,
      setSelectedSnippetIndex,
      insertTemplateSnippet,
      applyQueryTemplateUpdate,
      insertQueryPlaceholder,
      insertAiPromptPlaceholder,
    ]
  );

  return (
    <DatabaseConstructorActionsContext.Provider value={actionsValue}>
      <DatabaseConstructorStateContext.Provider value={stateValue}>
        {children}
      </DatabaseConstructorStateContext.Provider>
    </DatabaseConstructorActionsContext.Provider>
  );
}

export { useDatabaseConstructorStateContext, useDatabaseConstructorActionsContext };
