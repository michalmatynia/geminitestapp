import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BrainStateOverview } from '../components/BrainStateOverview';
import { useBrain } from '../context/BrainContext';
import { AI_BRAIN_SETTINGS_KEY } from '@/shared/lib/ai-brain/settings';
import { useSettingsMap } from '@/shared/hooks/use-settings';

vi.mock('../context/BrainContext', () => ({
  useBrain: vi.fn(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({
    label,
    status,
  }: {
    label: string;
    status: string;
  }) => (
    <span data-testid='status-badge' data-status={status}>
      {label}
    </span>
  ),
}));

describe('BrainStateOverview', () => {
  beforeEach(() => {
    vi.mocked(useSettingsMap).mockReturnValue({
      data: new Map([[AI_BRAIN_SETTINGS_KEY, { saved: true }]]),
    } as unknown as ReturnType<typeof useSettingsMap>);
  });

  it('renders saved-state, cadence, and latest runtime insight details', () => {
    vi.mocked(useBrain).mockReturnValue({
      insightsQuery: {
        data: {
          logs: [
            {
              createdAt: '2026-03-01T10:00:00.000Z',
              summary: 'Logs insight',
            },
          ],
          analytics: [
            {
              createdAt: '2026-03-01T11:00:00.000Z',
              summary: 'Analytics insight',
            },
          ],
          runtimeAnalytics: [
            {
              createdAt: '2026-03-01T12:00:00.000Z',
              summary: 'Runtime insight summary',
              metadata: {
                runtimeKernelParityRiskLevel: 'high',
              },
            },
          ],
        },
      },
      overridesEnabled: {
        analytics: true,
      },
      settings: {
        capabilities: {
          runtime_analytics: false,
        },
      },
      analyticsScheduleEnabled: true,
      analyticsScheduleMinutes: 15,
      runtimeAnalyticsScheduleEnabled: false,
      runtimeAnalyticsScheduleMinutes: 30,
      logsScheduleEnabled: true,
      logsScheduleMinutes: 60,
      effectiveAssignments: {
        products: {
          modelId: 'gpt-4.1',
        },
      },
    } as unknown as ReturnType<typeof useBrain>);

    render(<BrainStateOverview />);

    expect(screen.getByText('Source: saved settings')).toBeInTheDocument();
    expect(screen.getByText('Custom routing active')).toBeInTheDocument();
    expect(screen.getByText(/Analytics every 15m/)).toBeInTheDocument();
    expect(screen.getByText(/Runtime paused/)).toBeInTheDocument();
    expect(screen.getByText(/Logs every 60m/)).toBeInTheDocument();
    expect(screen.getByText('Runtime insight summary')).toBeInTheDocument();
    expect(screen.getByText('Runtime kernel risk: HIGH')).toBeInTheDocument();
    expect(screen.getByText('Products routing: gpt-4.1')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toHaveAttribute('data-status', 'ok');
  });

  it('falls back to defaults when no saved settings or insights exist', () => {
    vi.mocked(useSettingsMap).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useSettingsMap>);

    vi.mocked(useBrain).mockReturnValue({
      insightsQuery: {
        data: undefined,
      },
      overridesEnabled: {
        analytics: false,
      },
      settings: {
        capabilities: {
          analytics: false,
        },
      },
      analyticsScheduleEnabled: false,
      analyticsScheduleMinutes: 15,
      runtimeAnalyticsScheduleEnabled: false,
      runtimeAnalyticsScheduleMinutes: 30,
      logsScheduleEnabled: false,
      logsScheduleMinutes: 60,
      effectiveAssignments: {
        products: {
          modelId: '',
        },
      },
    } as unknown as ReturnType<typeof useBrain>);

    render(<BrainStateOverview />);

    expect(screen.getByText('Source: defaults')).toBeInTheDocument();
    expect(screen.getByText('Using global defaults')).toBeInTheDocument();
    expect(screen.getByText('No insight runs yet')).toBeInTheDocument();
    expect(screen.getByText('Products routing: inherits default')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toHaveAttribute('data-status', 'none');
  });
});
