import { describe, expect, it } from 'vitest';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths';
import type { AiNode } from '@/shared/contracts/ai-paths';

import { collectInvalidRunNodePayloadIssues } from '../payload-validation';

describe('collectInvalidRunNodePayloadIssues', () => {
  it('returns no issues for canonical nodes', () => {
    const config = createDefaultPathConfig('path_payload_guard_ok');
    const issues = collectInvalidRunNodePayloadIssues(config.nodes);
    expect(issues).toEqual([]);
  });

  it('reports missing node timestamp metadata', () => {
    const config = createDefaultPathConfig('path_payload_guard_missing');
    const [first, ...rest] = config.nodes;
    expect(first).toBeDefined();
    const brokenNode = {
      ...(first as AiNode),
      createdAt: undefined,
      updatedAt: undefined,
    } as unknown as AiNode;
    const issues = collectInvalidRunNodePayloadIssues([brokenNode, ...rest]);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      nodeId: brokenNode.id,
      missingFields: ['createdAt', 'updatedAt'],
    });
  });
});

