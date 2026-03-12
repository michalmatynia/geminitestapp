import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth', () => ({
  auth: vi.fn(),
  findAuthUserById: vi.fn(),
  normalizeAuthEmail: (value: string) => value.trim().toLowerCase(),
}));

vi.mock('./kangur-learner-repository', () => ({
  ensureDefaultKangurLearnerForOwner: vi.fn(),
  getKangurLearnerById: vi.fn(),
  listKangurLearnersByOwner: vi.fn(),
}));

vi.mock('./kangur-learner-session', () => ({
  readKangurLearnerSession: vi.fn(),
}));

import { createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';
import { kangurAuthUserSchema } from '@/shared/contracts/kangur';

import { toKangurAuthUser, type KangurParentActor } from './kangur-actor';

const learner = {
  id: 'learner-1',
  ownerUserId: 'owner-1',
  displayName: 'Ada',
  loginName: 'ada',
  status: 'active' as const,
  legacyUserKey: null,
  aiTutor: createDefaultKangurAiTutorLearnerMood(),
  createdAt: '2026-03-10T12:00:00.000Z',
  updatedAt: '2026-03-10T12:00:00.000Z',
};

const buildParentActor = (overrides: Partial<KangurParentActor> = {}): KangurParentActor => ({
  actorId: 'owner-1',
  actorType: 'parent',
  canManageLearners: true,
  ownerUserId: 'owner-1',
  ownerEmail: 'parent@example.com',
  ownerName: 'Parent Example',
  ownerEmailVerified: true,
  role: 'user',
  activeLearner: learner,
  learners: [learner],
  ...overrides,
});

describe('toKangurAuthUser', () => {
  it('drops invalid parent owner emails so the auth payload stays schema-valid', () => {
    const authUser = toKangurAuthUser(buildParentActor({ ownerEmail: 'not-an-email' }));

    expect(authUser.email).toBeNull();
    expect(kangurAuthUserSchema.parse(authUser).email).toBeNull();
  });

  it('normalizes valid parent owner emails before returning the auth payload', () => {
    const authUser = toKangurAuthUser(buildParentActor({ ownerEmail: ' Parent@Example.COM ' }));

    expect(authUser.email).toBe('parent@example.com');
    expect(kangurAuthUserSchema.parse(authUser).email).toBe('parent@example.com');
  });
});
