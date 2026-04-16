/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchPlaywrightRunMock } = vi.hoisted(() => ({
  fetchPlaywrightRunMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api/client/agent', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/api/client/agent')
  >('@/shared/lib/ai-paths/api/client/agent');
  return {
    ...actual,
    fetchPlaywrightRun: (...args: unknown[]) => fetchPlaywrightRunMock(...args),
  };
});

import { useTraderaLiveExecution } from './useTraderaLiveExecution';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

const buildListing = (
  pendingExecution:
    | {
        action: 'list' | 'relist' | 'sync' | 'check_status';
        runId: string;
      }
    | null
) =>
  ({
    id: 'listing-1',
    integration: {
      id: 'integration-tradera',
      name: 'Tradera',
      slug: 'tradera',
    },
    marketplaceData: pendingExecution
      ? {
          tradera: {
            pendingExecution,
          },
        }
      : {
          tradera: {},
        },
  }) as never;

describe('useTraderaLiveExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPlaywrightRunMock.mockResolvedValue({ ok: false });
  });

  it('stays idle when the listing has no active Tradera run id', () => {
    const { result } = renderHook(() => useTraderaLiveExecution(buildListing(null)), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeNull();
    expect(fetchPlaywrightRunMock).not.toHaveBeenCalled();
  });

  it('prefers live emitted steps from the active Playwright run', async () => {
    fetchPlaywrightRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          runId: 'run-live-123',
          status: 'running',
          result: {
            finalUrl: 'https://www.tradera.com/en/selling/draft/live',
            outputs: {
              metadata: {
                selectorProfileRequested: 'profile-market-a',
                selectorProfileResolved: 'profile-market-b',
              },
              steps: [
                {
                  id: 'image_upload',
                  label: 'Upload listing images',
                  status: 'running',
                  message: 'Uploading listing images.',
                },
              ],
              result: {
                stage: 'image_upload',
                currentUrl: 'https://www.tradera.com/en/selling/draft/live',
              },
            },
          },
          logs: ['[user] tradera.quicklist.image.upload.start'],
        },
      },
    });

    const { result } = renderHook(
      () =>
        useTraderaLiveExecution(
          buildListing({
            action: 'relist',
            runId: 'run-live-123',
          })
        ),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current?.runId).toBe('run-live-123');
    });

    expect(fetchPlaywrightRunMock).toHaveBeenCalledWith('run-live-123');
    expect(result.current?.action).toBe('relist');
    expect(result.current?.status).toBe('running');
    expect(result.current?.latestStage).toBe('image_upload');
    expect(result.current?.latestStageUrl).toBe(
      'https://www.tradera.com/en/selling/draft/live'
    );
    expect(result.current?.requestedSelectorProfile).toBe('profile-market-a');
    expect(result.current?.resolvedSelectorProfile).toBe('profile-market-b');
    expect(result.current?.executionSteps).toEqual([
      {
        id: 'image_upload',
        label: 'Upload listing images',
        status: 'running',
        message: 'Uploading listing images.',
      },
    ]);
    expect(result.current?.logTail).toEqual([
      '[user] tradera.quicklist.image.upload.start',
    ]);
  });

  it('falls back to Tradera raw-result execution steps for live status checks', async () => {
    fetchPlaywrightRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          runId: 'run-check-123',
          status: 'completed',
          result: {
            outputs: {
              result: {
                stage: 'closed',
                executionSteps: [
                  {
                    id: 'status_lookup',
                    label: 'Locate Tradera listing',
                    status: 'success',
                    message: 'Matched the listing in Unsold.',
                  },
                ],
              },
            },
          },
          logs: [],
        },
      },
    });

    const { result } = renderHook(
      () =>
        useTraderaLiveExecution(
          buildListing({
            action: 'check_status',
            runId: 'run-check-123',
          })
        ),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current?.status).toBe('completed');
    });

    expect(fetchPlaywrightRunMock).toHaveBeenCalledWith('run-check-123');
    expect(result.current?.action).toBe('check_status');
    expect(result.current?.latestStage).toBe('closed');
    expect(result.current?.requestedSelectorProfile).toBeNull();
    expect(result.current?.resolvedSelectorProfile).toBeNull();
    expect(result.current?.executionSteps).toEqual([
      {
        id: 'status_lookup',
        label: 'Locate Tradera listing',
        status: 'success',
        message: 'Matched the listing in Unsold.',
      },
    ]);
  });

  it('reconstructs exact-title duplicate-ignore steps from a live quicklist run when emitted steps are absent', async () => {
    fetchPlaywrightRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          runId: 'run-live-duplicate-123',
          status: 'running',
          result: {
            finalUrl: 'https://www.tradera.com/en/my/active',
            outputs: {
              result: {
                stage: 'duplicate_checked',
                duplicateIgnoredNonExactCandidateCount: 5,
                duplicateIgnoredCandidateTitles: [
                  'Katanas',
                  'Katana Sword',
                  'Japanese Blades',
                  'Wooden Katana',
                  'Samurai Replica',
                ],
                currentUrl: 'https://www.tradera.com/en/my/active',
              },
            },
          },
          logs: [
            '[user] tradera.quicklist.start {"listingAction":"list"}',
            '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
            '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
          ],
          error: null,
        },
      },
    });

    const { result } = renderHook(
      () =>
        useTraderaLiveExecution(
          buildListing({
            action: 'list',
            runId: 'run-live-duplicate-123',
          })
        ),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current?.runId).toBe('run-live-duplicate-123');
    });

    expect(result.current?.action).toBe('list');
    expect(result.current?.status).toBe('running');
    expect(result.current?.latestStage).toBe('duplicate_checked');
    expect(result.current?.latestStageUrl).toBe('https://www.tradera.com/en/my/active');
    expect(result.current?.executionSteps.find((step) => step.id === 'duplicate_check')).toEqual({
      id: 'duplicate_check',
      label: 'Search for duplicate listings',
      status: 'success',
      message:
        'Duplicate search ignored 5 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword, Japanese Blades, +2 more.',
    });
    expect(
      result.current?.executionSteps.find((step) => step.id === 'deep_duplicate_check')
    ).toEqual({
      id: 'deep_duplicate_check',
      label: 'Inspect duplicate candidates',
      status: 'skipped',
      message: 'Skipped because only non-exact title matches were found.',
    });
  });
});
