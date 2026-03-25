import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCancelListingMutation,
  useChatbotJobMutation,
  useClearChatbotJobsMutation,
} from '@/shared/lib/jobs/hooks/useJobMutations';
import { jobKeys } from '@/shared/lib/jobs/hooks/useJobQueries';

const createCreateMutationV2Mock = vi.hoisted(() => vi.fn());
const createDeleteMutationV2Mock = vi.hoisted(() => vi.fn());
const updateChatbotJobMock = vi.hoisted(() => vi.fn());
const clearChatbotJobsMock = vi.hoisted(() => vi.fn());
const cancelListingMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createCreateMutationV2: createCreateMutationV2Mock,
  createDeleteMutationV2: createDeleteMutationV2Mock,
}));

vi.mock('@/shared/lib/jobs/api', () => ({
  updateChatbotJob: updateChatbotJobMock,
  clearChatbotJobs: clearChatbotJobsMock,
  cancelListing: cancelListingMock,
}));

describe('useJobMutations', () => {
  beforeEach(() => {
    createCreateMutationV2Mock.mockReset();
    createDeleteMutationV2Mock.mockReset();
    updateChatbotJobMock.mockReset();
    clearChatbotJobsMock.mockReset();
    cancelListingMock.mockReset();

    createCreateMutationV2Mock.mockReturnValue({ kind: 'create-mutation' });
    createDeleteMutationV2Mock.mockReturnValue({ kind: 'delete-mutation' });
    updateChatbotJobMock.mockResolvedValue({ ok: true });
    clearChatbotJobsMock.mockResolvedValue({ ok: true });
    cancelListingMock.mockResolvedValue(undefined);
  });

  it('builds the chatbot action mutation with the expected metadata and error transform', async () => {
    const { result } = renderHook(() => useChatbotJobMutation());
    const config = createCreateMutationV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'create-mutation' });
    expect(config.mutationKey).toEqual(jobKeys.all);
    expect(config.invalidateKeys).toEqual([jobKeys.all]);
    expect(config.meta).toEqual(
      expect.objectContaining({
        source: 'jobs.hooks.useChatbotJobMutation',
        operation: 'create',
        resource: 'jobs.chatbot.action',
        domain: 'jobs',
        tags: ['jobs', 'chatbot', 'action'],
      })
    );

    await expect(config.mutationFn({ jobId: 'job-1', action: 'retry' })).resolves.toEqual({ ok: true });
    expect(updateChatbotJobMock).toHaveBeenCalledWith('job-1', 'retry');

    const knownError = new Error('known');
    expect(config.transformError(knownError)).toBe(knownError);
    expect(config.transformError('boom').message).toBe(
      'Failed to perform chatbot job action. Please try again.'
    );
  });

  it('builds clear and cancel delete mutations with the expected targets', async () => {
    const clearResult = renderHook(() => useClearChatbotJobsMutation());
    const clearConfig = createDeleteMutationV2Mock.mock.calls[0]?.[0];

    expect(clearResult.result.current).toEqual({ kind: 'delete-mutation' });
    expect(clearConfig.mutationKey).toEqual(jobKeys.all);
    expect(clearConfig.invalidateKeys).toEqual([jobKeys.all]);
    expect(clearConfig.meta).toEqual(
      expect.objectContaining({
        source: 'jobs.hooks.useClearChatbotJobsMutation',
        resource: 'jobs.chatbot.clear',
      })
    );
    await expect(clearConfig.mutationFn({ scope: 'completed' })).resolves.toBeUndefined();
    expect(clearChatbotJobsMock).toHaveBeenCalledWith('completed');
    expect(clearConfig.transformError('boom').message).toBe(
      'Failed to clear chatbot jobs. Please try again.'
    );

    const cancelResult = renderHook(() => useCancelListingMutation());
    const cancelConfig = createDeleteMutationV2Mock.mock.calls[1]?.[0];

    expect(cancelResult.result.current).toEqual({ kind: 'delete-mutation' });
    expect(cancelConfig.mutationKey).toEqual(jobKeys.integrations());
    expect(cancelConfig.invalidateKeys).toEqual([jobKeys.integrations()]);
    expect(cancelConfig.meta).toEqual(
      expect.objectContaining({
        source: 'jobs.hooks.useCancelListingMutation',
        resource: 'jobs.integrations.listing',
      })
    );
    await expect(cancelConfig.mutationFn({ productId: 'prod-1', listingId: 'listing-1' })).resolves.toBeUndefined();
    expect(cancelListingMock).toHaveBeenCalledWith('prod-1', 'listing-1');
    expect(cancelConfig.transformError('boom').message).toBe(
      'Failed to cancel listing. Please try again.'
    );
  });
});
