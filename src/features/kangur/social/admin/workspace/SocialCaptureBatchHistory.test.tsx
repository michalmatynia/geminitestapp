/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/shared/ui', () => ({
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
  ),
}));

import { SocialCaptureBatchHistory } from './SocialCaptureBatchHistory';

describe('SocialCaptureBatchHistory', () => {
  it('renders the empty state when there are no jobs', () => {
    render(
      <SocialCaptureBatchHistory
        title='Recent preset capture runs'
        description='Durable history.'
        jobs={[]}
        emptyMessage='No recent preset capture runs yet.'
      />
    );

    expect(screen.getByText('Recent preset capture runs')).toBeInTheDocument();
    expect(screen.getByText('No recent preset capture runs yet.')).toBeInTheDocument();
  });

  it('renders progress details and retries failed programmable routes', () => {
    const onRetryFailed = vi.fn();

    render(
      <SocialCaptureBatchHistory
        title='Recent programmable runs'
        description='Durable programmable history.'
        jobs={[
          {
            id: 'job-1',
            runId: 'run-1',
            status: 'completed',
            request: {
              baseUrl: 'https://example.com',
              presetIds: [],
              presetLimit: null,
              appearanceMode: 'default',
              playwrightPersonaId: null,
              playwrightScript: 'return input.captures;',
              playwrightRoutes: [
                {
                  id: 'route-1',
                  title: 'Pricing page',
                  path: '/pricing',
                  description: '',
                  selector: '',
                  waitForMs: 0,
                  waitForSelectorMs: 10000,
                },
              ],
            },
            progress: {
              processedCount: 1,
              completedCount: 0,
              failureCount: 1,
              remainingCount: 0,
              totalCount: 1,
              currentCaptureId: 'route-1',
              currentCaptureTitle: 'Pricing page',
              currentCaptureStatus: 'waiting_for_selector',
              lastCaptureId: null,
              lastCaptureStatus: null,
              message: 'Waiting for selector [data-pricing].',
            },
            result: {
              addons: [],
              failures: [{ id: 'route-1', reason: 'capture_failed' }],
              runId: 'run-1',
            },
            error: null,
            createdAt: '2026-03-30T10:00:00.000Z',
            updatedAt: '2026-03-30T10:05:00.000Z',
          },
        ]}
        routes={[
          {
            id: 'route-1',
            title: 'Pricing page',
            path: '/pricing',
            description: '',
            selector: '',
            waitForMs: 0,
            waitForSelectorMs: 10000,
          },
        ]}
        emptyMessage='No recent programmable capture runs yet.'
        retryKind='programmable'
        onRetryFailed={onRetryFailed}
      />
    );

    expect(screen.getByText('Run run-1')).toBeInTheDocument();
    expect(screen.getByText('Waiting for selector [data-pricing].')).toBeInTheDocument();
    expect(screen.getByText('Current target')).toBeInTheDocument();
    expect(screen.getByText('Pricing page')).toBeInTheDocument();
    expect(screen.getByText('Waiting For Selector')).toBeInTheDocument();
    expect(
      screen.getByText('Failed targets: Pricing page: Capture failed')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry failed routes' }));

    expect(onRetryFailed).toHaveBeenCalledTimes(1);
  });

  it('renders stored target diagnostics from capture results', () => {
    render(
      <SocialCaptureBatchHistory
        title='Recent preset capture runs'
        description='Durable capture history.'
        jobs={[
          {
            id: 'job-2',
            runId: 'run-2',
            status: 'completed',
            request: {
              baseUrl: 'https://example.com',
              presetIds: ['game', 'lessons'],
              presetLimit: null,
              appearanceMode: 'default',
              playwrightPersonaId: null,
              playwrightScript: null,
              playwrightRoutes: [],
            },
            progress: null,
            result: {
              addons: [],
              failures: [{ id: 'lessons', reason: 'timeout' }],
              captureResults: [
                {
                  id: 'game',
                  title: 'Kangur Game Home',
                  status: 'ok',
                  reason: null,
                  resolvedUrl:
                    'https://example.com/kangur/game?kangurCapture=social-batch',
                  artifactName: 'game.png',
                  attemptCount: 1,
                  durationMs: 900,
                  stage: 'captured',
                },
                {
                  id: 'lessons',
                  title: 'Lessons Library',
                  status: 'failed',
                  reason: 'timeout',
                  resolvedUrl:
                    'https://example.com/kangur/lessons?kangurCapture=social-batch',
                  artifactName: null,
                  attemptCount: 2,
                  durationMs: 3200,
                  stage: 'waiting_for_selector',
                },
              ],
              runId: 'run-2',
            },
            error: null,
            createdAt: '2026-03-30T11:00:00.000Z',
            updatedAt: '2026-03-30T11:05:00.000Z',
          },
        ]}
        emptyMessage='No recent preset capture runs yet.'
      />
    );

    expect(screen.getByText('Targets')).toBeInTheDocument();
    expect(screen.getByText('Kangur Game Home')).toBeInTheDocument();
    expect(screen.getByText('Lessons Library')).toBeInTheDocument();
    expect(screen.getByText('URL: https://example.com/kangur/game?kangurCapture=social-batch')).toBeInTheDocument();
    expect(screen.getByText('Artifact: game.png')).toBeInTheDocument();
    expect(screen.getByText('Stage: Waiting For Selector')).toBeInTheDocument();
    expect(screen.getByText('Attempts: 2')).toBeInTheDocument();
    expect(screen.getByText('Duration: 3.2 s')).toBeInTheDocument();
    expect(screen.getByText('Reason: timeout')).toBeInTheDocument();
    expect(screen.queryByText('Skipped: 0')).not.toBeInTheDocument();
  });
});
