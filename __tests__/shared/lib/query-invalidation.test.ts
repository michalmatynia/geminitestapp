import { QueryClient } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as helpers from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

describe('query-invalidation helpers', () => {
  let queryClient: QueryClient;
  const createRun = (overrides: Record<string, unknown> = {}) => ({
    id: 'run-1',
    userId: 'user-1',
    pathId: 'path-1',
    pathName: 'Path One',
    prompt: null,
    status: 'queued',
    triggerEvent: null,
    triggerNodeId: null,
    triggerContext: null,
    graph: null,
    runtimeState: null,
    meta: null,
    context: null,
    result: null,
    entityId: null,
    entityType: null,
    errorMessage: null,
    retryCount: 0,
    maxAttempts: 3,
    nextRetryAt: null,
    deadLetteredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.spyOn(queryClient, 'invalidateQueries');
    vi.spyOn(queryClient, 'refetchQueries');
  });

  describe('Product Metadata', () => {
    it('invalidateProductMetadata should invalidate metadata all key', () => {
      void helpers.invalidateProductMetadata(queryClient);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.products.metadata.all,
      });
    });

    it('invalidateCatalogScopedData should invalidate all catalog scoped keys', () => {
      const catalogId = 'cat-123';
      void helpers.invalidateCatalogScopedData(queryClient, catalogId);

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.products.metadata.categories(catalogId),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.products.metadata.tags(catalogId),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.products.metadata.parameters(catalogId),
      });
    });
  });

  describe('Notes', () => {
    it('invalidateNoteThemes should invalidate note themes', () => {
      const notebookId = 'nb-123';
      void helpers.invalidateNoteThemes(queryClient, notebookId);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.notes.themes(),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.notes.themes(notebookId),
      });
    });

    it('invalidateNoteTags should invalidate note tags', () => {
      const notebookId = 'nb-123';
      void helpers.invalidateNoteTags(queryClient, notebookId);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.notes.tags(),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.notes.tags(notebookId),
      });
    });
  });

  describe('Chatbot', () => {
    it('invalidateChatbotSessions should invalidate chatbot sessions list', () => {
      void helpers.invalidateChatbotSessions(queryClient);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.ai.chatbot.sessions(),
      });
    });

    it('invalidateChatbotSession should invalidate specific session', () => {
      const sessionId = 'sess-123';
      void helpers.invalidateChatbotSession(queryClient, sessionId);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.ai.chatbot.session(sessionId),
      });
    });
  });

  describe('Integrations', () => {
    it('invalidateIntegrations should invalidate integrations all key', () => {
      void helpers.invalidateIntegrations(queryClient);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.all,
      });
    });

    it('invalidateIntegrationConnections should invalidate connections list and specific integration if provided', () => {
      const integrationId = 'int-123';
      void helpers.invalidateIntegrationConnections(queryClient, integrationId);

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.connections(),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.connections(integrationId),
      });
    });
  });

  describe('CMS', () => {
    it('invalidateCmsPages should invalidate cms pages all key', () => {
      void helpers.invalidateCmsPages(queryClient);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.cms.pages.all,
      });
    });
  });

  describe('AI Paths Queue Warmup', () => {
    it('optimistically prepends queued run into matching all-runs cache', () => {
      const queryKey = QUERY_KEYS.ai.aiPaths.jobQueue({
        status: 'all',
        page: 1,
        pageSize: 25,
      });
      queryClient.setQueryData(queryKey, {
        runs: [createRun({ id: 'run-existing' })],
        total: 1,
      });

      helpers.optimisticallyInsertAiPathRunInQueueCache(
        queryClient,
        createRun({ id: 'run-new', status: 'queued' })
      );

      const data = queryClient.getQueryData<{ runs: Array<{ id: string }>; total: number }>(
        queryKey
      );
      expect(data?.total).toBe(2);
      expect(data?.runs[0]?.id).toBe('run-new');
      expect(data?.runs[1]?.id).toBe('run-existing');
    });

    it('optimistically prepends queued run into matching global queue cache', () => {
      const queryKey = QUERY_KEYS.ai.aiPaths.jobQueue({
        visibility: 'global',
        status: 'all',
        page: 1,
        pageSize: 25,
      });
      queryClient.setQueryData(queryKey, {
        runs: [createRun({ id: 'run-existing' })],
        total: 1,
      });

      helpers.optimisticallyInsertAiPathRunInQueueCache(
        queryClient,
        createRun({ id: 'run-global', status: 'queued' })
      );

      const data = queryClient.getQueryData<{ runs: Array<{ id: string }>; total: number }>(
        queryKey
      );
      expect(data?.total).toBe(2);
      expect(data?.runs[0]?.id).toBe('run-global');
    });

    it('does not add queued run into completed-only cache', () => {
      const queryKey = QUERY_KEYS.ai.aiPaths.jobQueue({
        status: 'completed',
        page: 1,
        pageSize: 25,
      });
      queryClient.setQueryData(queryKey, {
        runs: [createRun({ id: 'run-completed', status: 'completed' })],
        total: 1,
      });

      helpers.optimisticallyInsertAiPathRunInQueueCache(
        queryClient,
        createRun({ id: 'run-new', status: 'queued' })
      );

      const data = queryClient.getQueryData<{ runs: Array<{ id: string }>; total: number }>(
        queryKey
      );
      expect(data?.total).toBe(1);
      expect(data?.runs).toHaveLength(1);
      expect(data?.runs[0]?.id).toBe('run-completed');
    });

    it('adds run to ai_paths_ui source-filtered queue when source is canonical string', () => {
      const queryKey = QUERY_KEYS.ai.aiPaths.jobQueue({
        status: 'all',
        source: 'ai_paths_ui',
        sourceMode: 'include',
        page: 1,
        pageSize: 25,
      });
      queryClient.setQueryData(queryKey, {
        runs: [createRun({ id: 'run-existing' })],
        total: 1,
      });

      helpers.optimisticallyInsertAiPathRunInQueueCache(
        queryClient,
        createRun({
          id: 'run-canonical-source',
          status: 'queued',
          meta: { source: 'trigger_button' },
        })
      );

      const data = queryClient.getQueryData<{ runs: Array<{ id: string }>; total: number }>(
        queryKey
      );
      expect(data?.total).toBe(2);
      expect(data?.runs[0]?.id).toBe('run-canonical-source');
    });

    it('does not add run to ai_paths_ui source-filtered queue when source uses removed object metadata', () => {
      const queryKey = QUERY_KEYS.ai.aiPaths.jobQueue({
        status: 'all',
        source: 'ai_paths_ui',
        sourceMode: 'include',
        page: 1,
        pageSize: 25,
      });
      queryClient.setQueryData(queryKey, {
        runs: [createRun({ id: 'run-existing' })],
        total: 1,
      });

      helpers.optimisticallyInsertAiPathRunInQueueCache(
        queryClient,
        createRun({
          id: 'run-legacy-object-source',
          status: 'queued',
          meta: { source: { tab: 'product' } },
        })
      );

      const data = queryClient.getQueryData<{ runs: Array<{ id: string }>; total: number }>(
        queryKey
      );
      expect(data?.total).toBe(1);
      expect(data?.runs).toHaveLength(1);
      expect(data?.runs[0]?.id).toBe('run-existing');
    });

    it('emits run-enqueued browser event', () => {
      const listener = vi.fn();
      window.addEventListener('ai-path-run-enqueued', listener as EventListener);

      helpers.notifyAiPathRunEnqueued('run-123');

      expect(listener).toHaveBeenCalled();
      window.removeEventListener('ai-path-run-enqueued', listener as EventListener);
    });

    it('invalidates queue and queue-status using prefix keys', async () => {
      await helpers.invalidateAiPathQueue(queryClient);

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [...QUERY_KEYS.ai.aiPaths.lists(), 'job-queue'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [...QUERY_KEYS.ai.aiPaths.all, 'queue-status'],
      });
    });
  });
});
