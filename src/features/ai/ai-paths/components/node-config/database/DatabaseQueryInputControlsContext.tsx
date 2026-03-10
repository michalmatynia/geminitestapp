'use client';

import React, { useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';
import type { DatabaseAction, DatabaseActionCategory, DbQueryConfig } from '@/shared/lib/ai-paths';

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

type DatabaseQueryInputControlsActionKey =
  | 'onFilterChange'
  | 'onToggleRunDry'
  | 'onActionCategoryChange'
  | 'onActionChange'
  | 'onFormatClick'
  | 'onFormatContextMenu'
  | 'onToggleValidator'
  | 'onRunQuery'
  | 'onQueryChange'
  | 'onQueryFocus'
  | 'onFilterFocus'
  | 'onProviderChange';

export type DatabaseQueryInputControlsStateContextValue = Omit<
  DatabaseQueryInputControlsContextValue,
  DatabaseQueryInputControlsActionKey
>;
export type DatabaseQueryInputControlsActionsContextValue = Pick<
  DatabaseQueryInputControlsContextValue,
  DatabaseQueryInputControlsActionKey
>;

const DatabaseQueryInputControlsStateContext =
  React.createContext<DatabaseQueryInputControlsStateContextValue | null>(null);
const DatabaseQueryInputControlsActionsContext =
  React.createContext<DatabaseQueryInputControlsActionsContextValue | null>(null);

export function DatabaseQueryInputControlsContextProvider({
  value,
  children,
}: {
  value: DatabaseQueryInputControlsContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const {
    provider,
    requestedProvider,
    actionCategory,
    action,
    actionCategoryOptions,
    actionOptions,
    queryTemplateValue,
    queryPlaceholder,
    showFilterInput,
    filterTemplateValue,
    filterPlaceholder,
    runDry,
    queryValidation,
    queryFormatterEnabled,
    queryValidatorEnabled,
    testQueryLoading,
    queryTemplateRef,
    onFilterChange,
    onToggleRunDry,
    onActionCategoryChange,
    onActionChange,
    onFormatClick,
    onFormatContextMenu,
    onToggleValidator,
    onRunQuery,
    onQueryChange,
    onQueryFocus,
    onFilterFocus,
    onProviderChange,
  } = value;

  const stateValue = useMemo<DatabaseQueryInputControlsStateContextValue>(
    () => ({
      provider,
      requestedProvider,
      actionCategory,
      action,
      actionCategoryOptions,
      actionOptions,
      queryTemplateValue,
      queryPlaceholder,
      showFilterInput,
      filterTemplateValue,
      filterPlaceholder,
      runDry,
      queryValidation,
      queryFormatterEnabled,
      queryValidatorEnabled,
      testQueryLoading,
      queryTemplateRef,
    }),
    [
      provider,
      requestedProvider,
      actionCategory,
      action,
      actionCategoryOptions,
      actionOptions,
      queryTemplateValue,
      queryPlaceholder,
      showFilterInput,
      filterTemplateValue,
      filterPlaceholder,
      runDry,
      queryValidation,
      queryFormatterEnabled,
      queryValidatorEnabled,
      testQueryLoading,
      queryTemplateRef,
    ]
  );

  const actionsValue = useMemo<DatabaseQueryInputControlsActionsContextValue>(
    () => ({
      onFilterChange,
      onToggleRunDry,
      onActionCategoryChange,
      onActionChange,
      onFormatClick,
      onFormatContextMenu,
      onToggleValidator,
      onRunQuery,
      onQueryChange,
      onQueryFocus,
      onFilterFocus,
      onProviderChange,
    }),
    [
      onFilterChange,
      onToggleRunDry,
      onActionCategoryChange,
      onActionChange,
      onFormatClick,
      onFormatContextMenu,
      onToggleValidator,
      onRunQuery,
      onQueryChange,
      onQueryFocus,
      onFilterFocus,
      onProviderChange,
    ]
  );

  return (
    <DatabaseQueryInputControlsActionsContext.Provider value={actionsValue}>
      <DatabaseQueryInputControlsStateContext.Provider value={stateValue}>
        {children}
      </DatabaseQueryInputControlsStateContext.Provider>
    </DatabaseQueryInputControlsActionsContext.Provider>
  );
}

export function useDatabaseQueryInputControlsStateContext(): DatabaseQueryInputControlsStateContextValue {
  const context = React.useContext(DatabaseQueryInputControlsStateContext);
  if (!context) {
    throw internalError(
      'useDatabaseQueryInputControlsStateContext must be used within DatabaseQueryInputControlsContextProvider'
    );
  }
  return context;
}

export function useDatabaseQueryInputControlsActionsContext(): DatabaseQueryInputControlsActionsContextValue {
  const context = React.useContext(DatabaseQueryInputControlsActionsContext);
  if (!context) {
    throw internalError(
      'useDatabaseQueryInputControlsActionsContext must be used within DatabaseQueryInputControlsContextProvider'
    );
  }
  return context;
}
