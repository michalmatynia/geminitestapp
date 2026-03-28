import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { OperationsTab } from '../components/OperationsTab';
import { useBrain } from '../context/BrainContext';

vi.mock('../context/BrainContext', () => ({
  useBrain: vi.fn(),
}));

describe('OperationsTab', () => {
  it('renders all four domain cards with trends, links, and drill-down events', async () => {
    const setOperationsRange = vi.fn();

    vi.mocked(useBrain).mockReturnValue({
      operationsRange: '1h',
      setOperationsRange,
      operationsOverviewQuery: {
        isLoading: false,
        error: null,
        data: {
          range: '1h',
          generatedAt: '2026-03-01T00:00:00.000Z',
          window: {
            currentStart: '2026-02-29T23:00:00.000Z',
            currentEnd: '2026-03-01T00:00:00.000Z',
            previousStart: '2026-02-29T22:00:00.000Z',
            previousEnd: '2026-02-29T23:00:00.000Z',
          },
          domains: {
            ai_paths: {
              key: 'ai_paths',
              label: 'AI Paths',
              state: 'healthy',
              sampleSize: 20,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [
                { key: 'queued', label: 'Queued', value: 2 },
                { key: 'runtime_kernel_risk', label: 'Kernel parity risk', value: 'HIGH' },
                { key: 'runtime_audit_age_min', label: 'Runtime audit age (min)', value: 185 },
                { key: 'runtime_risk_events_current', label: 'Risk events (1h)', value: 3 },
                { key: 'runtime_risk_events_previous', label: 'Risk events (prev)', value: 1 },
              ],
              trend: {
                direction: 'unknown',
                delta: 0,
                label: 'Trend unavailable for 1h queue snapshot.',
              },
              recentEvents: [
                {
                  id: 'runtime-event-1',
                  status: 'runtime_kernel_high',
                  timestamp: '2026-03-01T00:00:00.000Z',
                },
              ],
              links: [{ label: 'Queue', href: '/admin/ai-paths/queue' }],
            },
            chatbot: {
              key: 'chatbot',
              label: 'Chatbot',
              state: 'warning',
              sampleSize: 10,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [{ key: 'failed', label: 'Failed', value: 1 }],
              trend: {
                direction: 'up',
                delta: 1,
                label: 'Failed vs previous 1h',
                current: 1,
                previous: 0,
              },
              recentEvents: [
                {
                  id: 'job-1',
                  status: 'failed_event',
                  timestamp: '2026-03-01T00:00:00.000Z',
                },
              ],
              links: [{ label: 'Chat', href: '/admin/chatbot' }],
            },
            agent_runtime: {
              key: 'agent_runtime',
              label: 'Agent Runtime',
              state: 'healthy',
              sampleSize: 8,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [{ key: 'running', label: 'Running', value: 1 }],
              trend: {
                direction: 'flat',
                delta: 0,
                label: 'Failed vs previous 1h',
                current: 0,
                previous: 0,
              },
              recentEvents: [],
              links: [{ label: 'Runs', href: '/admin/agentcreator/runs' }],
            },
            image_studio: {
              key: 'image_studio',
              label: 'Image Studio',
              state: 'healthy',
              sampleSize: 12,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [{ key: 'completed', label: 'Completed', value: 11 }],
              trend: {
                direction: 'down',
                delta: -1,
                label: 'Failed vs previous 1h',
                current: 0,
                previous: 1,
              },
              recentEvents: [],
              links: [{ label: 'Studio', href: '/admin/image-studio' }],
            },
          },
        },
      },
    } as unknown as ReturnType<typeof useBrain>);

    render(<OperationsTab />);

    expect(screen.getByText('AI Paths')).toBeInTheDocument();
    expect(screen.getByText('Chatbot')).toBeInTheDocument();
    expect(screen.getByText('Agent Runtime')).toBeInTheDocument();
    expect(screen.getByText('Image Studio')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Queue/i })).toHaveAttribute(
      'href',
      '/admin/ai-paths/queue'
    );
    expect(screen.getByRole('link', { name: /Chat/i })).toHaveAttribute('href', '/admin/chatbot');
    expect(screen.getByRole('link', { name: /Runs/i })).toHaveAttribute(
      'href',
      '/admin/agentcreator/runs'
    );
    expect(screen.getByRole('link', { name: /Studio/i })).toHaveAttribute(
      'href',
      '/admin/image-studio'
    );
    expect(screen.getByTestId('operations-runtime-risk-ai_paths')).toHaveTextContent(
      'Kernel parity risk: HIGH'
    );
    expect(screen.getByTestId('operations-runtime-risk-summary-ai_paths')).toHaveTextContent(
      'Runtime risk events: 3 current / 1 previous'
    );

    expect(screen.getAllByText('Failed vs previous 1h').length).toBeGreaterThan(0);

    const detailButtons = screen.getAllByRole('button', { name: /Details/i });
    await userEvent.click(detailButtons[0] as HTMLElement);
    expect(screen.getByText('Runtime Kernel High')).toBeInTheDocument();

    await userEvent.click(detailButtons[1] as HTMLElement);

    expect(screen.getByText('failed_event')).toBeInTheDocument();
  });

  it('renders degraded state messaging when a domain is unknown', () => {
    vi.mocked(useBrain).mockReturnValue({
      operationsRange: '1h',
      setOperationsRange: vi.fn(),
      operationsOverviewQuery: {
        isLoading: false,
        error: null,
        data: {
          range: '1h',
          generatedAt: '2026-03-01T00:00:00.000Z',
          window: {
            currentStart: '2026-02-29T23:00:00.000Z',
            currentEnd: '2026-03-01T00:00:00.000Z',
            previousStart: '2026-02-29T22:00:00.000Z',
            previousEnd: '2026-02-29T23:00:00.000Z',
          },
          domains: {
            ai_paths: {
              key: 'ai_paths',
              label: 'AI Paths',
              state: 'unknown',
              message: 'Collector timeout.',
              sampleSize: 0,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [],
              trend: {
                direction: 'unknown',
                delta: 0,
                label: 'Trend unavailable.',
              },
              recentEvents: [],
              links: [{ label: 'Queue', href: '/admin/ai-paths/queue' }],
            },
            chatbot: {
              key: 'chatbot',
              label: 'Chatbot',
              state: 'healthy',
              sampleSize: 0,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [],
              trend: {
                direction: 'flat',
                delta: 0,
                label: 'Failed vs previous 1h',
                current: 0,
                previous: 0,
              },
              recentEvents: [],
              links: [],
            },
            agent_runtime: {
              key: 'agent_runtime',
              label: 'Agent Runtime',
              state: 'healthy',
              sampleSize: 0,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [],
              trend: {
                direction: 'flat',
                delta: 0,
                label: 'Failed vs previous 1h',
                current: 0,
                previous: 0,
              },
              recentEvents: [],
              links: [],
            },
            image_studio: {
              key: 'image_studio',
              label: 'Image Studio',
              state: 'healthy',
              sampleSize: 0,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [],
              trend: {
                direction: 'flat',
                delta: 0,
                label: 'Failed vs previous 1h',
                current: 0,
                previous: 0,
              },
              recentEvents: [],
              links: [],
            },
          },
        },
      },
    } as unknown as ReturnType<typeof useBrain>);

    render(<OperationsTab />);

    expect(screen.getByText('Collector timeout.')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('does not render runtime risk badge when runtime metric is disabled', () => {
    vi.mocked(useBrain).mockReturnValue({
      operationsRange: '1h',
      setOperationsRange: vi.fn(),
      operationsOverviewQuery: {
        isLoading: false,
        error: null,
        data: {
          range: '1h',
          generatedAt: '2026-03-01T00:00:00.000Z',
          window: {
            currentStart: '2026-02-29T23:00:00.000Z',
            currentEnd: '2026-03-01T00:00:00.000Z',
            previousStart: '2026-02-29T22:00:00.000Z',
            previousEnd: '2026-02-29T23:00:00.000Z',
          },
          domains: {
            ai_paths: {
              key: 'ai_paths',
              label: 'AI Paths',
              state: 'healthy',
              sampleSize: 0,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [
                { key: 'runtime_kernel_risk', label: 'Kernel parity risk', value: 'disabled' },
              ],
              trend: {
                direction: 'unknown',
                delta: 0,
                label: 'Trend unavailable.',
              },
              recentEvents: [],
              links: [],
            },
            chatbot: {
              key: 'chatbot',
              label: 'Chatbot',
              state: 'healthy',
              sampleSize: 0,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [],
              trend: {
                direction: 'flat',
                delta: 0,
                label: 'Failed vs previous 1h',
                current: 0,
                previous: 0,
              },
              recentEvents: [],
              links: [],
            },
            agent_runtime: {
              key: 'agent_runtime',
              label: 'Agent Runtime',
              state: 'healthy',
              sampleSize: 0,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [],
              trend: {
                direction: 'flat',
                delta: 0,
                label: 'Failed vs previous 1h',
                current: 0,
                previous: 0,
              },
              recentEvents: [],
              links: [],
            },
            image_studio: {
              key: 'image_studio',
              label: 'Image Studio',
              state: 'healthy',
              sampleSize: 0,
              updatedAt: '2026-03-01T00:00:00.000Z',
              metrics: [],
              trend: {
                direction: 'flat',
                delta: 0,
                label: 'Failed vs previous 1h',
                current: 0,
                previous: 0,
              },
              recentEvents: [],
              links: [],
            },
          },
        },
      },
    } as unknown as ReturnType<typeof useBrain>);

    render(<OperationsTab />);

    expect(screen.queryByTestId('operations-runtime-risk-ai_paths')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('operations-runtime-risk-summary-ai_paths')
    ).not.toBeInTheDocument();
  });
});
