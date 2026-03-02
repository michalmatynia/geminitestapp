import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  buildPromptExploderTreeMetadata,
  readPromptExploderTreeMetadata,
  toPromptExploderTreeNodeId,
} from './types';

import type { PromptExploderSegment } from '../types';

const slugifyPathSegment = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  return normalized || 'segment';
};

export const resolvePromptExploderSegmentLabel = (
  segment: PromptExploderSegment,
  index: number
): string => {
  const codeLabel = segment.code?.trim() ?? '';
  if (codeLabel.length > 0) return codeLabel;
  const titleLabel = segment.title?.trim() ?? '';
  if (titleLabel.length > 0) return titleLabel;
  const previewSource = segment.text ?? segment.raw ?? segment.content ?? '';
  const previewLines = previewSource
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (previewLines.length > 0) {
    return previewLines[0]!.slice(0, 80);
  }
  return `Segment ${index + 1}`;
};

export const buildPromptExploderSegmentMasterNodes = (
  segments: PromptExploderSegment[]
): MasterTreeNode[] =>
  segments.map((segment, index) => {
    const name = resolvePromptExploderSegmentLabel(segment, index);
    return {
      id: toPromptExploderTreeNodeId('segment', segment.id),
      type: 'file',
      kind: 'prompt_segment',
      parentId: null,
      name,
      path: `${String(index + 1).padStart(3, '0')}-${slugifyPathSegment(name)}`,
      sortOrder: index,
      metadata: buildPromptExploderTreeMetadata({
        kind: 'segment',
        entityId: segment.id,
        segmentType: segment.type,
        code: segment.code ?? null,
        condition: segment.condition ?? null,
      }),
    } satisfies MasterTreeNode;
  });

export const rebuildPromptExploderSegmentsFromMasterNodes = (args: {
  nodes: MasterTreeNode[];
  previousSegments: PromptExploderSegment[];
}): PromptExploderSegment[] => {
  const previousById = new Map(args.previousSegments.map((segment) => [segment.id, segment]));
  return [...args.nodes]
    .sort((left, right) => {
      const orderDelta = left.sortOrder - right.sortOrder;
      if (orderDelta !== 0) return orderDelta;
      return left.id.localeCompare(right.id);
    })
    .map((node) => {
      const metadata = readPromptExploderTreeMetadata(node);
      const entityId = metadata?.entityId ?? '';
      const previous = previousById.get(entityId);
      if (!previous) {
        throw new Error(`Missing segment payload for master-tree node ${node.id}.`);
      }
      return previous;
    });
};
