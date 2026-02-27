import type { NodeType } from '@/shared/contracts/ai-paths';

export type NodeConfigDocField = {
  /** Dot-path under `node.config` */
  path: string;
  description: string;
  /** Optional typical default shown by UI */
  defaultValue?: string;
};

export type AiPathsNodeDoc = {
  type: NodeType;
  title: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  config: NodeConfigDocField[];
  defaultConfig?: Record<string, unknown>;
  notes?: string[];
};
