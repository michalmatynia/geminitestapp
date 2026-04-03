import { describe, expect, it } from 'vitest';

import {
  normalizeRuntimeKernelConfigRecord,
  normalizeRuntimeKernelConfigRecordDetailed,
  normalizeRuntimeKernelValueSource,
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import {
  DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-legacy-aliases';

describe('runtime-kernel-config helpers', () => {
  it('parses runtime-kernel node types from string and json list inputs', () => {
    expect(parseRuntimeKernelNodeTypes(' Template Node, parser ')).toEqual([
      'template_node',
      'parser',
    ]);
    expect(parseRuntimeKernelNodeTypes('["constant"," Template "]')).toEqual([
      'constant',
      'template',
    ]);
  });

  it('parses runtime-kernel resolver ids', () => {
    expect(
      parseRuntimeKernelCodeObjectResolverIds(' resolver.primary , resolver.fallback ')
    ).toEqual(['resolver.primary', 'resolver.fallback']);
  });

  it('normalizes runtime-kernel source labels', () => {
    expect(normalizeRuntimeKernelValueSource('env')).toBe('env');
    expect(normalizeRuntimeKernelValueSource('default')).toBe('default');
    expect(normalizeRuntimeKernelValueSource('invalid')).toBeNull();
    expect(normalizeRuntimeKernelValueSource(null)).toBeNull();
  });

  it('normalizes canonical live runtime-kernel config to node/resolver fields only', () => {
    expect(
      normalizeRuntimeKernelConfigRecord({
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
        nodeTypes: ' Template Node, parser ',
        codeObjectResolverIds: ' resolver.primary , resolver.fallback ',
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: 'yes',
      })
    ).toEqual({
      nodeTypes: ['template_node', 'parser'],
      codeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
    });
  });

  it('drops legacy path-config alias fields without translating them on live reads', () => {
    expect(
      normalizeRuntimeKernelConfigRecord({
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD]: ' Template Node, parser ',
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]:
          ' resolver.primary , resolver.fallback ',
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: 'yes',
      })
    ).toEqual({});
  });

  it('translates legacy path-config aliases when cleanup explicitly requests it', () => {
    expect(
      normalizeRuntimeKernelConfigRecord(
        {
          [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
          [DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD]: ' Template Node, parser ',
          [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]:
            ' resolver.primary , resolver.fallback ',
          [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: 'yes',
        },
        {
          translateLegacyAliases: true,
        }
      )
    ).toEqual({
      nodeTypes: ['template_node', 'parser'],
      codeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
    });
  });

  it('reports changed fields when canonical values are normalized or legacy aliases are removed', () => {
    expect(
      normalizeRuntimeKernelConfigRecordDetailed(
        {
          nodeTypes: ' Template Node, parser ',
          [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]: ' resolver.primary ',
          [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
        },
        {
          translateLegacyAliases: true,
        }
      )
    ).toEqual({
      changed: true,
      value: {
        nodeTypes: ['template_node', 'parser'],
        codeObjectResolverIds: ['resolver.primary'],
      },
      changedFields: ['mode', 'nodeTypes', 'codeObjectResolverIds'],
    });
  });
});
