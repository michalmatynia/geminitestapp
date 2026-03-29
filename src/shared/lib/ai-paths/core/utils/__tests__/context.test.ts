import { describe, expect, it } from 'vitest';

import { applyContextScope } from '@/shared/lib/ai-paths/core/utils/context';
import type { ContextConfig } from '@/shared/contracts/ai-paths';

describe('applyContextScope', () => {
  const payload = {
    id: 'ctx-1',
    profile: {
      name: 'Ada',
      email: 'ada@example.com',
    },
    stats: {
      score: 12,
      rank: 3,
    },
  } satisfies Record<string, unknown>;

  it('returns the original payload when no scoped paths are configured', () => {
    expect(applyContextScope(payload)).toBe(payload);
    expect(
      applyContextScope(payload, {
        role: 'entity',
        scopeMode: 'include',
        includePaths: [],
      } satisfies ContextConfig)
    ).toBe(payload);
  });

  it('picks only included paths in include mode', () => {
    expect(
      applyContextScope(payload, {
        role: 'entity',
        scopeMode: 'include',
        includePaths: ['profile.name', 'stats.score'],
      } satisfies ContextConfig)
    ).toEqual({
      profile: { name: 'Ada' },
      stats: { score: 12 },
    });
  });

  it('omits excluded paths in exclude mode', () => {
    expect(
      applyContextScope(payload, {
        role: 'entity',
        scopeMode: 'exclude',
        excludePaths: ['profile.email', 'stats.rank'],
      } satisfies ContextConfig)
    ).toEqual({
      id: 'ctx-1',
      profile: { name: 'Ada' },
      stats: { score: 12 },
    });
  });
});
