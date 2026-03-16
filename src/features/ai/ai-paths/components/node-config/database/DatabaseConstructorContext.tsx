'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AiQuery, DatabasePresetOption, SchemaData } from '@/shared/contracts/database';
import { internalError } from '@/shared/errors/app-error';
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

const DatabaseConstructorStateContext =
  React.createContext<DatabaseConstructorStateContextValue | null>(null);
const DatabaseConstructorActionsContext =
  React.createContext<DatabaseConstructorActionsContextValue | null>(null);

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

export function useDatabaseConstructorStateContext(): DatabaseConstructorStateContextValue {
  const context = React.useContext(DatabaseConstructorStateContext);
  if (!context) {
    throw internalError(
      'useDatabaseConstructorStateContext must be used within DatabaseConstructorContextProvider'
    );
  }
  return context;
}

export function useDatabaseConstructorActionsContext(): DatabaseConstructorActionsContextValue {
  const context = React.useContext(DatabaseConstructorActionsContext);
  if (!context) {
    throw internalError(
      'useDatabaseConstructorActionsContext must be used within DatabaseConstructorContextProvider'
    );
  }
  return context;
}
