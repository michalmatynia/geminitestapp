import { beforeEach, describe, expect, it, vi } from 'vitest';

const { captureExceptionMock, readdirMock, readFileMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  readdirMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readdir: (...args: unknown[]) => readdirMock(...args),
    readFile: (...args: unknown[]) => readFileMock(...args),
  },
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

import {
  getAgentLeaseDiscoveryPayload,
  getAgentLeaseState,
} from './agent-lease-service';

describe('agent-lease-service playwright broker discovery', () => {
  beforeEach(() => {
    readdirMock.mockReset();
    readFileMock.mockReset();
    captureExceptionMock.mockReset();
    vi.restoreAllMocks();
  });

  it('returns an empty broker placeholder state when the lease directory is missing', async () => {
    readdirMock.mockRejectedValueOnce(
      Object.assign(new Error('missing lease dir'), { code: 'ENOENT' })
    );

    await expect(
      getAgentLeaseState('testing.playwright.runtime-broker', 'scope-missing')
    ).resolves.toEqual(
      expect.objectContaining({
        managedBy: 'external_adapter',
        scopeId: 'scope-missing',
        activeLease: null,
        recentEvents: [],
      })
    );
  });

  it('hydrates broker discovery states from lease files and filters stale runtimes', async () => {
    readdirMock.mockResolvedValueOnce([
      'active.json',
      'expired.json',
      'missing.json',
      'skip.txt',
    ]);
    readFileMock.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('active.json')) {
        return JSON.stringify({
          agentLeaseScopeId: ' scope-active ',
          pid: '123',
          startedAt: '2026-03-27T12:00:00.000Z',
          leaseHeartbeatAt: '2026-03-27T12:01:00.000Z',
          agentId: ' agent-a ',
          leaseKey: 'lease-active',
          reused: true,
        });
      }
      if (filePath.endsWith('expired.json')) {
        return JSON.stringify({
          leaseKey: 'scope-expired',
          pid: 456,
          startedAt: '2026-03-27T12:02:00.000Z',
          agentId: 'agent-b',
        });
      }
      if (filePath.endsWith('missing.json')) {
        throw Object.assign(new Error('gone'), { code: 'ENOENT' });
      }
      throw new Error(`Unexpected file: ${filePath}`);
    });
    vi.spyOn(process, 'kill').mockImplementation(((pid: number) => {
      if (pid === 123) {
        return true;
      }
      throw Object.assign(new Error('not running'), { code: 'ESRCH' });
    }) as typeof process.kill);

    const discovery = await getAgentLeaseDiscoveryPayload({
      resourceId: 'testing.playwright.runtime-broker',
    });

    expect(discovery.leases).toHaveLength(2);
    expect(discovery.leases[0]).toEqual(
      expect.objectContaining({
        managedBy: 'external_adapter',
        scopeId: 'scope-active',
        activeLease: expect.objectContaining({
          leaseId: 'lease-active',
          ownerAgentId: 'agent-a',
          status: 'active',
        }),
        recentEvents: [expect.objectContaining({ kind: 'renewed' })],
      })
    );
    expect(discovery.leases[1]).toEqual(
      expect.objectContaining({
        managedBy: 'external_adapter',
        scopeId: 'scope-expired',
        activeLease: null,
        recentEvents: [expect.objectContaining({ kind: 'expired' })],
      })
    );
    expect(captureExceptionMock).toHaveBeenCalled();
  });

  it('captures and rethrows invalid broker lease JSON payloads', async () => {
    readdirMock.mockResolvedValueOnce(['broken.json']);
    readFileMock.mockResolvedValueOnce('not-json');

    await expect(
      getAgentLeaseDiscoveryPayload({
        resourceId: 'testing.playwright.runtime-broker',
      })
    ).rejects.toThrow(SyntaxError);
    expect(captureExceptionMock).toHaveBeenCalled();
  });

  it('applies scope and active-only filters to broker lease discovery', async () => {
    readdirMock.mockResolvedValueOnce(['active.json', 'expired.json']);
    readFileMock.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('active.json')) {
        return JSON.stringify({
          agentLeaseScopeId: 'scope-active',
          pid: 123,
          startedAt: '2026-03-27T12:00:00.000Z',
          agentId: 'agent-a',
          leaseKey: 'lease-active',
        });
      }
      if (filePath.endsWith('expired.json')) {
        return JSON.stringify({
          leaseKey: 'scope-expired',
          pid: 456,
          startedAt: '2026-03-27T12:02:00.000Z',
          agentId: 'agent-b',
        });
      }
      throw new Error(`Unexpected file: ${filePath}`);
    });
    vi.spyOn(process, 'kill').mockImplementation(((pid: number) => {
      if (pid === 123) {
        return true;
      }
      throw Object.assign(new Error('not running'), { code: 'ESRCH' });
    }) as typeof process.kill);

    const discovery = await getAgentLeaseDiscoveryPayload({
      resourceId: 'testing.playwright.runtime-broker',
      scopeId: 'scope-active',
      activeOnly: true,
    });

    expect(discovery.leases).toEqual([
      expect.objectContaining({
        scopeId: 'scope-active',
        activeLease: expect.objectContaining({
          leaseId: 'lease-active',
        }),
      }),
    ]);
  });
});
