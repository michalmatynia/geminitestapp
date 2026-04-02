import { type QueryClient, useQueryClient } from '@tanstack/react-query';

import { useRuntimeActions } from '@/features/ai/ai-paths/context/RuntimeContext';
import type { Toast } from '@/shared/contracts/ui';
import { getProductDetailQueryKey } from '@/shared/lib/product-query-keys';
import type { ParserSampleState, UpdaterSampleState } from '@/shared/lib/ai-paths';
import { dbApi, entityApi } from '@/shared/lib/ai-paths';
import { createMutationV2, fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const AI_PATHS_SAMPLE_STALE_MS = 10_000;
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

type UseAiPathsSettingsSamplesInput = {
  toast: Toast;
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

type DbQueryCandidate = {
  filter: Record<string, unknown>;
  idType?: 'string' | 'objectId';
};

type DbQueryPayload = {
  item?: unknown;
  items?: unknown[];
};

type FetchedSampleResult = {
  sample: unknown | null;
  fetchedId: string;
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

const isObjectId = (value: string): boolean => OBJECT_ID_PATTERN.test(value);

const buildDbQueryCandidates = (id?: string): DbQueryCandidate[] => {
  if (!id?.trim()) {
    return [{ filter: {}, idType: 'string' }];
  }

  return [
    { filter: { id }, idType: 'string' },
    { filter: { _id: id }, idType: isObjectId(id) ? 'objectId' : 'string' },
  ];
};

const readDbQuerySample = (payload: DbQueryPayload | null | undefined): unknown | null =>
  payload?.item ?? payload?.items?.[0] ?? null;

const resolveFetchedSampleId = (sample: unknown, fallbackId: string): string => {
  const record = sample as Record<string, unknown> | null | undefined;
  const rawId = record?.['_id'] ?? record?.['id'];
  return (rawId as { toString?: () => string })?.toString?.() ?? fallbackId;
};

const queryDbSampleCandidate = async ({
  collection,
  candidate,
  fallbackId,
}: {
  collection: string;
  candidate: DbQueryCandidate;
  fallbackId: string;
}): Promise<FetchedSampleResult | null> => {
  const result = await dbApi.query<DbQueryPayload>({
    provider: 'auto',
    collection,
    filter: candidate.filter,
    single: true,
    limit: 1,
    idType: candidate.idType,
  });

  if (!result.ok) {
    return null;
  }

  const sample = readDbQuerySample(result.data);
  if (!sample) {
    return null;
  }

  return {
    sample,
    fetchedId: resolveFetchedSampleId(sample, fallbackId),
  };
};

const fetchUpdaterSampleViaDbQuery = async (
  collection: string,
  id?: string
): Promise<FetchedSampleResult> => {
  const fallbackId = id ?? '';

  for (const candidate of buildDbQueryCandidates(id)) {
    const result = await queryDbSampleCandidate({
      collection,
      candidate,
      fallbackId,
    });
    if (result) {
      return result;
    }
  }

  return { sample: null, fetchedId: fallbackId };
};

const fetchUpdaterProductSample = async (
  queryClient: QueryClient,
  entityId: string
): Promise<FetchedSampleResult> => ({
  sample: await fetchQueryV2<unknown>(queryClient, {
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
      description: 'Loads products detail.',
    },
  })(),
  fetchedId: entityId,
});

const fetchUpdaterNoteSample = async (
  queryClient: QueryClient,
  entityId: string
): Promise<FetchedSampleResult> => ({
  sample: await fetchQueryV2<unknown>(queryClient, {
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
      description: 'Loads notes detail.',
    },
  })(),
  fetchedId: entityId,
});

const fetchUpdaterSampleByEntityType = async ({
  queryClient,
  entityType,
  entityId,
}: {
  queryClient: QueryClient;
  entityType: string;
  entityId: string;
}): Promise<FetchedSampleResult> => {
  if (!entityId.trim()) {
    return await fetchUpdaterSampleViaDbQuery(entityType, '');
  }

  const normalized = entityType.toLowerCase();
  if (normalized === 'product') {
    return await fetchUpdaterProductSample(queryClient, entityId);
  }
  if (normalized === 'note') {
    return await fetchUpdaterNoteSample(queryClient, entityId);
  }

  return await fetchUpdaterSampleViaDbQuery(entityType, entityId);
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
      const { sample, fetchedId } = await fetchUpdaterSampleByEntityType({
        queryClient,
        entityType,
        entityId,
      });

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
