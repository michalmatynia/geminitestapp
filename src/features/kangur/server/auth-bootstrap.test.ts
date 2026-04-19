import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveKangurActorMock, toKangurAuthUserMock } = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  toKangurAuthUserMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
  toKangurAuthUser: toKangurAuthUserMock,
}));

describe('getKangurAuthBootstrapScript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toKangurAuthUserMock.mockReturnValue({
      id: 'user-1',
      full_name: 'Ada',
      email: 'ada@example.com',
      role: 'user',
      actorType: 'parent',
      canManageLearners: true,
      ownerUserId: 'owner-1',
      ownerEmailVerified: true,
      activeLearner: null,
      learners: [],
    });
  });

  it('skips bootstrap resolution for internal Next route requests', async () => {
    const { getKangurAuthBootstrapScript } = await import('./auth-bootstrap');
    const headers = new Headers({
      rsc: '1',
      'next-url': '/en/kangur',
    });

    await expect(getKangurAuthBootstrapScript(headers)).resolves.toBeNull();
    expect(resolveKangurActorMock).not.toHaveBeenCalled();
  });

  it('serializes the resolved auth user for document requests', async () => {
    resolveKangurActorMock.mockResolvedValue({
      actorId: 'owner-1',
      actorType: 'parent',
      canManageLearners: true,
      ownerUserId: 'owner-1',
      ownerEmail: 'ada@example.com',
      ownerName: 'Ada',
      ownerEmailVerified: true,
      role: 'user',
      activeLearner: null,
      learners: [],
    });

    const { getKangurAuthBootstrapScript } = await import('./auth-bootstrap');
    const script = await getKangurAuthBootstrapScript(new Headers());

    expect(resolveKangurActorMock).toHaveBeenCalledTimes(1);
    expect(script).toContain('window.__KANGUR_AUTH_BOOTSTRAP__=');
    expect(script).toContain('"id":"user-1"');
  });
});
