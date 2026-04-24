import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

import {
  assertAiPathRunAccess,
  canAccessGlobalAiPathRuns,
  type AiPathsAccessContext,
} from '@/features/ai/ai-paths/server/access';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

const buildRun = (userId: string | null): AiPathRunRecord =>
  ({
    id: 'run-1',
    userId,
    pathId: 'path-1',
    pathName: null,
    prompt: null,
    status: 'running',
    triggerEvent: null,
    triggerNodeId: null,
    triggerContext: null,
    graph: null,
    runtimeState: null,
    meta: null,
    entityId: null,
    entityType: null,
    errorMessage: null,
    retryCount: 0,
    maxAttempts: 3,
    nextRetryAt: null,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }) as AiPathRunRecord;

describe('ai-paths access run guards', () => {
  it('grants global run access to ai_paths.manage users', () => {
    const access: AiPathsAccessContext = {
      userId: 'user-a',
      permissions: ['ai_paths.manage'],
      isElevated: false,
    };
    expect(canAccessGlobalAiPathRuns(access)).toBe(true);
    expect(() => assertAiPathRunAccess(access, buildRun(null))).not.toThrow();
  });

  it('scopes users without global permission to own runs', () => {
    const scopedAccess: AiPathsAccessContext = {
      userId: 'user-a',
      permissions: [],
      isElevated: false,
    };
    expect(canAccessGlobalAiPathRuns(scopedAccess)).toBe(false);
    expect(() => assertAiPathRunAccess(scopedAccess, buildRun('user-b'))).toThrow(
      'Run access denied.'
    );
    expect(() => assertAiPathRunAccess(scopedAccess, buildRun('user-a'))).not.toThrow();
  });
});
