import { useCallback } from 'react';
import { 
  resolveDbActionProvider, 
  isProviderActionCategorySupported, 
  getDefaultProviderAction, 
  resolveProviderAction 
} from '@/shared/lib/ai-paths/core/utils/provider-actions';
import type { 
  DatabaseAction, 
  DatabaseActionCategory, 
  DatabaseConfig, 
  DbQueryConfig 
} from '@/shared/lib/ai-paths';

export function useDatabaseActionConfig(args: {
  databaseConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  appDbProvider: 'prisma' | 'mongodb';
  resolvedProvider: 'prisma' | 'mongodb';
  updateSelectedNodeConfig: (config: { database: DatabaseConfig }) => void;
  mapOperationFromActionCategory: (cat: DatabaseActionCategory) => string;
}) {
  const handleProviderChange = useCallback(
    (nextProvider: DbQueryConfig['provider']) => {
      const normalizedRequestedProvider: DbQueryConfig['provider'] =
        nextProvider === 'mongodb' || nextProvider === 'prisma' ? nextProvider : 'auto';
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
      const normalizedCategory = isProviderActionCategorySupported(args.resolvedProvider, nextCategory)
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
