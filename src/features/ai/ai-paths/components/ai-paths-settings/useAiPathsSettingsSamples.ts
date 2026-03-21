import { useQueryClient } from '@tanstack/react-query';

import { useRuntimeActions } from '@/features/ai/ai-paths/context/RuntimeContext';
import type { Toast as ToastFn } from '@/shared/contracts/ui';
import { getProductDetailQueryKey } from '@/shared/lib/product-query-keys';
import type { ParserSampleState, UpdaterSampleState } from '@/shared/lib/ai-paths';
import { dbApi, entityApi } from '@/shared/lib/ai-paths';
import { createMutationV2, fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const AI_PATHS_SAMPLE_STALE_MS = 10_000;

type UseAiPathsSettingsSamplesInput = {
  toast: ToastFn;
};

type FetchUpdaterSampleVariables = {
  nodeId: string;
  entityType: string;
  entityId: string;
  notify?: boolean;
};

type FetchUpdaterSampleResult = {
  nodeId: string;
  entityType: string;
  entityId: string;
  sample: unknown | null;
  error?: string;
  notify: boolean;
};

export type UseAiPathsSettingsSamplesReturn = {
  parserSampleLoading: boolean;
  updaterSampleLoading: boolean;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleFetchUpdaterSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean }
  ) => Promise<void>;
};

export function useAiPathsSettingsSamples({
  toast,
}: UseAiPathsSettingsSamplesInput): UseAiPathsSettingsSamplesReturn {
  const queryClient = useQueryClient();
  const { setParserSamples, setUpdaterSamples } = useRuntimeActions();
  const fetchParserSampleMutation = createMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('settings.fetch-parser-sample'),
    mutationFn: async ({
      nodeId,
      entityType,
      entityId,
    }: {
      nodeId: string;
      entityType: string;
      entityId: string;
    }): Promise<{
      nodeId: string;
      entityType: string;
      entityId: string;
      sample: Record<string, unknown>;
    }> => {
      if (!entityId.trim()) {
        throw new Error('Enter an entity ID to load a sample.');
      }
      if (entityType === 'custom') {
        throw new Error('Use pasted JSON for custom samples.');
      }
      const normalized = entityType.trim().toLowerCase();
      const resolvedType =
        normalized === 'products' ? 'product' : normalized === 'notes' ? 'note' : normalized;
      let sample: Record<string, unknown> | null = null;
      if (resolvedType === 'product') {
        sample = await fetchQueryV2<Record<string, unknown> | null>(queryClient, {
          queryKey: getProductDetailQueryKey(entityId),
          queryFn: async (): Promise<Record<string, unknown> | null> => {
            const result = await entityApi.getProduct(entityId);
            return result.ok ? (result.data as Record<string, unknown>) : null;
          },
          staleTime: AI_PATHS_SAMPLE_STALE_MS,
          meta: {
            source: 'ai.ai-paths.settings.fetch-parser-sample.product',
            operation: 'detail',
            resource: 'products.detail',
            domain: 'ai_paths',
            queryKey: getProductDetailQueryKey(entityId),
            tags: ['ai-paths', 'samples', 'fetch'],
            description: 'Loads products detail.'},
        })();
      } else if (resolvedType === 'note') {
        sample = await fetchQueryV2<Record<string, unknown> | null>(queryClient, {
          queryKey: QUERY_KEYS.notes.detail(entityId),
          queryFn: async (): Promise<Record<string, unknown> | null> => {
            const result = await entityApi.getNote(entityId);
            return result.ok ? (result.data as Record<string, unknown>) : null;
          },
          staleTime: AI_PATHS_SAMPLE_STALE_MS,
          meta: {
            source: 'ai.ai-paths.settings.fetch-parser-sample.note',
            operation: 'detail',
            resource: 'notes.detail',
            domain: 'ai_paths',
            queryKey: QUERY_KEYS.notes.detail(entityId),
            tags: ['ai-paths', 'samples', 'fetch'],
            description: 'Loads notes detail.'},
        })();
      }
      if (!sample) {
        throw new Error('No sample found for that ID.');
      }
      return { nodeId, entityType, entityId, sample };
    },
    meta: {
      source: 'ai.ai-paths.settings.fetch-parser-sample',
      operation: 'action',
      resource: 'ai-paths.samples.parser',
      domain: 'ai_paths',
      tags: ['ai-paths', 'settings', 'samples'],
      description: 'Runs ai paths samples parser.'},
    onSuccess: ({
      nodeId,
      entityType,
      entityId,
      sample,
    }: {
      nodeId: string;
      entityType: string;
      entityId: string;
      sample: unknown;
    }): void => {
      setParserSamples((prev: Record<string, ParserSampleState>) => ({
        ...prev,
        [nodeId]: {
          entityType,
          entityId,
          json: JSON.stringify(sample, null, 2),
          mappingMode: prev[nodeId]?.mappingMode ?? 'top',
          depth: prev[nodeId]?.depth ?? 2,
          keyStyle: prev[nodeId]?.keyStyle ?? 'path',
          includeContainers: prev[nodeId]?.includeContainers ?? false,
        },
      }));
    },
    onError: (error: Error): void => {
      toast(error instanceof Error ? error.message : 'Failed to fetch sample.', {
        variant: 'error',
      });
    },
  });

  const fetchUpdaterSampleMutation = createMutationV2<
    FetchUpdaterSampleResult,
    FetchUpdaterSampleVariables
  >({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('settings.fetch-updater-sample'),
    mutationFn: async ({
      nodeId,
      entityType,
      entityId,
      notify = true,
    }: FetchUpdaterSampleVariables): Promise<FetchUpdaterSampleResult> => {
      if (entityType === 'custom') {
        return {
          nodeId,
          entityType,
          entityId,
          sample: null,
          error: 'Use pasted JSON for custom samples.',
          notify,
        };
      }
      let sample: unknown;
      let fetchedId = entityId;

      const isObjectId = (value: string): boolean => /^[0-9a-fA-F]{24}$/.test(value);
      const fetchViaDbQuery = async (
        collection: string,
        id?: string
      ): Promise<{ sample: unknown | null; fetchedId: string }> => {
        const queries: Array<{
          filter: Record<string, unknown>;
          idType?: 'string' | 'objectId';
        }> = [];
        if (id?.trim()) {
          queries.push({ filter: { id }, idType: 'string' });
          if (isObjectId(id)) {
            queries.push({ filter: { _id: id }, idType: 'objectId' });
          } else {
            queries.push({ filter: { _id: id }, idType: 'string' });
          }
        } else {
          queries.push({ filter: {}, idType: 'string' });
        }
        for (const candidate of queries) {
          const result = await dbApi.query<{
            item?: unknown;
            items?: unknown[];
          }>({
            provider: 'auto',
            collection,
            filter: candidate.filter,
            single: true,
            limit: 1,
            idType: candidate.idType,
          });
          if (!result.ok) {
            continue;
          }
          const payload = result.data;
          const resolvedSample = payload?.item ?? payload?.items?.[0] ?? null;
          if (resolvedSample) {
            const rawId =
              (resolvedSample as Record<string, unknown>)?.['_id'] ??
              (resolvedSample as Record<string, unknown>)?.['id'];
            const nextId = (rawId as { toString?: () => string })?.toString?.() ?? id ?? '';
            return { sample: resolvedSample, fetchedId: nextId };
          }
        }
        return { sample: null, fetchedId: id ?? '' };
      };

      if (!entityId.trim()) {
        const fetched = await fetchViaDbQuery(entityType, '');
        sample = fetched.sample;
        fetchedId = fetched.fetchedId;
      } else {
        const normalized = entityType.toLowerCase();
        if (normalized === 'product') {
          sample = await fetchQueryV2<unknown>(queryClient, {
            queryKey: getProductDetailQueryKey(entityId),
            queryFn: async () => {
              const result = await entityApi.getProduct(entityId);
              return result.ok ? result.data : null;
            },
            staleTime: AI_PATHS_SAMPLE_STALE_MS,
            meta: {
              source: 'ai.ai-paths.settings.fetch-updater-sample.product',
              operation: 'detail',
              resource: 'products.detail',
              domain: 'ai_paths',
              queryKey: getProductDetailQueryKey(entityId),
              tags: ['ai-paths', 'samples', 'fetch'],
              description: 'Loads products detail.'},
          })();
        } else if (normalized === 'note') {
          sample = await fetchQueryV2<unknown>(queryClient, {
            queryKey: QUERY_KEYS.notes.detail(entityId),
            queryFn: async () => {
              const result = await entityApi.getNote(entityId);
              return result.ok ? result.data : null;
            },
            staleTime: AI_PATHS_SAMPLE_STALE_MS,
            meta: {
              source: 'ai.ai-paths.settings.fetch-updater-sample.note',
              operation: 'detail',
              resource: 'notes.detail',
              domain: 'ai_paths',
              queryKey: QUERY_KEYS.notes.detail(entityId),
              tags: ['ai-paths', 'samples', 'fetch'],
              description: 'Loads notes detail.'},
          })();
        } else {
          const fetched = await fetchViaDbQuery(entityType, entityId);
          sample = fetched.sample;
          fetchedId = fetched.fetchedId;
        }
      }

      if (!sample) {
        return {
          nodeId,
          entityType,
          entityId: fetchedId,
          sample: null,
          error: 'No sample found.',
          notify,
        };
      }
      return { nodeId, entityType, entityId: fetchedId, sample, notify };
    },
    meta: {
      source: 'ai.ai-paths.settings.fetch-updater-sample',
      operation: 'action',
      resource: 'ai-paths.samples.updater',
      domain: 'ai_paths',
      tags: ['ai-paths', 'settings', 'samples'],
      description: 'Runs ai paths samples updater.'},
    onSuccess: ({
      nodeId,
      entityType,
      entityId,
      sample,
      error,
      notify,
    }: FetchUpdaterSampleResult): void => {
      if (!sample) {
        if (notify) {
          toast(error ?? 'No sample found.', { variant: 'error' });
        }
        return;
      }
      setUpdaterSamples(
        (prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
          ...prev,
          [nodeId]: {
            entityType,
            entityId,
            json: JSON.stringify(sample, null, 2),
            mappingMode: prev[nodeId]?.mappingMode ?? 'top',
            depth: prev[nodeId]?.depth ?? 2,
            keyStyle: prev[nodeId]?.keyStyle ?? 'path',
            includeContainers: prev[nodeId]?.includeContainers ?? false,
          },
        })
      );
      if (notify) {
        toast('Sample fetched.', { variant: 'success' });
      }
    },
    onError: (error: Error, variables: FetchUpdaterSampleVariables): void => {
      if (variables?.notify === false) {
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to fetch sample.', {
        variant: 'error',
      });
    },
  });

  const parserSampleLoading = fetchParserSampleMutation.isPending;
  const updaterSampleLoading = fetchUpdaterSampleMutation.isPending;

  const handleFetchParserSample = async (
    nodeId: string,
    entityType: string,
    entityId: string
  ): Promise<void> => {
    await fetchParserSampleMutation.mutateAsync({
      nodeId,
      entityType,
      entityId,
    });
  };

  const handleFetchUpdaterSample = async (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean }
  ): Promise<void> => {
    await fetchUpdaterSampleMutation.mutateAsync({
      nodeId,
      entityType,
      entityId,
      notify: options?.notify ?? true,
    });
  };

  return {
    parserSampleLoading,
    updaterSampleLoading,
    handleFetchParserSample,
    handleFetchUpdaterSample,
  };
}
