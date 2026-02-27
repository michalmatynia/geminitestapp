'use client';

import React from 'react';

import type {
  DatabaseConfig,
  DatabaseOperation,
  DbQueryConfig,
  UpdaterMapping,
  UpdaterSampleState,
} from '@/shared/lib/ai-paths';
import type { AiQuery, DatabasePresetOption, SchemaData } from '@/shared/contracts/database';

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
  resolvedProvider: 'mongodb' | 'prisma';
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
  uniqueTargetPathOptions: Array<{ label: string; value: string }>;
  codeSnippets: string[];
  selectedSnippetIndex: number;
  setSelectedSnippetIndex: React.Dispatch<React.SetStateAction<number>>;
  insertTemplateSnippet: (snippet: string) => void;
  applyQueryTemplateUpdate: (nextQuery: string) => void;
  insertQueryPlaceholder: (placeholder: string) => void;
  insertAiPromptPlaceholder: (placeholder: string) => void;
};

const DatabaseConstructorContext = React.createContext<DatabaseConstructorContextValue | null>(null);

export function DatabaseConstructorContextProvider({
  value,
  children,
}: {
  value: DatabaseConstructorContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DatabaseConstructorContext.Provider value={value}>
      {children}
    </DatabaseConstructorContext.Provider>
  );
}

export function useDatabaseConstructorContext(): DatabaseConstructorContextValue {
  const context = React.useContext(DatabaseConstructorContext);
  if (!context) {
    throw new Error('useDatabaseConstructorContext must be used within DatabaseConstructorContextProvider');
  }
  return context;
}
