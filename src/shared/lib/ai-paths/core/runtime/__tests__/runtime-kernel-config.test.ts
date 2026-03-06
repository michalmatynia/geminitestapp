import { describe, expect, it } from 'vitest';

import {
  normalizeRuntimeKernelConfigRecord,
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
  parseRuntimeKernelStrictNativeRegistry,
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

  it('parses runtime-kernel resolver ids and strict-native flags', () => {
    expect(parseRuntimeKernelCodeObjectResolverIds(' resolver.primary , resolver.fallback ')).toEqual([
      'resolver.primary',
      'resolver.fallback',
    ]);
    expect(parseRuntimeKernelStrictNativeRegistry('yes')).toBe(true);
    expect(parseRuntimeKernelStrictNativeRegistry('0')).toBe(false);
  });

  it('normalizes legacy runtime-kernel config aliases into canonical fields', () => {
    expect(
      normalizeRuntimeKernelConfigRecord({
        pilotNodeTypes: ' Template Node, parser ',
        resolverIds: ' resolver.primary , resolver.fallback ',
        strictCodeObjectRegistry: 'yes',
      })
    ).toEqual({
      nodeTypes: ['template_node', 'parser'],
      codeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
      strictNativeRegistry: true,
    });
  });
});
