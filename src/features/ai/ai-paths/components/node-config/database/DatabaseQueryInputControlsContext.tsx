'use client';

import React from 'react';

import type { DatabaseAction, DatabaseActionCategory, DbQueryConfig } from '@/features/ai/ai-paths/lib';

import type { QueryValidationResult } from './query-utils';

export type DatabaseQueryInputControlsContextValue = {
  provider: DbQueryConfig['provider'];
  requestedProvider: DbQueryConfig['provider'];
  actionCategory: DatabaseActionCategory;
  action: DatabaseAction;
  actionCategoryOptions: Array<{ value: DatabaseActionCategory; label: string }>;
  actionOptions: Array<{ value: DatabaseAction; label: string }>;
  queryTemplateValue: string;
  queryPlaceholder: string;
  showFilterInput?: boolean;
  filterTemplateValue?: string;
  filterPlaceholder?: string;
  onFilterChange?: (value: string) => void;
  runDry?: boolean;
  onToggleRunDry?: () => void;
  queryValidation: QueryValidationResult | null;
  queryFormatterEnabled: boolean;
  queryValidatorEnabled: boolean;
  testQueryLoading: boolean;
  queryTemplateRef?: React.RefObject<HTMLTextAreaElement | null>;
  onActionCategoryChange: (value: DatabaseActionCategory) => void;
  onActionChange: (value: DatabaseAction) => void;
  onFormatClick: () => void;
  onFormatContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleValidator: () => void;
  onRunQuery: () => void;
  onQueryChange: (value: string) => void;
  onQueryFocus?: () => void;
  onFilterFocus?: () => void;
  onProviderChange: (value: DbQueryConfig['provider']) => void;
};

const DatabaseQueryInputControlsContext =
  React.createContext<DatabaseQueryInputControlsContextValue | null>(null);

export function DatabaseQueryInputControlsContextProvider({
  value,
  children,
}: {
  value: DatabaseQueryInputControlsContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DatabaseQueryInputControlsContext.Provider value={value}>
      {children}
    </DatabaseQueryInputControlsContext.Provider>
  );
}

export function useDatabaseQueryInputControlsContext(): DatabaseQueryInputControlsContextValue {
  const context = React.useContext(DatabaseQueryInputControlsContext);
  if (!context) {
    throw new Error(
      'useDatabaseQueryInputControlsContext must be used within DatabaseQueryInputControlsContextProvider'
    );
  }
  return context;
}
