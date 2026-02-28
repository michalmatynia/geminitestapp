import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import {
  generateAnalyticsInsight,
  generateLogsInsight,
  generateRuntimeAnalyticsInsight,
  getScheduleSettings,
} from '@/shared/lib/ai/insights/generator';
import { getAiInsightsMeta, setAiInsightsMeta } from '@/shared/lib/ai/insights/repository';
import { tick } from '@/shared/lib/ai/insights/workers/ai-insights-processor';
import { listSystemLogs } from '@/features/observability/server';

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  getBrainAssignmentForFeature: vi.fn(),
}));

vi.mock('@/shared/lib/ai/insights/generator', () => ({
  generateAnalyticsInsight: vi.fn(),
  generateLogsInsight: vi.fn(),
  generateRuntimeAnalyticsInsight: vi.fn(),
  getScheduleSettings: vi.fn(),
}));

vi.mock('@/shared/lib/ai/insights/repository', () => ({
  getAiInsightsMeta: vi.fn(),
  setAiInsightsMeta: vi.fn(),
}));

vi.mock('@/features/observability/server', () => ({
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
    vi.mocked(getBrainAssignmentForFeature).mockResolvedValue(enabledAssignment as any);
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
    vi.mocked(getBrainAssignmentForFeature).mockImplementation(async (feature) => {
      if (feature === 'analytics') return enabledAssignment as any;
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
    vi.mocked(getBrainAssignmentForFeature).mockImplementation(async (feature) => {
      if (feature === 'analytics') return enabledAssignment as any;
      return disabledAssignment as any;
    });
    vi.mocked(getAiInsightsMeta).mockResolvedValue(null);

    await tick();

    expect(mockRepo.createRun).toHaveBeenCalledTimes(1);
    expect(generateAnalyticsInsight).toHaveBeenCalledWith({ source: 'scheduled_job' });
  });
});
