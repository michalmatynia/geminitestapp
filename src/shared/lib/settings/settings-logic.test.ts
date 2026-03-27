import { describe, expect, it, vi } from 'vitest';

const { logClientCatchMock } = vi.hoisted(() => ({
  logClientCatchMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
}));

import {
  AI_PATHS_PREFIX_REGEX,
  HEAVY_PREFIX_REGEX,
  applyScopeFilter,
  isAiPathsSettingKey,
  isHeavySettingKey,
  isRuntimeOnlyPathConfigPayload,
  isSettingsTimeoutError,
  isSlowSettingsScope,
  mergeRuntimeOnlyPathConfigWrite,
  parseCaseResolverWorkspaceMetadata,
  parsePathConfigObject,
  parsePositiveInt,
  parseUpdatedAtMsFromPathConfig,
  withSettingsScopeTimeout,
} from './settings-logic';

describe('settings-logic', () => {
  it('classifies heavy and AI-paths keys', () => {
    expect(isHeavySettingKey('image_studio_history')).toBe(true);
    expect(isHeavySettingKey('case_resolver_workspace_v2')).toBe(true);
    expect(isHeavySettingKey('light_setting')).toBe(false);
    expect(isAiPathsSettingKey('ai_paths_config_canvas')).toBe(true);
    expect(isAiPathsSettingKey('other_setting')).toBe(false);
    expect(HEAVY_PREFIX_REGEX.test('base_import_jobs')).toBe(true);
    expect(AI_PATHS_PREFIX_REGEX.test('ai_paths_runtime_state')).toBe(true);
    expect(isSlowSettingsScope('all')).toBe(true);
    expect(isSlowSettingsScope('light')).toBe(false);
    expect(parsePositiveInt('12', 3)).toBe(12);
    expect(parsePositiveInt('-2', 3)).toBe(3);
  });

  it('filters settings by scope while excluding AI-paths config keys', () => {
    const settings = [
      { key: 'light_setting', value: '1' },
      { key: 'agent_personas', value: '2' },
      { key: 'ai_paths_runtime_state', value: '3' },
    ];

    expect(applyScopeFilter(settings as never, 'all')).toEqual([
      { key: 'light_setting', value: '1' },
      { key: 'agent_personas', value: '2' },
    ]);
    expect(applyScopeFilter(settings as never, 'heavy')).toEqual([
      { key: 'agent_personas', value: '2' },
    ]);
    expect(applyScopeFilter(settings as never, 'light')).toEqual([
      { key: 'light_setting', value: '1' },
    ]);
  });

  it('parses case resolver workspace metadata from regex and JSON fallbacks', () => {
    expect(
      parseCaseResolverWorkspaceMetadata(
        '{"workspaceRevision":12,"lastMutationId":"mutation-1"}'
      )
    ).toEqual({
      revision: 12,
      lastMutationId: 'mutation-1',
    });

    expect(
      parseCaseResolverWorkspaceMetadata(
        '{"workspaceRevision":"bad","lastMutationId":"mutation-2"}'
      )
    ).toEqual({
      revision: 0,
      lastMutationId: 'mutation-2',
    });

    expect(parseCaseResolverWorkspaceMetadata('{bad-json')).toEqual({
      revision: 0,
      lastMutationId: null,
    });
    expect(logClientCatchMock).toHaveBeenCalled();
  });

  it('parses and merges runtime-only path config payloads', () => {
    expect(parseUpdatedAtMsFromPathConfig('{"updatedAt":"2026-03-27T10:00:00.000Z"}')).toBe(
      Date.parse('2026-03-27T10:00:00.000Z')
    );
    expect(parseUpdatedAtMsFromPathConfig('{bad-json')).toBeNull();

    expect(parsePathConfigObject('{"nodes":[1],"updatedAt":"2026-03-27T10:00:00.000Z"}')).toEqual({
      nodes: [1],
      updatedAt: '2026-03-27T10:00:00.000Z',
    });
    expect(parsePathConfigObject('[]')).toBeNull();

    expect(
      mergeRuntimeOnlyPathConfigWrite(
        '{"nodes":[1],"edges":[2],"runtimeState":{"status":"old"}}',
        '{"runtimeState":{"status":"new"},"lastRunAt":"2026-03-27T10:00:00.000Z"}'
      )
    ).toBe(
      '{"nodes":[1],"edges":[2],"runtimeState":{"status":"new"},"lastRunAt":"2026-03-27T10:00:00.000Z"}'
    );
    expect(isRuntimeOnlyPathConfigPayload('{"runtimeState":{"status":"ok"}}')).toBe(true);
    expect(isRuntimeOnlyPathConfigPayload('{"runtimeState":{"status":"ok"},"nodes":[1]}')).toBe(
      false
    );
  });

  it('wraps slow scopes with a timeout guard and recognizes timeout errors', async () => {
    await expect(
      withSettingsScopeTimeout('light', 'load-light', Promise.resolve('ok'))
    ).resolves.toBe('ok');

    await expect(
      withSettingsScopeTimeout(
        'heavy',
        'load-heavy',
        new Promise<string>((resolve) => {
          setTimeout(() => resolve('late'), 5);
        })
      )
    ).resolves.toBe('late');

    vi.useFakeTimers();
    try {
      const timeoutPromise = withSettingsScopeTimeout(
        'all',
        'load-timeout',
        new Promise<string>(() => undefined)
      );
      const handledTimeout = timeoutPromise.catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(3_000);
      const error = await handledTimeout;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('[settings] load-timeout timed out');
      expect(isSettingsTimeoutError(error)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
