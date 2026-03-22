import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getBrainAssignmentForCapabilityMock,
  getRedisConnectionMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getBrainAssignmentForCapabilityMock: vi.fn(),
  getRedisConnectionMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  getBrainAssignmentForCapability: getBrainAssignmentForCapabilityMock,
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: getRedisConnectionMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

describe('runtime analytics availability', () => {
  beforeEach(() => {
    vi.resetModules();
    getBrainAssignmentForCapabilityMock.mockReset();
    getRedisConnectionMock.mockReset();
    captureExceptionMock.mockReset();
    logWarningMock.mockReset();
  });

  it('caches the resolved capability gate and reports redis availability', async () => {
    getBrainAssignmentForCapabilityMock
      .mockResolvedValueOnce({ enabled: true })
      .mockResolvedValueOnce({ enabled: true });
    getRedisConnectionMock.mockReturnValue({ ping: vi.fn() });

    const availabilityModule = await import('../availability');

    await expect(availabilityModule.resolveRuntimeAnalyticsCapabilityEnabled()).resolves.toBe(true);
    await expect(availabilityModule.resolveRuntimeAnalyticsCapabilityEnabled()).resolves.toBe(true);
    await expect(availabilityModule.getRuntimeAnalyticsAvailability()).resolves.toEqual({
      enabled: true,
      storage: 'redis',
    });

    expect(getBrainAssignmentForCapabilityMock).toHaveBeenCalledTimes(2);
    expect(getBrainAssignmentForCapabilityMock).toHaveBeenNthCalledWith(
      1,
      'insights.runtime_analytics'
    );
    expect(getBrainAssignmentForCapabilityMock).toHaveBeenNthCalledWith(2, 'ai_paths.model');
  });

  it('falls back to disabled availability when capability resolution fails', async () => {
    const error = new Error('brain unavailable');
    getBrainAssignmentForCapabilityMock.mockRejectedValue(error);

    const availabilityModule = await import('../availability');

    await expect(availabilityModule.resolveRuntimeAnalyticsCapabilityEnabled()).resolves.toBe(false);
    await expect(availabilityModule.getRuntimeAnalyticsAvailability()).resolves.toEqual({
      enabled: false,
      storage: 'disabled',
    });

    expect(captureExceptionMock).toHaveBeenCalledWith(error);
    expect(logWarningMock).toHaveBeenCalledWith(
      'Failed to resolve Brain runtime analytics capability gate.',
      expect.objectContaining({
        service: 'ai-paths-analytics',
        error,
      })
    );
    expect(getBrainAssignmentForCapabilityMock).toHaveBeenCalledTimes(2);
  });
});
