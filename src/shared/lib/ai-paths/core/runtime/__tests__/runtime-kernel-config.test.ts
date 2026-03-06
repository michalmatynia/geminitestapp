import { describe, expect, it } from 'vitest';

import {
  normalizeRuntimeKernelConfigRecord,
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';

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
    expect(parseRuntimeKernelCodeObjectResolverIds(' resolver.primary , resolver.fallback ')).toEqual([
      'resolver.primary',
      'resolver.fallback',
    ]);
  });

  it('normalizes canonical live runtime-kernel config to node/resolver fields only', () => {
    expect(
      normalizeRuntimeKernelConfigRecord({
        mode: 'legacy_only',
        nodeTypes: ' Template Node, parser ',
        codeObjectResolverIds: ' resolver.primary , resolver.fallback ',
        strictCodeObjectRegistry: 'yes',
      })
    ).toEqual({
      nodeTypes: ['template_node', 'parser'],
      codeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
    });
  });

  it('drops legacy path-config alias fields without translating them on live reads', () => {
    expect(
      normalizeRuntimeKernelConfigRecord({
        mode: 'legacy_only',
        pilotNodeTypes: ' Template Node, parser ',
        resolverIds: ' resolver.primary , resolver.fallback ',
        strictCodeObjectRegistry: 'yes',
      })
    ).toEqual({});
  });
});
