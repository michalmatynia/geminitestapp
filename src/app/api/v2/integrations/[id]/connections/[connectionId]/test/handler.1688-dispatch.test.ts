import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseJsonBodyMock,
  getConnectionByIdAndIntegrationMock,
  getIntegrationByIdMock,
  handle1688BrowserTestMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getConnectionByIdAndIntegrationMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  handle1688BrowserTestMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: async () => ({
    getConnectionByIdAndIntegration: (...args: unknown[]) =>
      getConnectionByIdAndIntegrationMock(...args),
    getIntegrationById: (...args: unknown[]) => getIntegrationByIdMock(...args),
  }),
}));

vi.mock('./handler.tradera-api', () => ({
  handleTraderaApiTest: vi.fn(),
}));

vi.mock('./handler.linkedin', () => ({
  handleLinkedinApiTest: vi.fn(),
}));

vi.mock('./handler.vinted-browser', () => ({
  handleVintedBrowserTest: vi.fn(),
}));

vi.mock('./handler.tradera-browser', () => ({
  handleTraderaBrowserTest: vi.fn(),
}));

vi.mock('./handler.1688-browser', () => ({
  handle1688BrowserTest: (...args: unknown[]) => handle1688BrowserTestMock(...args),
}));

import { postTestConnectionHandler } from './handler';

describe('integration connection test handler 1688 dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        mode: 'manual',
        manualTimeoutMs: 300000,
      },
    });
    getConnectionByIdAndIntegrationMock.mockResolvedValue({
      id: 'connection-1688',
      integrationId: 'integration-1688',
      name: '1688 Primary',
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1688',
      slug: '1688',
      name: '1688',
    });
    handle1688BrowserTestMock.mockResolvedValue(
      Response.json({
        ok: true,
        sessionReady: true,
      })
    );
  });

  it('routes 1688 test requests to the 1688 browser handler', async () => {
    const response = await postTestConnectionHandler(
      new NextRequest('http://localhost/api/v2/integrations/integration-1688/connections/connection-1688/test', {
        method: 'POST',
      }),
      {} as never,
      {
        id: 'integration-1688',
        connectionId: 'connection-1688',
      }
    );

    expect(handle1688BrowserTestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({ id: 'connection-1688' }),
        repo: expect.objectContaining({
          getConnectionByIdAndIntegration: expect.any(Function),
          getIntegrationById: expect.any(Function),
        }),
        manualMode: true,
        manualSessionRefreshMode: false,
        quicklistPreflightMode: false,
        manualLoginTimeoutMs: 300000,
        steps: expect.any(Array),
        pushStep: expect.any(Function),
        fail: expect.any(Function),
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      sessionReady: true,
    });
  });

  it('routes manual session refresh mode to the interactive 1688 browser flow', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        mode: 'manual_session_refresh',
        manualTimeoutMs: 180000,
      },
    });

    await postTestConnectionHandler(
      new NextRequest(
        'http://localhost/api/v2/integrations/integration-1688/connections/connection-1688/test',
        {
          method: 'POST',
        }
      ),
      {} as never,
      {
        id: 'integration-1688',
        connectionId: 'connection-1688',
      }
    );

    expect(handle1688BrowserTestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        manualMode: false,
        manualSessionRefreshMode: true,
        quicklistPreflightMode: false,
        manualLoginTimeoutMs: 180000,
      })
    );
  });
});
