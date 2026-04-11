/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

import { MockListPanel } from '@/__tests__/mocks/MockListPanel';

vi.mock('@/shared/ui/list-panel', () => ({

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
  ListPanel: MockListPanel,
  LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
}));

import { KangurSocialPipelineQueuePanel } from './KangurSocialPipelineQueuePanel';

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

  it('defers the compact queue status bootstrap until after the initial mount', async () => {
    vi.useFakeTimers();
    apiGetMock.mockResolvedValueOnce({
      deliveryMode: 'queue',
      workerState: 'idle',
      redisAvailable: true,
      workerLocal: false,
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

    try {
      render(<KangurSocialPipelineQueuePanel variant='compact' />);

      expect(apiGetMock).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
        await Promise.resolve();
      });

      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/status', {
        timeout: 60_000,
      });
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it('hides run now while the full queue panel already has active pipeline work', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        deliveryMode: 'queue',
        workerState: 'running',
        redisAvailable: true,
        workerLocal: false,
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
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/status', {
        timeout: 60_000,
      });
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs', {
        timeout: 60_000,
      });
    });

    expect(screen.queryByRole('button', { name: 'Run capture queue now' })).toBeNull();
  });

  it('keeps run now visible in compact mode when the queue is only waiting', async () => {
    apiGetMock.mockResolvedValueOnce({
      deliveryMode: 'queue',
      workerState: 'idle',
      redisAvailable: true,
      workerLocal: false,
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
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/status', {
        timeout: 60_000,
      });
    });

    expect(apiGetMock).not.toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs', {
      timeout: 60_000,
    });
    expect(screen.getByRole('button', { name: 'Run capture queue now' })).toBeInTheDocument();
  });

  it('shows explicit disabled titles while triggering and deleting queue actions', async () => {
    const triggerDeferred = createDeferred<Record<string, never>>();
    const deleteDeferred = createDeferred<{ success: boolean }>();
    apiPostMock.mockReturnValueOnce(triggerDeferred.promise);
    apiDeleteMock.mockReturnValueOnce(deleteDeferred.promise);
    apiGetMock
      .mockResolvedValueOnce({
        deliveryMode: 'queue',
        workerState: 'idle',
        redisAvailable: true,
        workerLocal: true,
        running: true,
        healthy: true,
        processing: false,
        activeCount: 0,
        waitingCount: 0,
        failedCount: 0,
        completedCount: 1,
        lastPollTime: 0,
        timeSinceLastPoll: 0,
        isPaused: false,
      })
      .mockResolvedValueOnce([
        {
          id: 'job-completed',
          status: 'completed',
          data: {
            type: 'manual-post-pipeline',
            input: {
              postId: 'post-42',
            },
          },
          progress: null,
          result: {
            type: 'manual-post-pipeline',
            postId: 'post-42',
            addonsCreated: 1,
            failures: 0,
          },
          failedReason: null,
          processedOn: null,
          finishedOn: null,
          timestamp: Date.now(),
          duration: 1_000,
        },
      ])
      .mockResolvedValueOnce({
        deliveryMode: 'queue',
        workerState: 'idle',
        redisAvailable: true,
        workerLocal: true,
        running: true,
        healthy: true,
        processing: false,
        activeCount: 0,
        waitingCount: 0,
        failedCount: 0,
        completedCount: 1,
        lastPollTime: 0,
        timeSinceLastPoll: 0,
        isPaused: false,
      })
      .mockResolvedValueOnce([
        {
          id: 'job-completed',
          status: 'completed',
          data: {
            type: 'manual-post-pipeline',
            input: {
              postId: 'post-42',
            },
          },
          progress: null,
          result: {
            type: 'manual-post-pipeline',
            postId: 'post-42',
            addonsCreated: 1,
            failures: 0,
          },
          failedReason: null,
          processedOn: null,
          finishedOn: null,
          timestamp: Date.now(),
          duration: 1_000,
        },
      ]);

    render(<KangurSocialPipelineQueuePanel />);

    const runCaptureButton = await screen.findByRole('button', { name: 'Run capture queue now' });
    const deleteButton = await screen.findByRole('button', {
      name: 'Delete pipeline job job-completed',
    });

    fireEvent.click(runCaptureButton);
    fireEvent.click(deleteButton);

    expect(screen.getByRole('button', { name: 'Run capture queue now' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Run capture queue now' })).toHaveAttribute(
      'title',
      'Capture queue trigger is already in progress.'
    );
    expect(screen.getByRole('button', { name: 'Delete pipeline job job-completed' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete pipeline job job-completed' })).toHaveAttribute(
      'title',
      'Deleting queue job job-completed...'
    );

    await act(async () => {
      triggerDeferred.resolve({});
      deleteDeferred.resolve({ success: true });
      await Promise.all([triggerDeferred.promise, deleteDeferred.promise]);
    });
  });

  it('keeps run now visible when the worker is offline but a stale active job is still reported', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        deliveryMode: 'queue',
        workerState: 'offline',
        redisAvailable: true,
        workerLocal: false,
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
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/status', {
        timeout: 60_000,
      });
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs', {
        timeout: 60_000,
      });
    });

    expect(screen.getByRole('button', { name: 'Run capture queue now' })).toBeInTheDocument();
  });

  it('shows delete for terminal jobs, hides it for active jobs, and refreshes after delete', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        deliveryMode: 'queue',
        workerState: 'idle',
        redisAvailable: true,
        workerLocal: true,
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
          data: {
            type: 'manual-post-pipeline',
            input: {
              postId: 'post-42',
            },
          },
          progress: {
            captureMode: 'fresh_capture',
            requestedPresetCount: 3,
            usedPresetCount: 2,
          },
          result: {
            type: 'manual-post-pipeline',
            postId: 'post-42',
            captureMode: 'fresh_capture',
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
          data: {
            type: 'manual-post-pipeline',
            input: {
              postId: 'post-43',
            },
          },
          progress: {
            captureMode: 'fresh_capture',
            captureCompletedCount: 1,
            captureRemainingCount: 2,
            captureTotalCount: 3,
            captureFailureCount: 1,
          },
          result: null,
          failedReason: null,
          processedOn: null,
          finishedOn: null,
          timestamp: Date.now() - 1_000,
          duration: null,
        },
      ])
      .mockResolvedValueOnce({
        deliveryMode: 'queue',
        workerState: 'idle',
        redisAvailable: true,
        workerLocal: true,
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
    expect(screen.getAllByText('Full pipeline')).toHaveLength(2);
    expect(screen.getByText('Post post-42')).toBeInTheDocument();
    expect(screen.getAllByText('Fresh Playwright capture')).toHaveLength(2);
    expect(screen.getByText('2/3 presets used')).toBeInTheDocument();
    expect(screen.getByText('1 captured / 2 left')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete pipeline job job-completed' }));

    await waitFor(() => {
      expect(apiDeleteMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs', {
        params: { id: 'job-completed' },
        timeout: 60_000,
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Delete pipeline job job-completed' })).toBeNull();
    });
  });

  it('shows dedicated metadata for manual image-analysis and generation jobs', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        deliveryMode: 'queue',
        workerState: 'idle',
        redisAvailable: true,
        workerLocal: true,
        running: true,
        healthy: true,
        processing: false,
        activeCount: 0,
        waitingCount: 0,
        failedCount: 0,
        completedCount: 2,
        lastPollTime: 0,
        timeSinceLastPoll: 0,
        isPaused: false,
      })
      .mockResolvedValueOnce([
        {
          id: 'job-analysis',
          status: 'completed',
          data: {
            type: 'manual-post-visual-analysis',
            input: {
              postId: 'post-44',
              imageAddonCount: 3,
            },
          },
          progress: {
            imageAddonCount: 3,
            highlightCount: 2,
          },
          result: {
            type: 'manual-post-visual-analysis',
            postId: 'post-44',
            imageAddonCount: 3,
            highlightCount: 2,
          },
          failedReason: null,
          processedOn: null,
          finishedOn: null,
          timestamp: Date.now(),
          duration: 900,
        },
        {
          id: 'job-generation',
          status: 'completed',
          data: {
            type: 'manual-post-generation',
            input: {
              postId: 'post-45',
              docReferenceCount: 4,
              imageAddonCount: 2,
              usesVisualAnalysisContext: true,
            },
          },
          progress: {
            docReferenceCount: 4,
            imageAddonCount: 2,
            visualSummaryPresent: true,
            highlightCount: 1,
          },
          result: {
            type: 'manual-post-generation',
            postId: 'post-45',
            imageAddonCount: 2,
            saved: true,
          },
          failedReason: null,
          processedOn: null,
          finishedOn: null,
          timestamp: Date.now() - 1_000,
          duration: 1_100,
        },
      ]);

    render(<KangurSocialPipelineQueuePanel />);

    expect(await screen.findByText('Image analysis')).toBeInTheDocument();
    expect(screen.getByText('Generate post')).toBeInTheDocument();
    expect(screen.getByText('Post post-44')).toBeInTheDocument();
    expect(screen.getByText('3 visuals')).toBeInTheDocument();
    expect(screen.getByText('2 highlights')).toBeInTheDocument();
    expect(screen.getByText('Post post-45')).toBeInTheDocument();
    expect(screen.getByText('4 docs')).toBeInTheDocument();
    expect(screen.getByText('2 visuals')).toBeInTheDocument();
    expect(screen.getByText('Uses image-analysis context')).toBeInTheDocument();
    expect(screen.getByText('Saved to post')).toBeInTheDocument();
  });

  it('shows the active process name in the runtime queue header instead of only a generic running state', async () => {
    apiGetMock.mockResolvedValueOnce({
      deliveryMode: 'queue',
      workerState: 'running',
      redisAvailable: true,
      workerLocal: false,
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
      activeProcessSummary: {
        label: 'Image analysis',
        additionalRunningCount: 0,
      },
    });

    render(<KangurSocialPipelineQueuePanel variant='compact' />);

    expect(await screen.findByText('Active process: Image analysis')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(apiGetMock).not.toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs', {
      timeout: 60_000,
    });
  });

  it('shows idle queue state without the redis warning when recent jobs exist', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        deliveryMode: 'queue',
        workerState: 'idle',
        redisAvailable: true,
        workerLocal: false,
        running: false,
        healthy: true,
        processing: false,
        activeCount: 0,
        waitingCount: 0,
        failedCount: 0,
        completedCount: 5,
        lastPollTime: 0,
        timeSinceLastPoll: 0,
        isPaused: false,
      })
      .mockResolvedValueOnce([]);

    render(<KangurSocialPipelineQueuePanel />);

    expect(await screen.findByText('Idle')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Capture queue worker is not running. Ensure Redis is available and REDIS_URL is configured.'
      )
    ).toBeNull();
  });

  it('shows a dedicated redis warning when Redis is configured but unreachable', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        deliveryMode: 'queue',
        workerState: 'offline',
        statusReason: 'redis_unreachable',
        redisAvailable: false,
        workerLocal: false,
        running: false,
        healthy: false,
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

    expect(await screen.findByText('Redis Down')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Capture queue cannot reach Redis. Verify the Redis service is online and the REDIS_URL connection settings are correct.'
      )
    ).toBeInTheDocument();
  });

  it('shows shared worker heartbeat timing for cross-instance idle workers', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        deliveryMode: 'queue',
        workerState: 'idle',
        redisAvailable: true,
        workerLocal: false,
        workerHeartbeatTime: Date.now() - 10_000,
        timeSinceWorkerHeartbeat: 10_000,
        running: false,
        healthy: true,
        processing: false,
        activeCount: 0,
        waitingCount: 0,
        failedCount: 0,
        completedCount: 2,
        lastPollTime: 0,
        timeSinceLastPoll: 0,
        isPaused: false,
      })
      .mockResolvedValueOnce([]);

    render(<KangurSocialPipelineQueuePanel />);

    expect(await screen.findByText('Worker heartbeat: 10s ago')).toBeInTheDocument();
  });
});
