/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

const {
  apiGetMock,
  apiPostMock,
  apiDeleteMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiDeleteMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
    delete: (...args: unknown[]) => apiDeleteMock(...args),
  },
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ListPanel: ({
    header,
    children,
  }: {
    header?: ReactNode;
    children: ReactNode;
  }) => (
    <section>
      <div>{header}</div>
      <div>{children}</div>
    </section>
  ),
  LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
}));

import { KangurSocialPipelineQueuePanel } from './KangurSocialPipelineQueuePanel';

describe('KangurSocialPipelineQueuePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiPostMock.mockResolvedValue({});
    apiDeleteMock.mockResolvedValue({ success: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hides run now while the full queue panel already has active pipeline work', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        running: true,
        healthy: true,
        processing: true,
        activeCount: 1,
        waitingCount: 0,
        failedCount: 0,
        completedCount: 4,
        lastPollTime: 0,
        timeSinceLastPoll: 0,
        isPaused: false,
      })
      .mockResolvedValueOnce([]);

    render(<KangurSocialPipelineQueuePanel />);

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/status');
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs');
    });

    expect(screen.queryByRole('button', { name: 'Run pipeline now' })).toBeNull();
  });

  it('keeps run now visible in compact mode when the queue is only waiting', async () => {
    apiGetMock.mockResolvedValueOnce({
      running: true,
      healthy: true,
      processing: false,
      activeCount: 0,
      waitingCount: 1,
      failedCount: 0,
      completedCount: 2,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
      isPaused: false,
    });

    render(<KangurSocialPipelineQueuePanel variant='compact' />);

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/status');
    });

    expect(screen.getByRole('button', { name: 'Run pipeline now' })).toBeInTheDocument();
  });

  it('keeps run now visible when the worker is offline but a stale active job is still reported', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        running: false,
        healthy: false,
        processing: true,
        activeCount: 1,
        waitingCount: 0,
        failedCount: 1,
        completedCount: 45,
        lastPollTime: 0,
        timeSinceLastPoll: 0,
        isPaused: false,
      })
      .mockResolvedValueOnce([]);

    render(<KangurSocialPipelineQueuePanel />);

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/status');
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs');
    });

    expect(screen.getByRole('button', { name: 'Run pipeline now' })).toBeInTheDocument();
  });

  it('shows delete for terminal jobs, hides it for active jobs, and refreshes after delete', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        running: true,
        healthy: true,
        processing: false,
        activeCount: 0,
        waitingCount: 0,
        failedCount: 1,
        completedCount: 1,
        lastPollTime: 0,
        timeSinceLastPoll: 0,
        isPaused: false,
      })
      .mockResolvedValueOnce([
        {
          id: 'job-completed',
          status: 'completed',
          data: null,
          result: {
            addonsCreated: 1,
            failures: 0,
          },
          failedReason: null,
          processedOn: null,
          finishedOn: null,
          timestamp: Date.now(),
          duration: 1_000,
        },
        {
          id: 'job-active',
          status: 'active',
          data: null,
          result: null,
          failedReason: null,
          processedOn: null,
          finishedOn: null,
          timestamp: Date.now() - 1_000,
          duration: null,
        },
      ])
      .mockResolvedValueOnce({
        running: true,
        healthy: true,
        processing: false,
        activeCount: 0,
        waitingCount: 0,
        failedCount: 0,
        completedCount: 0,
        lastPollTime: 0,
        timeSinceLastPoll: 0,
        isPaused: false,
      })
      .mockResolvedValueOnce([]);

    render(<KangurSocialPipelineQueuePanel />);

    expect(await screen.findByRole('button', { name: 'Delete pipeline job job-completed' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete pipeline job job-active' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Delete pipeline job job-completed' }));

    await waitFor(() => {
      expect(apiDeleteMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs', {
        params: { id: 'job-completed' },
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Delete pipeline job job-completed' })).toBeNull();
    });
  });
});
