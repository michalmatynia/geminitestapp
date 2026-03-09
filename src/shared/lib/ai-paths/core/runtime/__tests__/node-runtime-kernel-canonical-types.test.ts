import { describe, expect, it } from 'vitest';

import { REMOVED_LEGACY_AI_PATH_NODE_TYPES } from '@/shared/lib/ai-paths/core/utils/legacy-node-removal';
import { NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';

describe('NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES', () => {
  it('does not include removed legacy node types', () => {
    const runtimeKernelNodeTypes = new Set<string>(NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES);

    for (const removedNodeType of REMOVED_LEGACY_AI_PATH_NODE_TYPES) {
      expect(runtimeKernelNodeTypes.has(removedNodeType)).toBe(false);
    }
  });

  it('contains unique runtime-kernel node types', () => {
    expect(new Set(NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES).size).toBe(
      NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES.length
    );
  });
});
