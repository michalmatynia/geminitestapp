import { describe, expect, it } from 'vitest';

import type { RuntimeState } from '@/features/ai/ai-paths/lib';
import { createDefaultPathConfig } from '@/features/ai/ai-paths/lib';

import { buildRuntimePersistenceConfig } from '../useAiPathsSettingsState.runtime';

describe('buildRuntimePersistenceConfig', () => {
  it('returns null when base config is missing for active path', () => {
    const runtimeState = { inputs: {}, outputs: {} } as unknown as RuntimeState;
    const next = buildRuntimePersistenceConfig({
      activePathId: 'path_missing',
      updatedAt: '2026-02-24T00:00:00.000Z',
      pathConfigs: {},
      runtimeState,
      lastRunAt: null,
    });
    expect(next).toBeNull();
  });

  it('preserves existing flags while updating runtime-only fields', () => {
    const pathId = 'path_runtime';
    const base = {
      ...createDefaultPathConfig(pathId),
      isActive: false,
      isLocked: true,
      runtimeState: { inputs: { old: { value: 1 } }, outputs: {} },
      lastRunAt: '2026-02-23T00:00:00.000Z',
    };
    const runtimeState = { inputs: { nodeA: { value: 42 } }, outputs: {} } as unknown as RuntimeState;
    const updatedAt = '2026-02-24T10:00:00.000Z';

    const next = buildRuntimePersistenceConfig({
      activePathId: pathId,
      updatedAt,
      pathConfigs: { [pathId]: base },
      runtimeState,
      lastRunAt: updatedAt,
    });

    expect(next).not.toBeNull();
    expect(next?.isActive).toBe(false);
    expect(next?.isLocked).toBe(true);
    expect(next?.updatedAt).toBe(updatedAt);
    expect(next?.runtimeState).toEqual(runtimeState);
    expect(next?.lastRunAt).toBe(updatedAt);
  });
});
