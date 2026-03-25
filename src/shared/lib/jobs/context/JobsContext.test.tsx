import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobsProvider, useJobsActions, useJobsState } from '@/shared/lib/jobs/context/JobsContext';

const useConfirmMock = vi.hoisted(() => vi.fn());
const useIntegrationJobsMock = vi.hoisted(() => vi.fn());
const useChatbotJobsMock = vi.hoisted(() => vi.fn());
const useTraderaQueueHealthMock = vi.hoisted(() => vi.fn());
const useCancelListingMutationMock = vi.hoisted(() => vi.fn());
const useChatbotJobMutationMock = vi.hoisted(() => vi.fn());
const useClearChatbotJobsMutationMock = vi.hoisted(() => vi.fn());
const logClientCatchMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: useConfirmMock,
}));

vi.mock('@/shared/lib/jobs/hooks/useJobQueries', () => ({
  useIntegrationJobs: useIntegrationJobsMock,
  useChatbotJobs: useChatbotJobsMock,
  useTraderaQueueHealth: useTraderaQueueHealthMock,
}));

vi.mock('@/shared/lib/jobs/hooks/useJobMutations', () => ({
  useCancelListingMutation: useCancelListingMutationMock,
  useChatbotJobMutation: useChatbotJobMutationMock,
  useClearChatbotJobsMutation: useClearChatbotJobsMutationMock,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: logClientCatchMock,
}));

describe('JobsContext', () => {
  const listingRefetchMock = vi.fn();
  const chatbotRefetchMock = vi.fn();
  const cancelListingMutateAsyncMock = vi.fn();
  const chatbotMutateAsyncMock = vi.fn();
  const clearChatbotMutateMock = vi.fn();
  const confirmMock = vi.fn();
  const confirmationModalMock = vi.fn(() => <div data-testid='confirmation-modal'>confirm</div>);

  const listingJob = {
    productId: 'prod-1',
    productName: 'Alpha Product',
    productSku: 'SKU-1',
    listings: [
      {
        id: 'listing-1',
      },
    ],
  };

  beforeEach(() => {
    listingRefetchMock.mockReset();
    chatbotRefetchMock.mockReset();
    cancelListingMutateAsyncMock.mockReset();
    chatbotMutateAsyncMock.mockReset();
    clearChatbotMutateMock.mockReset();
    confirmMock.mockReset();
    confirmationModalMock.mockClear();
    useConfirmMock.mockReset();
    useIntegrationJobsMock.mockReset();
    useChatbotJobsMock.mockReset();
    useTraderaQueueHealthMock.mockReset();
    useCancelListingMutationMock.mockReset();
    useChatbotJobMutationMock.mockReset();
    useClearChatbotJobsMutationMock.mockReset();
    logClientCatchMock.mockReset();

    listingRefetchMock.mockResolvedValue(undefined);
    chatbotRefetchMock.mockResolvedValue(undefined);
    cancelListingMutateAsyncMock.mockResolvedValue(undefined);
    chatbotMutateAsyncMock.mockResolvedValue(undefined);
    useConfirmMock.mockReturnValue({
      confirm: confirmMock,
      ConfirmationModal: confirmationModalMock,
    });
    useIntegrationJobsMock.mockReturnValue({
      data: [listingJob],
      isLoading: false,
      isFetching: true,
      error: null,
      refetch: listingRefetchMock,
    });
    useChatbotJobsMock.mockReturnValue({
      data: { jobs: [{ id: 'chatbot-1' }] },
      isLoading: false,
      isFetching: false,
      error: new Error('chatbot failed'),
      refetch: chatbotRefetchMock,
    });
    useTraderaQueueHealthMock.mockReturnValue({
      data: { mode: 'bullmq', redisAvailable: true },
      isLoading: true,
    });
    useCancelListingMutationMock.mockReturnValue({
      mutateAsync: cancelListingMutateAsyncMock,
      isPending: true,
      variables: { listingId: 'listing-1' },
    });
    useChatbotJobMutationMock.mockReturnValue({
      mutateAsync: chatbotMutateAsyncMock,
      isPending: true,
      variables: { jobId: 'chatbot-1' },
    });
    useClearChatbotJobsMutationMock.mockReturnValue({
      mutate: clearChatbotMutateMock,
      isPending: true,
    });
  });

  it('exposes query state, query data, and imperative actions from the provider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <JobsProvider>{children}</JobsProvider>
    );
    const { result } = renderHook(
      () => ({
        actions: useJobsActions(),
        state: useJobsState(),
      }),
      { wrapper }
    );

    expect(result.current.state.listingJobs).toEqual([listingJob]);
    expect(result.current.state.listingJobsRefreshing).toBe(true);
    expect(result.current.state.listingJobsLoading).toBe(false);
    expect(result.current.state.traderaQueueHealth).toEqual({ mode: 'bullmq', redisAvailable: true });
    expect(result.current.state.traderaQueueHealthLoading).toBe(true);
    expect(result.current.state.chatbotJobs).toEqual([{ id: 'chatbot-1' }]);
    expect(result.current.state.chatbotJobsError).toEqual(expect.any(Error));
    expect(result.current.state.chatbotJobsRefreshing).toBe(false);
    expect(result.current.state.isClearingChatbotJobs).toBe(true);
    expect(result.current.state.query).toBe('');
    expect(result.current.state.page).toBe(1);
    expect(result.current.state.pageSize).toBe(25);
    expect(result.current.state.selectedListing).toBeNull();

    act(() => {
      result.current.actions.setQuery('search');
      result.current.actions.setPage(3);
      result.current.actions.setPageSize(50);
      result.current.actions.setSelectedListing({
        job: listingJob as never,
        listing: listingJob.listings[0] as never,
      });
      result.current.actions.handleClearCompletedChatbotJobs();
    });

    await act(async () => {
      await result.current.actions.refetchListingJobs();
      await result.current.actions.refetchChatbotJobs();
      await result.current.actions.handleCancelListing('prod-1', 'listing-1');
      await result.current.actions.handleCancelChatbotJob('chatbot-1');
    });

    expect(result.current.state.query).toBe('search');
    expect(result.current.state.page).toBe(3);
    expect(result.current.state.pageSize).toBe(50);
    expect(result.current.state.selectedListing).toEqual({
      job: listingJob,
      listing: listingJob.listings[0],
    });

    expect(listingRefetchMock).toHaveBeenCalledTimes(1);
    expect(chatbotRefetchMock).toHaveBeenCalledTimes(1);
    expect(cancelListingMutateAsyncMock).toHaveBeenCalledWith({
      productId: 'prod-1',
      listingId: 'listing-1',
    });
    expect(chatbotMutateAsyncMock).toHaveBeenCalledWith({
      jobId: 'chatbot-1',
      action: 'cancel',
    });
    expect(clearChatbotMutateMock).toHaveBeenCalledWith({ scope: 'completed' });
    expect(result.current.actions.isCancellingListing('listing-1')).toBe(true);
    expect(result.current.actions.isCancellingListing('listing-2')).toBe(false);
    expect(result.current.actions.isCancellingChatbotJob('chatbot-1')).toBe(true);
    expect(result.current.actions.isCancellingChatbotJob('chatbot-2')).toBe(false);

    render(<result.current.actions.ConfirmationModal />);
    expect(screen.getByTestId('confirmation-modal')).toHaveTextContent('confirm');
  });

  it('routes confirmation and mutation failures through logging helpers', async () => {
    const cancelError = new Error('cancel failed');
    const chatbotError = new Error('chatbot cancel failed');

    cancelListingMutateAsyncMock.mockRejectedValue(cancelError);
    chatbotMutateAsyncMock.mockRejectedValue(chatbotError);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <JobsProvider>{children}</JobsProvider>
    );
    const { result } = renderHook(
      () => ({
        actions: useJobsActions(),
      }),
      { wrapper }
    );

    result.current.actions.confirmCancelListing('prod-2', 'listing-9');

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cancel Listing?',
        message: 'Cancel this listing job? This will remove it from the queue.',
        confirmText: 'Cancel Job',
        isDangerous: true,
      })
    );

    const confirmConfig = confirmMock.mock.calls[0]?.[0];

    await act(async () => {
      await confirmConfig.onConfirm();
    });

    await waitFor(() => {
      expect(logClientCatchMock).toHaveBeenCalledWith(cancelError, {
        source: 'JobsContext',
        action: 'cancelListing',
        productId: 'prod-2',
        listingId: 'listing-9',
      });
    });

    await act(async () => {
      await result.current.actions.handleCancelChatbotJob('chatbot-9');
    });

    await waitFor(() => {
      expect(logClientCatchMock).toHaveBeenCalledWith(chatbotError, {
        source: 'JobsContext',
        action: 'cancelChatbotJob',
        jobId: 'chatbot-9',
      });
    });
  });
});
