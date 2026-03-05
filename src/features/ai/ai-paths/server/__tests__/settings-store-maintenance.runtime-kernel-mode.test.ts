import { describe, expect, it } from 'vitest';

import {
  buildAiPathsMaintenanceReport,
  runMaintenanceAction,
} from '@/features/ai/ai-paths/server/settings-store.maintenance';
import type { AiPathsSettingRecord } from '@/features/ai/ai-paths/server/settings-store.constants';
import {
  AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
  AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
  AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
  AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
} from '@/shared/lib/ai-paths/core/constants';
import { AI_PATHS_CONFIG_KEY_PREFIX } from '@/features/ai/ai-paths/server/settings-store.constants';

describe('AI Paths maintenance runtime-kernel mode normalization', () => {
  it('surfaces normalization action when deprecated runtime mode is stored', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
        value: 'legacy_only',
      },
    ];

    const report = buildAiPathsMaintenanceReport(records);
    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'normalize_runtime_kernel_mode',
          status: 'pending',
          affectedRecords: 1,
        }),
      ])
    );
  });

  it('normalizes deprecated runtime mode to auto', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
        value: 'legacy_only',
      },
    ];

    const result = runMaintenanceAction({
      actionId: 'normalize_runtime_kernel_mode',
      records,
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);
    expect(result.nextRecords).toEqual([
      {
        key: AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
        value: 'auto',
      },
    ]);
  });

  it('normalizes runtime-kernel pilot node and resolver id list values', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
        value: ' Constant , math, Template Node, math ',
      },
      {
        key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
        value: ' resolver.primary ,resolver.fallback, resolver.primary ',
      },
    ];

    const report = buildAiPathsMaintenanceReport(records);
    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'normalize_runtime_kernel_mode',
          status: 'pending',
          affectedRecords: 2,
        }),
      ])
    );

    const result = runMaintenanceAction({
      actionId: 'normalize_runtime_kernel_mode',
      records,
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(2);
    expect(result.nextRecords).toEqual([
      {
        key: AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
        value: 'constant, math, template_node',
      },
      {
        key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
        value: 'resolver.primary, resolver.fallback',
      },
    ]);
  });

  it('normalizes runtime-kernel strict native registry boolean setting values', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
        value: ' YES ',
      },
    ];

    const report = buildAiPathsMaintenanceReport(records);
    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'normalize_runtime_kernel_mode',
          status: 'pending',
          affectedRecords: 1,
        }),
      ])
    );

    const result = runMaintenanceAction({
      actionId: 'normalize_runtime_kernel_mode',
      records,
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);
    expect(result.nextRecords).toEqual([
      {
        key: AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
        value: 'true',
      },
    ]);
  });

  it('surfaces normalization action when path runtime-kernel extensions use legacy aliases', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: `${AI_PATHS_CONFIG_KEY_PREFIX}path-main`,
        value: JSON.stringify({
          id: 'path-main',
          name: 'Path Main',
          description: '',
          trigger: 'manual',
          version: 1,
          updatedAt: '2026-03-05T00:00:00.000Z',
          nodes: [],
          edges: [],
          extensions: {
            runtimeKernel: {
              mode: 'legacy_only',
              pilotNodeTypes: ' Template Node, parser ',
              resolverIds: ' resolver.primary , resolver.fallback ',
              strictCodeObjectRegistry: ' YES ',
            },
          },
        }),
      },
    ];

    const report = buildAiPathsMaintenanceReport(records);
    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'normalize_runtime_kernel_mode',
          status: 'pending',
          affectedRecords: 1,
        }),
      ])
    );
  });

  it('normalizes path runtime-kernel legacy fields into canonical extension values', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: `${AI_PATHS_CONFIG_KEY_PREFIX}path-main`,
        value: JSON.stringify({
          id: 'path-main',
          name: 'Path Main',
          description: '',
          trigger: 'manual',
          version: 1,
          updatedAt: '2026-03-05T00:00:00.000Z',
          nodes: [],
          edges: [],
          extensions: {
            runtimeKernel: {
              mode: 'legacy_only',
              pilotNodeTypes: ' Template Node, parser ',
              resolverIds: ' resolver.primary , resolver.fallback ',
              strictCodeObjectRegistry: ' YES ',
            },
          },
        }),
      },
    ];

    const result = runMaintenanceAction({
      actionId: 'normalize_runtime_kernel_mode',
      records,
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);
    const parsed = JSON.parse(result.nextRecords[0]?.value ?? '{}') as Record<string, unknown>;
    const extensions = parsed['extensions'] as Record<string, unknown>;
    const runtimeKernel = extensions?.['runtimeKernel'] as Record<string, unknown>;
    expect(runtimeKernel).toEqual({
      mode: 'auto',
      pilotNodeTypes: ['template_node', 'parser'],
      codeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
      strictNativeRegistry: true,
    });
  });
});
