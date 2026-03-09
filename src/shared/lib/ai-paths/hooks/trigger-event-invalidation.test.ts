// @vitest-environment jsdom

import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  invalidateAiPathQueueMock,
  notifyAiPathRunEnqueuedMock,
  invalidateProductsCountsAndDetailMock,
  invalidateProductsAndCountsMock,
  invalidateNotesMock,
  invalidateIntegrationJobsMock,
} = vi.hoisted(() => ({
  invalidateAiPathQueueMock: vi.fn(),
  notifyAiPathRunEnqueuedMock: vi.fn(),
  invalidateProductsCountsAndDetailMock: vi.fn(),
  invalidateProductsAndCountsMock: vi.fn(),
  invalidateNotesMock: vi.fn(),
  invalidateIntegrationJobsMock: vi.fn(),
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateAiPathQueue: (...args: unknown[]) => invalidateAiPathQueueMock(...args),
  notifyAiPathRunEnqueued: (...args: unknown[]) => notifyAiPathRunEnqueuedMock(...args),
  invalidateProductsCountsAndDetail: (...args: unknown[]) =>
    invalidateProductsCountsAndDetailMock(...args),
  invalidateProductsAndCounts: (...args: unknown[]) => invalidateProductsAndCountsMock(...args),
  invalidateNotes: (...args: unknown[]) => invalidateNotesMock(...args),
  invalidateIntegrationJobs: (...args: unknown[]) => invalidateIntegrationJobsMock(...args),
  invalidateAiPathSettings: vi.fn(),
}));

import { handleAiPathTriggerInvalidation } from './trigger-event-invalidation';

describe('handleAiPathTriggerInvalidation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    invalidateAiPathQueueMock.mockReset();
    notifyAiPathRunEnqueuedMock.mockReset();
    invalidateProductsCountsAndDetailMock.mockReset();
    invalidateProductsAndCountsMock.mockReset();
    invalidateNotesMock.mockReset();
    invalidateIntegrationJobsMock.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ── always-called ─────────────────────────────────────────────────────────

  it('always invalidates the AI path queue', async () => {
    await handleAiPathTriggerInvalidation({
      queryClient,
      runId: 'run-1',
      entityType: 'product',
      entityId: null,
    });
    expect(invalidateAiPathQueueMock).toHaveBeenCalledWith(queryClient);
  });

  it('always notifies the enqueued run event', async () => {
    await handleAiPathTriggerInvalidation({
      queryClient,
      runId: 'run-1',
      entityType: 'product',
      entityId: 'product-1',
    });
    expect(notifyAiPathRunEnqueuedMock).toHaveBeenCalledWith('run-1', {
      entityId: 'product-1',
      entityType: 'product',
      run: null,
    });
  });

  it('passes null entityId to notifyAiPathRunEnqueued when entityId is undefined', async () => {
    await handleAiPathTriggerInvalidation({
      queryClient,
      runId: 'run-2',
      entityType: 'product',
      entityId: undefined,
    });
    expect(notifyAiPathRunEnqueuedMock).toHaveBeenCalledWith('run-2', {
      entityId: null,
      entityType: 'product',
      run: null,
    });
  });

  // ── product entity routing ────────────────────────────────────────────────

  it('invalidates product counts+detail when entityType is product and entityId is set', async () => {
    await handleAiPathTriggerInvalidation({
      queryClient,
      runId: 'run-1',
      entityType: 'product',
      entityId: 'product-42',
    });
    expect(invalidateProductsCountsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-42');
    expect(invalidateProductsAndCountsMock).not.toHaveBeenCalled();
  });

  it('invalidates products+counts (broad) when entityType is product and entityId is null', async () => {
    await handleAiPathTriggerInvalidation({
      queryClient,
      runId: 'run-1',
      entityType: 'product',
      entityId: null,
    });
    expect(invalidateProductsAndCountsMock).toHaveBeenCalledWith(queryClient);
    expect(invalidateProductsCountsAndDetailMock).not.toHaveBeenCalled();
  });

  // ── note entity routing ───────────────────────────────────────────────────

  it('invalidates notes when entityType is note', async () => {
    await handleAiPathTriggerInvalidation({
      queryClient,
      runId: 'run-1',
      entityType: 'note',
      entityId: 'note-1',
    });
    expect(invalidateNotesMock).toHaveBeenCalledWith(queryClient);
    expect(invalidateProductsCountsAndDetailMock).not.toHaveBeenCalled();
    expect(invalidateProductsAndCountsMock).not.toHaveBeenCalled();
  });

  // ── custom entity — no extra invalidations ────────────────────────────────

  it('does not trigger entity-specific invalidations for custom entityType', async () => {
    await handleAiPathTriggerInvalidation({
      queryClient,
      runId: 'run-1',
      entityType: 'custom',
      entityId: 'custom-1',
    });
    expect(invalidateProductsCountsAndDetailMock).not.toHaveBeenCalled();
    expect(invalidateProductsAndCountsMock).not.toHaveBeenCalled();
    expect(invalidateNotesMock).not.toHaveBeenCalled();
    expect(invalidateIntegrationJobsMock).not.toHaveBeenCalled();
  });
});
