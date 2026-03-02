import { describe, expect, it } from 'vitest';

import {
  buildPromptExploderSegmentMasterNodes,
  rebuildPromptExploderSegmentsFromMasterNodes,
} from '@/features/prompt-exploder/tree/segment-master-tree';
import type { PromptExploderSegment } from '@/features/prompt-exploder/types';

const createSegment = (overrides: Partial<PromptExploderSegment>): PromptExploderSegment => ({
  id: overrides.id ?? `segment_${Math.random().toString(36).slice(2, 8)}`,
  type: overrides.type ?? 'assigned_text',
  title: overrides.title ?? null,
  content: overrides.content ?? '',
  condition: overrides.condition ?? null,
  items: overrides.items ?? [],
  listItems: overrides.listItems ?? [],
  subsections: overrides.subsections ?? [],
  bindingKey: overrides.bindingKey ?? null,
  text: overrides.text ?? null,
  raw: overrides.raw ?? null,
  paramsText: overrides.paramsText ?? null,
  paramsObject: overrides.paramsObject ?? null,
  paramUiControls: overrides.paramUiControls ?? {},
  paramComments: overrides.paramComments ?? {},
  paramDescriptions: overrides.paramDescriptions ?? {},
  code: overrides.code ?? null,
  includeInOutput: overrides.includeInOutput ?? true,
  confidence: overrides.confidence ?? 0,
  matchedPatternIds: overrides.matchedPatternIds ?? [],
  matchedPatternLabels: overrides.matchedPatternLabels ?? [],
  matchedSequenceLabels: overrides.matchedSequenceLabels ?? [],
  isHeading: overrides.isHeading,
  treatAsHeading: overrides.treatAsHeading,
  suggestedTreatAsHeading: overrides.suggestedTreatAsHeading,
  ruleCount: overrides.ruleCount,
  ruleStack: overrides.ruleStack,
  validationResults: overrides.validationResults ?? [],
  bindings: overrides.bindings,
  segments: overrides.segments ?? [],
});

describe('segment-master-tree', () => {
  it('builds flat root-level master nodes for top-level segments', () => {
    const nodes = buildPromptExploderSegmentMasterNodes([
      createSegment({ id: 'segment-a', code: 'A1', type: 'metadata' }),
      createSegment({ id: 'segment-b', text: 'Body text' }),
    ]);

    expect(nodes).toHaveLength(2);
    expect(nodes.every((node) => node.parentId === null)).toBe(true);
    expect(nodes.every((node) => node.type === 'file')).toBe(true);
    expect(nodes.every((node) => node.kind === 'prompt_segment')).toBe(true);
  });

  it('rebuilds segment order from reordered master nodes', () => {
    const segments = [
      createSegment({ id: 'segment-a', code: 'A1' }),
      createSegment({ id: 'segment-b', code: 'B1' }),
      createSegment({ id: 'segment-c', code: 'C1' }),
    ];
    const nodes = buildPromptExploderSegmentMasterNodes(segments);
    const reorderedNodes = [nodes[2]!, nodes[0]!, nodes[1]!].map((node, index) => ({
      ...node,
      sortOrder: index,
    }));

    const rebuilt = rebuildPromptExploderSegmentsFromMasterNodes({
      nodes: reorderedNodes,
      previousSegments: segments,
    });

    expect(rebuilt.map((segment) => segment.id)).toEqual(['segment-c', 'segment-a', 'segment-b']);
  });
});
