import { Brain, Sparkles } from 'lucide-react';

import { palette } from '@/features/ai/ai-paths/lib';

import type React from 'react';

import { type NodeDefinition } from '../types';

export type PaletteEntry = {
  id: string;
  label: string;
  description: string;
  definition: NodeDefinition | null;
  toneClassName: string;
  Icon: React.ComponentType<{ className?: string }>;
};

export type FolderCaseFileStats = {
  total: number;
  locked: number;
};

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
