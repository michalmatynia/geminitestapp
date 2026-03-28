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

type ListPanelMockProps = {
  header?: ReactNode;
  children: ReactNode;
};

function MockListPanel(props: ListPanelMockProps): React.JSX.Element {
  const { header, children } = props;
  return (
    <section>
      <div>{header}</div>
      <div>{children}</div>
    </section>
  );
}

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
  ListPanel: MockListPanel,
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

    expect(screen.getByRole('button', { name: 'Run capture queue now' })).toBeInTheDocument();
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
          data: null,
          progress: null,
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
    expect(screen.getByText('Manual post draft pipeline')).toBeInTheDocument();
    expect(screen.getByText('Post post-42')).toBeInTheDocument();
    expect(screen.getByText('Fresh Playwright capture')).toBeInTheDocument();
    expect(screen.getByText('2/3 presets used')).toBeInTheDocument();

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
});
