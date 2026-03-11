import { useCallback } from 'react';

import type {
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  DbQueryConfig,
  DatabaseOperation,
} from '@/shared/lib/ai-paths';
import {
  resolveDbActionProvider,
  isProviderActionCategorySupported,
  getDefaultProviderAction,
  resolveProviderAction,
  type DbActionProvider,
} from '@/shared/lib/ai-paths/core/utils/provider-actions';

export function useDatabaseActionConfig(args: {
  databaseConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  appDbProvider: 'mongodb';
  resolvedProvider: DbActionProvider;
  updateSelectedNodeConfig: (config: { database: DatabaseConfig }) => void;
  mapOperationFromActionCategory: (cat: DatabaseActionCategory) => DatabaseOperation;
}) {
  const handleProviderChange = useCallback(
    (nextProvider: DbQueryConfig['provider']) => {
      const normalizedRequestedProvider: DbQueryConfig['provider'] =
        nextProvider === 'mongodb' ? nextProvider : 'auto';
      const nextResolvedProvider = resolveDbActionProvider(
        normalizedRequestedProvider,
        args.appDbProvider
      );
      const currentCategory = args.databaseConfig.actionCategory ?? 'read';
      const normalizedCategory = isProviderActionCategorySupported(
        nextResolvedProvider,
        currentCategory
      )
        ? currentCategory
        : 'read';
      const fallbackAction = getDefaultProviderAction(
        nextResolvedProvider,
        normalizedCategory,
        args.queryConfig.single ?? false
      );
      const normalizedAction = resolveProviderAction(
        nextResolvedProvider,
        normalizedCategory,
        args.databaseConfig.action ?? fallbackAction,
        args.queryConfig.single ?? false
      );

      args.updateSelectedNodeConfig({
        database: {
          ...args.databaseConfig,
          query: {
            ...args.queryConfig,
            provider: normalizedRequestedProvider,
          },
          actionCategory: normalizedCategory,
          action: normalizedAction,
          operation:
            args.databaseConfig.useMongoActions === false
              ? (args.databaseConfig.operation ?? 'query')
              : args.mapOperationFromActionCategory(normalizedCategory),
        },
      });
    },
    [args]
  );

  const applyActionConfig = useCallback(
    (nextCategory: DatabaseActionCategory, nextAction: DatabaseAction) => {
      const normalizedCategory = isProviderActionCategorySupported(
        args.resolvedProvider,
        nextCategory
      )
        ? nextCategory
        : 'read';
      const nextActionResolved = resolveProviderAction(
        args.resolvedProvider,
        normalizedCategory,
        nextAction,
        args.queryConfig.single ?? false
      );

      args.updateSelectedNodeConfig({
        database: {
          ...args.databaseConfig,
          useMongoActions: true,
          actionCategory: normalizedCategory,
          action: nextActionResolved,
          operation: args.mapOperationFromActionCategory(normalizedCategory),
        },
      });
    },
    [args]
  );
  const handleActionCategoryChange = useCallback(
    (value: DatabaseActionCategory) => {
      const defaultAction = getDefaultProviderAction(
        args.resolvedProvider,
        value,
        args.queryConfig.single ?? false
      );
      applyActionConfig(value, defaultAction);
    },
    [args, applyActionConfig]
  );

  return {
    handleProviderChange,
    handleActionCategoryChange,
    applyActionConfig,
  };
}
