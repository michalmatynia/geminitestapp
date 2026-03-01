import { useCallback, useState } from 'react';
import { renderTemplate, safeParseJson, dbApi } from '@/shared/lib/ai-paths';
import { buildPresetQueryTemplate } from '@/features/ai/ai-paths/config/query-presets';
import type {
  DatabaseAction,
  DatabaseConfig,
  DbQueryConfig,
  RuntimeState,
} from '@/shared/lib/ai-paths';
import type { Toast } from '@/shared/contracts/ui';

export function useDatabaseQueryExecution(args: {
  selectedNodeId: string;
  databaseConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  runtimeState: RuntimeState;
  queryTemplateValue: string;
  isUpdateAction: boolean;
  updateSelectedNodeConfig: (config: { database: DatabaseConfig }) => void;
  toast: Toast;
}) {
  const [testQueryResult, setTestQueryResult] = useState<string>('');
  const [testQueryLoading, setTestQueryLoading] = useState(false);

  const handleRunQuery = useCallback(async () => {
    setTestQueryLoading(true);
    setTestQueryResult('');

    try {
      const inputs = args.runtimeState.inputs?.[args.selectedNodeId];
      const ctx = { ...args.runtimeState.outputs?.[args.selectedNodeId], ...inputs };
      const rawValue = inputs?.['value'] ?? inputs?.['jobId'];
      const val = Array.isArray(rawValue) ? (rawValue as unknown[])[0] : rawValue;

      const actionCategory = args.databaseConfig.actionCategory;
      const action = args.databaseConfig.action as DatabaseAction;
      let actionPayload: Record<string, unknown> = {};

      if (actionCategory === 'update') {
        const renderedFilter = renderTemplate(
          args.queryConfig.queryTemplate || '{}',
          ctx,
          val ?? ''
        );
        const parsedFilter = safeParseJson(renderedFilter);
        if (parsedFilter.error) throw new Error(parsedFilter.error);

        const renderedUpdate = renderTemplate(
          args.databaseConfig.updateTemplate || '{}',
          ctx,
          val ?? ''
        );
        const parsedUpdate = safeParseJson(renderedUpdate);
        if (parsedUpdate.error) throw new Error(parsedUpdate.error);

        actionPayload = {
          filter: parsedFilter.value,
          update: parsedUpdate.value,
        };
      } else {
        const activeVal = args.queryTemplateValue;
        const rendered = renderTemplate(activeVal || '', ctx, val ?? '');
        const parsed = safeParseJson(rendered);
        if (parsed.error) throw new Error(parsed.error);
        actionPayload = {
          [actionCategory === 'create'
            ? 'document'
            : actionCategory === 'aggregate'
              ? 'pipeline'
              : 'filter']: parsed.value,
        };
      }

      const res = await dbApi.action({
        provider: args.queryConfig.provider || 'auto',
        action,
        collection: args.queryConfig.collection || 'products',
        ...actionPayload,
        idType: args.queryConfig.idType || 'string',
      });
      if (!res.ok) throw new Error(res.error || 'Query failed');
      setTestQueryResult(JSON.stringify(res.data, null, 2));
      args.toast('Success', { variant: 'success' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setTestQueryResult(JSON.stringify({ error: message }, null, 2));
      args.toast(message, { variant: 'error' });
    } finally {
      setTestQueryLoading(false);
    }
  }, [args]);

  const updateQueryConfig = useCallback(
    (patch: Partial<DbQueryConfig>, options?: { syncPreset?: boolean }) => {
      const nextQuery = { ...args.queryConfig, ...patch };
      if (options?.syncPreset && nextQuery.mode === 'preset') {
        nextQuery.queryTemplate = buildPresetQueryTemplate(nextQuery);
      }
      args.updateSelectedNodeConfig({
        database: { ...args.databaseConfig, query: nextQuery },
      });
    },
    [args]
  );

  return {
    handleRunQuery,
    updateQueryConfig,
    testQueryResult,
    setTestQueryResult,
    testQueryLoading,
    setTestQueryLoading,
  };
}
