import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, apiPostMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock('./base', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  apiPost: (...args: unknown[]) => apiPostMock(...args),
}));

import {
  enqueueAgentRun,
  enqueuePlaywrightRun,
  fetchPlaywrightRun,
} from './agent';
import { fetchRuntimeAnalyticsSummary } from './analytics';
import { fetchSettings, updateSetting } from './settings';

describe('AI Paths API client helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetchMock.mockResolvedValue({ ok: true });
    apiPostMock.mockResolvedValue({ ok: true });
  });

  it('forwards agent runtime and playwright requests to the correct endpoints', async () => {
    const agentPayload = { prompt: 'hello world' };
    const playwrightPayload = { script: 'return 1;', waitForResult: true };

    await enqueueAgentRun(agentPayload);
    await enqueuePlaywrightRun(playwrightPayload);
    await fetchPlaywrightRun('run-123');

    expect(apiPostMock).toHaveBeenNthCalledWith(
      1,
      '/api/ai/agent-runtime/enqueue',
      agentPayload
    );
    expect(apiPostMock).toHaveBeenNthCalledWith(2, '/api/ai-paths/playwright', playwrightPayload);
    expect(apiFetchMock).toHaveBeenCalledWith('/api/ai-paths/playwright/run-123');
  });

  it('forwards analytics and settings requests to the correct endpoints', async () => {
    await fetchRuntimeAnalyticsSummary('7d');
    await fetchSettings('ai-paths');
    await updateSetting({ key: 'foo', value: 'bar', scope: 'ai-paths' });

    expect(apiFetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/ai/ai-paths/analytics/summary?range=7d'
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, '/api/settings?scope=ai-paths');
    expect(apiPostMock).toHaveBeenCalledWith('/api/settings', {
      key: 'foo',
      value: 'bar',
      scope: 'ai-paths',
    });
  });
});
