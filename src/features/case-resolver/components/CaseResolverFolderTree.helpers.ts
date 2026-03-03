import { Brain, Sparkles } from 'lucide-react';

import { palette } from '@/shared/lib/ai-paths/core/definitions';
import {
  type NodeDefinition,
  type PaletteEntry,
  type FolderCaseFileStats,
} from '@/shared/contracts/case-resolver';

export type { PaletteEntry, FolderCaseFileStats };
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const promptDefinition = palette.find((entry: NodeDefinition) => entry.type === 'prompt') ?? null;
const modelDefinition = palette.find((entry: NodeDefinition) => entry.type === 'model') ?? null;

export const CASE_RESOLVER_PALETTE: PaletteEntry[] = [
  {
    id: 'prompt',
    label: 'Prompt Node',
    description: 'Functional runtime prompt node.',
    definition: promptDefinition,
    toneClassName: 'border-violet-500/40 text-violet-100 hover:bg-violet-500/12',
    Icon: Sparkles,
  },
  {
    id: 'model',
    label: 'AI Model Node',
    description: 'Functional model execution node.',
    definition: modelDefinition,
    toneClassName: 'border-cyan-500/40 text-cyan-100 hover:bg-cyan-500/12',
    Icon: Brain,
  },
];

export const resolveAssetKind = (kind: unknown): 'node_file' | 'image' | 'pdf' | 'file' => {
  if (kind === 'node_file' || kind === 'image' || kind === 'pdf' || kind === 'file') {
    return kind;
  }
  return 'file';
};

export const parseString = (value: unknown): string => (typeof value === 'string' ? value : '');

export const parseNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

export const parseNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const isCaseResolverDraggableFileNode = (input: {
  nodeType: MasterTreeNode['type'];
  fileType: string;
  isVirtualSectionNode: boolean;
}): boolean => {
  if (input.isVirtualSectionNode) return false;
  if (input.nodeType !== 'file') return false;
  return input.fileType.trim().toLowerCase() !== 'case';
};

export const canStartCaseResolverTreeNodeDrag = (input: {
  nodeType: MasterTreeNode['type'];
  nodeId: string;
  isVirtualSectionNode: boolean;
  fromHandleGesture: boolean;
  armedNodeId: string | null;
}): boolean => {
  if (input.isVirtualSectionNode) return false;
  if (input.nodeType !== 'file') return true;
  if (input.fromHandleGesture) return true;
  return input.armedNodeId === input.nodeId;
};
