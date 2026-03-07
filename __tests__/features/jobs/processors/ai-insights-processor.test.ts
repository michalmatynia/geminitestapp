import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getBrainAssignmentForCapability,
} from '@/shared/lib/ai-brain/server';
import {
  AI_INSIGHTS_SETTINGS_KEYS,
  generateAnalyticsInsight,
  generateLogsInsight,
  generateRuntimeAnalyticsInsight,
  getAiInsightsMeta,
  getScheduleSettings,
  setAiInsightsMeta,
} from '@/features/ai/insights/server';
import { tick } from '@/features/ai/insights/workers/ai-insights-processor';
import { listSystemLogs } from '@/shared/lib/observability/system-logger';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  getBrainAssignmentForCapability: vi.fn(),
}));

vi.mock('@/features/ai/insights/server', () => ({
  AI_INSIGHTS_SETTINGS_KEYS: {
    analyticsLastRunAt: 'analyticsLastRunAt',
    runtimeAnalyticsLastRunAt: 'runtimeAnalyticsLastRunAt',
    logsLastRunAt: 'logsLastRunAt',
    logsLastErrorSeenAt: 'logsLastErrorSeenAt',
  },
  generateAnalyticsInsight: vi.fn(),
  generateLogsInsight: vi.fn(),
  generateRuntimeAnalyticsInsight: vi.fn(),
  getScheduleSettings: vi.fn(),
  getAiInsightsMeta: vi.fn(),
  setAiInsightsMeta: vi.fn(),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  listSystemLogs: vi.fn(),
}));

const enabledAssignment = {
  enabled: true,
  provider: 'model',
  modelId: '',
  agentId: '',
  temperature: 0.2,
  maxTokens: 1200,
  notes: null,
} as const;

const disabledAssignment = {
  ...enabledAssignment,
  enabled: false,
} as const;

describe('ai-insights-processor tick', () => {
  const mockRepo = {
    createRun: vi.fn(),
    updateRun: vi.fn(),
    createRunEvent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.createRun.mockResolvedValue({ id: 'run-1' });
    mockRepo.updateRun.mockResolvedValue(undefined);
    mockRepo.createRunEvent.mockResolvedValue(undefined);
    vi.mocked(getPathRunRepository).mockResolvedValue(mockRepo as any);
    vi.mocked(generateAnalyticsInsight).mockResolvedValue({} as any);
    vi.mocked(generateRuntimeAnalyticsInsight).mockResolvedValue({} as any);
    vi.mocked(generateLogsInsight).mockResolvedValue({} as any);
    vi.mocked(setAiInsightsMeta).mockResolvedValue(undefined);
    vi.mocked(getAiInsightsMeta).mockResolvedValue(null);
    vi.mocked(listSystemLogs).mockResolvedValue({ logs: [] } as any);
    vi.mocked(getBrainAssignmentForCapability).mockResolvedValue(enabledAssignment as any);
  });

  it('does not create a run when all schedules are disabled', async () => {
    vi.mocked(getScheduleSettings).mockResolvedValue({
      analyticsEnabled: false,
      analyticsMinutes: 30,
      runtimeAnalyticsEnabled: false,
      runtimeAnalyticsMinutes: 30,
      logsEnabled: false,
      logsMinutes: 15,
      logsAutoOnError: false,
    });

    await tick();

    expect(mockRepo.createRun).not.toHaveBeenCalled();
    expect(generateAnalyticsInsight).not.toHaveBeenCalled();
    expect(generateRuntimeAnalyticsInsight).not.toHaveBeenCalled();
    expect(generateLogsInsight).not.toHaveBeenCalled();
  });

  it('does not create a run when enabled jobs are not due yet', async () => {
    vi.mocked(getScheduleSettings).mockResolvedValue({
      analyticsEnabled: true,
      analyticsMinutes: 30,
      runtimeAnalyticsEnabled: false,
      runtimeAnalyticsMinutes: 30,
      logsEnabled: false,
      logsMinutes: 15,
      logsAutoOnError: false,
    });
    vi.mocked(getBrainAssignmentForCapability).mockImplementation(async (capability) => {
      if (capability === 'insights.analytics') return enabledAssignment as any;
      return disabledAssignment as any;
    });
    vi.mocked(getAiInsightsMeta).mockResolvedValue(new Date().toISOString());

    await tick();

    expect(mockRepo.createRun).not.toHaveBeenCalled();
    expect(generateAnalyticsInsight).not.toHaveBeenCalled();
  });

  it('creates a run and executes analytics insight when enabled and due', async () => {
    vi.mocked(getScheduleSettings).mockResolvedValue({
      analyticsEnabled: true,
      analyticsMinutes: 30,
      runtimeAnalyticsEnabled: false,
      runtimeAnalyticsMinutes: 30,
      logsEnabled: false,
      logsMinutes: 15,
      logsAutoOnError: false,
    });
    vi.mocked(getBrainAssignmentForCapability).mockImplementation(async (capability) => {
      if (capability === 'insights.analytics') return enabledAssignment as any;
      return disabledAssignment as any;
    });
    vi.mocked(getAiInsightsMeta).mockResolvedValue(null);

    await tick();

    expect(mockRepo.createRun).toHaveBeenCalledTimes(1);
    expect(generateAnalyticsInsight).toHaveBeenCalledWith({ source: 'scheduled_job' });
  });
});
