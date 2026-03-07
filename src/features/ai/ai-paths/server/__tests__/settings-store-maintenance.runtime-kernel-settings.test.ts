import { describe, expect, it } from 'vitest';

import {
  buildAiPathsMaintenanceReport,
  runMaintenanceAction,
} from '@/features/ai/ai-paths/server/settings-store.maintenance';
import type { AiPathsSettingRecord } from '@/features/ai/ai-paths/server/settings-store.constants';
import {
  AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
  AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
} from '@/shared/lib/ai-paths/core/constants';
import {
  DEPRECATED_AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
  DEPRECATED_AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
  DEPRECATED_AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-legacy-aliases';
import { AI_PATHS_CONFIG_KEY_PREFIX } from '@/features/ai/ai-paths/server/settings-store.constants';

describe('AI Paths maintenance runtime-kernel settings normalization', () => {
  it('surfaces normalization action when deprecated runtime mode is stored', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: DEPRECATED_AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
        value: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
      },
    ];

    const report = buildAiPathsMaintenanceReport(records);
    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'normalize_runtime_kernel_settings',
          status: 'pending',
          affectedRecords: 1,
        }),
      ])
    );
  });

  it('prunes deprecated runtime mode setting', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: DEPRECATED_AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
        value: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
      },
    ];

    const result = runMaintenanceAction({
      actionId: 'normalize_runtime_kernel_settings',
      records,
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);
    expect(result.deletedKeys).toEqual([DEPRECATED_AI_PATHS_RUNTIME_KERNEL_MODE_KEY]);
    expect(result.nextRecords).toEqual([]);
  });

  it('normalizes runtime-kernel node type and resolver id list values', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: DEPRECATED_AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
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
          id: 'normalize_runtime_kernel_settings',
          status: 'pending',
          affectedRecords: 2,
        }),
      ])
    );

    const result = runMaintenanceAction({
      actionId: 'normalize_runtime_kernel_settings',
      records,
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(2);
    expect(result.deletedKeys).toEqual([DEPRECATED_AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY]);
    expect(result.nextRecords).toEqual([
      {
        key: AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
        value: 'constant, math, template_node',
      },
      {
        key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
        value: 'resolver.primary, resolver.fallback',
      },
    ]);
  });

  it('prunes deprecated runtime-kernel strict native registry setting', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: DEPRECATED_AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
        value: ' YES ',
      },
    ];

    const report = buildAiPathsMaintenanceReport(records);
    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'normalize_runtime_kernel_settings',
          status: 'pending',
          affectedRecords: 1,
        }),
      ])
    );

    const result = runMaintenanceAction({
      actionId: 'normalize_runtime_kernel_settings',
      records,
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);
    expect(result.deletedKeys).toEqual([
      DEPRECATED_AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
    ]);
    expect(result.nextRecords).toEqual([]);
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
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD]: ' Template Node, parser ',
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]:
                ' resolver.primary , resolver.fallback ',
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: ' YES ',
            },
          },
        }),
      },
    ];

    const report = buildAiPathsMaintenanceReport(records);
    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'normalize_runtime_kernel_settings',
          status: 'pending',
          affectedRecords: 1,
        }),
      ])
    );
  });

  it('prunes path runtime-kernel legacy mode/strict fields while normalizing live extension values', () => {
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
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD]: ' Template Node, parser ',
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]:
                ' resolver.primary , resolver.fallback ',
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: ' YES ',
            },
          },
        }),
      },
    ];

    const result = runMaintenanceAction({
      actionId: 'normalize_runtime_kernel_settings',
      records,
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);
    expect(result.deletedKeys).toEqual([]);
    const parsed = JSON.parse(result.nextRecords[0]?.value ?? '{}') as Record<string, unknown>;
    const extensions = parsed['extensions'] as Record<string, unknown>;
    const runtimeKernel = extensions?.['runtimeKernel'] as Record<string, unknown>;
    expect(runtimeKernel).toEqual({
      nodeTypes: ['template_node', 'parser'],
      codeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
    });
  });
});
