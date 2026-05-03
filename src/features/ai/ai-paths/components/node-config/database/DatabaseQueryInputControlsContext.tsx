'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { DatabaseAction, DatabaseActionCategory, DbQueryConfig } from '@/shared/contracts/ai-paths';

import type { QueryValidationResult } from './query-utils';

export type DatabaseQueryInputControlsContextValue = {
  provider: DbQueryConfig['provider'];
  requestedProvider: DbQueryConfig['provider'];
  actionCategory: DatabaseActionCategory;
  action: DatabaseAction;
  actionCategoryOptions: Array<LabeledOptionDto<DatabaseActionCategory>>;
  actionOptions: Array<LabeledOptionDto<DatabaseAction>>;
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

const {
  Context: DatabaseQueryInputControlsStateContext,
  useStrictContext: useDatabaseQueryInputControlsStateContext,
} = createStrictContext<DatabaseQueryInputControlsStateContextValue>({
  hookName: 'useDatabaseQueryInputControlsStateContext',
  providerName: 'DatabaseQueryInputControlsContextProvider',
  displayName: 'DatabaseQueryInputControlsStateContext',
  errorFactory: internalError,
});
const {
  Context: DatabaseQueryInputControlsActionsContext,
  useStrictContext: useDatabaseQueryInputControlsActionsContext,
} = createStrictContext<DatabaseQueryInputControlsActionsContextValue>({
  hookName: 'useDatabaseQueryInputControlsActionsContext',
  providerName: 'DatabaseQueryInputControlsContextProvider',
  displayName: 'DatabaseQueryInputControlsActionsContext',
  errorFactory: internalError,
});

export function DatabaseQueryInputControlsContextProvider({
  value,
  children,
}: {
  value: DatabaseQueryInputControlsContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const stateValue = useDatabaseQueryInputControlsStateValue(value);
  const actionsValue = useDatabaseQueryInputControlsActionsValue(value);

  return (
    <DatabaseQueryInputControlsActionsContext.Provider value={actionsValue}>
      <DatabaseQueryInputControlsStateContext.Provider value={stateValue}>
        {children}
      </DatabaseQueryInputControlsStateContext.Provider>
    </DatabaseQueryInputControlsActionsContext.Provider>
  );
}

function useDatabaseQueryInputControlsStateValue(
  value: DatabaseQueryInputControlsContextValue
): DatabaseQueryInputControlsStateContextValue {
  return useMemo<DatabaseQueryInputControlsStateContextValue>(() => {
    const {
      onFilterChange: _1,
      onToggleRunDry: _2,
      onActionCategoryChange: _3,
      onActionChange: _4,
      onFormatClick: _5,
      onFormatContextMenu: _6,
      onToggleValidator: _7,
      onRunQuery: _8,
      onQueryChange: _9,
      onQueryFocus: _10,
      onFilterFocus: _11,
      onProviderChange: _12,
      ...state
    } = value;
    return state;
  }, [value]);
}

function useDatabaseQueryInputControlsActionsValue(
  value: DatabaseQueryInputControlsContextValue
): DatabaseQueryInputControlsActionsContextValue {
  const {
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

  return useMemo<DatabaseQueryInputControlsActionsContextValue>(
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
}

export {
  useDatabaseQueryInputControlsStateContext,
  useDatabaseQueryInputControlsActionsContext,
};
