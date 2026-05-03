import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSelectorRegistryProbeTemplateFingerprint } from '@/shared/lib/browser-execution/selector-registry-probe-template';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  archiveSelectorRegistryProbeSessionMock,
  restoreSelectorRegistryProbeSessionMock,
  saveSelectorRegistryProbeSessionMock,
  deleteSelectorRegistryProbeSessionMock,
} = vi.hoisted(() => ({
  archiveSelectorRegistryProbeSessionMock: vi.fn(),
  restoreSelectorRegistryProbeSessionMock: vi.fn(),
  saveSelectorRegistryProbeSessionMock: vi.fn(),
  deleteSelectorRegistryProbeSessionMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/selector-registry-probe-sessions', () => ({
  archiveSelectorRegistryProbeSession: (...args: unknown[]) =>
    archiveSelectorRegistryProbeSessionMock(...args),
  saveSelectorRegistryProbeSession: (...args: unknown[]) =>
    saveSelectorRegistryProbeSessionMock(...args),
  deleteSelectorRegistryProbeSession: (...args: unknown[]) =>
    deleteSelectorRegistryProbeSessionMock(...args),
  restoreSelectorRegistryProbeSession: (...args: unknown[]) =>
    restoreSelectorRegistryProbeSessionMock(...args),
}));

import { deleteHandler, patchHandler, postHandler, putHandler } from './handler';

const createContext = (body: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-selector-probe-session-1',
    traceId: 'trace-selector-probe-session-1',
    correlationId: 'corr-selector-probe-session-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('selector probe sessions handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveSelectorRegistryProbeSessionMock.mockResolvedValue({
      session: {
        id: 'probe-session-1',
        namespace: 'amazon',
        profile: 'amazon',
        sourceUrl: 'https://www.amazon.com/example-item',
        sourceTitle: 'Example item',
        scope: 'main_content',
        sameOriginOnly: true,
        linkDepth: 0,
        maxPages: 1,
        scannedPages: 1,
        visitedUrls: ['https://www.amazon.com/example-item'],
        pages: [],
        suggestionCount: 1,
        suggestions: [],
        templateFingerprint: buildSelectorRegistryProbeTemplateFingerprint({
          sourceUrl: 'https://www.amazon.com/example-item',
          suggestions: [],
        }),
        archivedAt: null,
        createdAt: '2026-04-18T08:00:00.000Z',
        updatedAt: '2026-04-18T08:00:00.000Z',
      },
      message: 'Saved probe session for amazon profile "amazon".',
    });
    archiveSelectorRegistryProbeSessionMock.mockResolvedValue({
      id: 'probe-session-1',
      archived: true,
      archivedAt: '2026-04-18T10:00:00.000Z',
      message: 'Archived probe session.',
    });
    restoreSelectorRegistryProbeSessionMock.mockResolvedValue({
      id: 'probe-session-1',
      restored: true,
      message: 'Restored probe session to active review.',
    });
    deleteSelectorRegistryProbeSessionMock.mockResolvedValue({
      id: 'probe-session-1',
      deleted: true,
      message: 'Deleted probe session.',
    });
  });

  it('saves a selector-registry probe session', async () => {
    const body = {
      namespace: 'amazon',
      profile: 'amazon',
      probeResult: {
        url: 'https://www.amazon.com/example-item',
        title: 'Example item',
        scope: 'main_content',
        sameOriginOnly: true,
        linkDepth: 0,
        maxPages: 1,
        scannedPages: 1,
        visitedUrls: ['https://www.amazon.com/example-item'],
        pages: [],
        suggestionCount: 1,
        suggestions: [],
      },
    };

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/integrations/selectors/probe-sessions', {
        method: 'POST',
      }),
      createContext(body)
    );

    expect(saveSelectorRegistryProbeSessionMock).toHaveBeenCalledWith(body);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        message: 'Saved probe session for amazon profile "amazon".',
      })
    );
  });

  it('deletes a selector-registry probe session', async () => {
    const response = await deleteHandler(
      new NextRequest('http://localhost/api/v2/integrations/selectors/probe-sessions', {
        method: 'DELETE',
      }),
      createContext({ id: 'probe-session-1' })
    );

    expect(deleteSelectorRegistryProbeSessionMock).toHaveBeenCalledWith({
      id: 'probe-session-1',
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: 'probe-session-1',
      deleted: true,
      message: 'Deleted probe session.',
    });
  });

  it('archives a selector-registry probe session', async () => {
    const response = await patchHandler(
      new NextRequest('http://localhost/api/v2/integrations/selectors/probe-sessions', {
        method: 'PATCH',
      }),
      createContext({ id: 'probe-session-1' })
    );

    expect(archiveSelectorRegistryProbeSessionMock).toHaveBeenCalledWith({
      id: 'probe-session-1',
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: 'probe-session-1',
      archived: true,
      archivedAt: '2026-04-18T10:00:00.000Z',
      message: 'Archived probe session.',
    });
  });

  it('restores an archived selector-registry probe session', async () => {
    const response = await putHandler(
      new NextRequest('http://localhost/api/v2/integrations/selectors/probe-sessions', {
        method: 'PUT',
      }),
      createContext({ id: 'probe-session-1' })
    );

    expect(restoreSelectorRegistryProbeSessionMock).toHaveBeenCalledWith({
      id: 'probe-session-1',
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: 'probe-session-1',
      restored: true,
      message: 'Restored probe session to active review.',
    });
  });
});
