import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logSystemError, logSystemEvent } from '@/shared/lib/observability/system-logger-client';

const getObservabilityLoggingControlTypeForSystemLogLevelMock = vi.hoisted(() => vi.fn());
const isClientLoggingControlEnabledMock = vi.hoisted(() => vi.fn());
const consoleErrorMock = vi.hoisted(() => vi.fn());
const consoleWarnMock = vi.hoisted(() => vi.fn());
const consoleInfoMock = vi.hoisted(() => vi.fn());
const logClientErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/observability/logging-controls', () => ({
  getObservabilityLoggingControlTypeForSystemLogLevel:
    getObservabilityLoggingControlTypeForSystemLogLevelMock,
}));

vi.mock('@/shared/lib/observability/logging-controls-client', () => ({
  isClientLoggingControlEnabled: isClientLoggingControlEnabledMock,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

describe('system-logger-client shared-lib coverage', () => {
  beforeEach(() => {
    getObservabilityLoggingControlTypeForSystemLogLevelMock.mockReset();
    isClientLoggingControlEnabledMock.mockReset();
    consoleErrorMock.mockReset();
    consoleWarnMock.mockReset();
    consoleInfoMock.mockReset();
    logClientErrorMock.mockReset();

    vi.spyOn(console, 'error').mockImplementation(consoleErrorMock);
    vi.spyOn(console, 'warn').mockImplementation(consoleWarnMock);
    vi.spyOn(console, 'info').mockImplementation(consoleInfoMock);

    getObservabilityLoggingControlTypeForSystemLogLevelMock.mockReturnValue('info');
    isClientLoggingControlEnabledMock.mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns early when running on the server', async () => {
    vi.stubGlobal('window', undefined);

    await logSystemEvent({ message: 'server-only' });

    expect(getObservabilityLoggingControlTypeForSystemLogLevelMock).not.toHaveBeenCalled();
    expect(consoleInfoMock).not.toHaveBeenCalled();
  });

  it('returns early when the client logging control is disabled', async () => {
    isClientLoggingControlEnabledMock.mockReturnValue(false);

    await logSystemEvent({ level: 'info', message: 'skip-me', source: 'ui' });

    expect(getObservabilityLoggingControlTypeForSystemLogLevelMock).toHaveBeenCalledWith('info', false);
    expect(consoleInfoMock).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });

  it('writes info logs without reporting client errors', async () => {
    await logSystemEvent({
      level: 'info',
      message: 'Loaded dashboard',
      source: 'ui',
      service: 'frontend',
      context: { requestId: 'req-1' },
      statusCode: 200,
    });

    expect(consoleInfoMock).toHaveBeenCalledWith('[ui] Loaded dashboard', {
      requestId: 'req-1',
      source: 'ui',
      service: 'frontend',
      statusCode: 200,
    });
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });

  it('writes warn and error flows and reports client errors when needed', async () => {
    getObservabilityLoggingControlTypeForSystemLogLevelMock.mockReturnValue('error');

    await logSystemEvent({
      level: 'warn',
      message: 'Slow request',
      source: 'api',
      service: 'frontend',
    });
    expect(consoleWarnMock).toHaveBeenCalledWith('[api] Slow request', {
      source: 'api',
      service: 'frontend',
      statusCode: undefined,
    });

    await logSystemEvent({
      level: 'error',
      message: 'Broken request',
      source: 'api',
      error: new Error('boom'),
    });
    expect(consoleErrorMock).toHaveBeenCalledWith(
      '[api] Broken request',
      expect.any(Error),
      expect.objectContaining({
        source: 'api',
      })
    );
    expect(logClientErrorMock).toHaveBeenCalledWith(expect.any(Error), {
      context: expect.objectContaining({
        source: 'api',
      }),
    });

    await logSystemError({
      message: 'Critical wrapper',
      source: 'system',
      service: 'frontend',
    });
    expect(consoleErrorMock).toHaveBeenCalledWith(
      '[system] Critical wrapper',
      undefined,
      expect.objectContaining({
        source: 'system',
        service: 'frontend',
      })
    );
    expect(logClientErrorMock).toHaveBeenLastCalledWith(expect.any(Error), {
      context: expect.objectContaining({
        source: 'system',
      }),
    });
  });
});
