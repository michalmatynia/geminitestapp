'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { DatabaseConfig, DatabaseOperation, DbQueryConfig } from '@/shared/contracts/ai-paths';

import type { QueryValidationResult } from './query-utils';

export type DatabaseQueryValidatorPanelContextValue = {
  queryValidation: QueryValidationResult;
  queryConfig: DbQueryConfig;
  resolvedProvider?: 'mongodb';
  operation: DatabaseOperation;
  queryTemplateValue: string;
  databaseConfig: DatabaseConfig;
};

const {
  Context: DatabaseQueryValidatorPanelContext,
  useStrictContext: useDatabaseQueryValidatorPanelContextValue,
} = createStrictContext<DatabaseQueryValidatorPanelContextValue>({
  hookName: 'useDatabaseQueryValidatorPanelContext',
  providerName: 'DatabaseQueryValidatorPanelContextProvider',
  errorFactory: internalError,
});

export function DatabaseQueryValidatorPanelContextProvider({
  value,
  children,
}: {
  value: DatabaseQueryValidatorPanelContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DatabaseQueryValidatorPanelContext.Provider value={value}>
      {children}
    </DatabaseQueryValidatorPanelContext.Provider>
  );
}

export const useDatabaseQueryValidatorPanelContext = useDatabaseQueryValidatorPanelContextValue;
