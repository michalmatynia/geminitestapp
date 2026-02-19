'use client';

import React from 'react';

import type { DatabaseConfig, DatabaseOperation, DbQueryConfig } from '@/features/ai/ai-paths/lib';

import type { QueryValidationResult } from './query-utils';

export type DatabaseQueryValidatorPanelContextValue = {
  queryValidation: QueryValidationResult;
  queryConfig: DbQueryConfig;
  resolvedProvider?: 'mongodb' | 'prisma';
  operation: DatabaseOperation;
  queryTemplateValue: string;
  databaseConfig: DatabaseConfig;
};

const DatabaseQueryValidatorPanelContext =
  React.createContext<DatabaseQueryValidatorPanelContextValue | null>(null);

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

export function useDatabaseQueryValidatorPanelContext(): DatabaseQueryValidatorPanelContextValue {
  const context = React.useContext(DatabaseQueryValidatorPanelContext);
  if (!context) {
    throw new Error(
      'useDatabaseQueryValidatorPanelContext must be used within DatabaseQueryValidatorPanelContextProvider'
    );
  }
  return context;
}
