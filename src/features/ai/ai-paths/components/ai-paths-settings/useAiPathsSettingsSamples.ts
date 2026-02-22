import React from 'react';

import type { ParserSampleState, UpdaterSampleState } from '@/features/ai/ai-paths/lib';
import { dbApi, entityApi } from '@/features/ai/ai-paths/lib';
import { getProductDetailQueryKey } from '@/features/products/hooks/productCache';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { QueryClient } from '@tanstack/react-query';

const AI_PATHS_SAMPLE_STALE_MS = 10_000;

type ToastFn = (
  message: string,
  options?: {
    variant?: 'info' | 'success' | 'warning' | 'error';
  },
) => void;

type UseAiPathsSettingsSamplesInput = {
  queryClient: QueryClient;
  setParserSamples: React.Dispatch<
    React.SetStateAction<Record<string, ParserSampleState>>
  >;
  setUpdaterSamples: React.Dispatch<
    React.SetStateAction<Record<string, UpdaterSampleState>>
  >;
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
  handleFetchParserSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
  ) => Promise<void>;
  handleFetchUpdaterSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean },
  ) => Promise<void>;
};

export function useAiPathsSettingsSamples({
  queryClient,
  setParserSamples,
  setUpdaterSamples,
  toast,
}: UseAiPathsSettingsSamplesInput): UseAiPathsSettingsSamplesReturn {
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
        normalized === 'products'
          ? 'product'
          : normalized === 'notes'
            ? 'note'
            : normalized;
      let sample: Record<string, unknown> | null = null;
      if (resolvedType === 'product') {
        sample = await queryClient.fetchQuery({
          queryKey: getProductDetailQueryKey(entityId),
          queryFn: async () => {
            const result = await entityApi.getProduct(entityId);
            return result.ok ? result.data : null;
          },
          staleTime: AI_PATHS_SAMPLE_STALE_MS,
        });
      } else if (resolvedType === 'note') {
        sample = await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.notes.detail(entityId),
          queryFn: async () => {
            const result = await entityApi.getNote(entityId);
            return result.ok ? result.data : null;
          },
          staleTime: AI_PATHS_SAMPLE_STALE_MS,
        });
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
      domain: 'global',
      tags: ['ai-paths', 'settings', 'samples'],
    },
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
      toast(
        error instanceof Error ? error.message : 'Failed to fetch sample.',
        { variant: 'error' },
      );
    },
  });

  const fetchUpdaterSampleMutation = createMutationV2<
    FetchUpdaterSampleResult,
    FetchUpdaterSampleVariables
  >({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation(
      'settings.fetch-updater-sample',
    ),
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
      
      const isObjectId = (value: string): boolean =>
        /^[0-9a-fA-F]{24}$/.test(value);
      const fetchViaDbQuery = async (
        collection: string,
        id?: string,
      ): Promise<{ sample: unknown | null; fetchedId: string }> => {
        const queries: Array<{
          query: Record<string, unknown>;
          idType?: 'string' | 'objectId';
        }> = [];
        if (id?.trim()) {
          queries.push({ query: { id }, idType: 'string' });
          if (isObjectId(id)) {
            queries.push({ query: { _id: id }, idType: 'objectId' });
          } else {
            queries.push({ query: { _id: id }, idType: 'string' });
          }
        } else {
          queries.push({ query: {}, idType: 'string' });
        }
        for (const candidate of queries) {
          const result = await dbApi.query<{
            item?: unknown;
            items?: unknown[];
          }>({
            provider: 'auto',
            collection,
            query: candidate.query,
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
            const nextId =
              (rawId as { toString?: () => string })?.toString?.() ?? id ?? '';
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
          sample = await queryClient.fetchQuery({
            queryKey: getProductDetailQueryKey(entityId),
            queryFn: async () => {
              const result = await entityApi.getProduct(entityId);
              return result.ok ? result.data : null;
            },
            staleTime: AI_PATHS_SAMPLE_STALE_MS,
          });
        } else if (normalized === 'note') {
          sample = await queryClient.fetchQuery({
            queryKey: QUERY_KEYS.notes.detail(entityId),
            queryFn: async () => {
              const result = await entityApi.getNote(entityId);
              return result.ok ? result.data : null;
            },
            staleTime: AI_PATHS_SAMPLE_STALE_MS,
          });
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
      domain: 'global',
      tags: ['ai-paths', 'settings', 'samples'],
    },
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
      setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
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
      if (notify) {
        toast('Sample fetched.', { variant: 'success' });
      }
    },
    onError: (error: Error, variables: FetchUpdaterSampleVariables): void => {
      if (variables?.notify === false) {
        return;
      }
      toast(
        error instanceof Error ? error.message : 'Failed to fetch sample.',
        { variant: 'error' },
      );
    },
  });

  const parserSampleLoading = fetchParserSampleMutation.isPending;
  const updaterSampleLoading = fetchUpdaterSampleMutation.isPending;

  const handleFetchParserSample = async (
    nodeId: string,
    entityType: string,
    entityId: string,
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
    options?: { notify?: boolean },
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
