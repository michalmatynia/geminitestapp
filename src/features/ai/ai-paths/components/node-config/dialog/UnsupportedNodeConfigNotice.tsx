'use client';

import type { AiNode } from '@/features/ai/ai-paths/lib';

const SUPPORTED_NODE_TYPES = new Set<AiNode['type']>([
  'trigger',
  'simulation',
  'context',
  'parser',
  'regex',
  'iterator',
  'mapper',
  'mutator',
  'validator',
  'constant',
  'math',
  'template',
  'bundle',
  'gate',
  'compare',
  'router',
  'delay',
  'poll',
  'http',
  'prompt',
  'model',
  'agent',
  'learner_agent',
  'database',
  'db_schema',
  'viewer',
  'notification',
  'ai_description',
  'description_updater',
]);

type UnsupportedNodeConfigNoticeProps = {
  selectedNode: AiNode;
};

export function UnsupportedNodeConfigNotice({
  selectedNode,
}: UnsupportedNodeConfigNoticeProps): React.JSX.Element | null {
  if (SUPPORTED_NODE_TYPES.has(selectedNode.type)) return null;

  return (
    <div className="rounded-md border border-border bg-card/50 p-4 text-sm text-gray-400">
      No configuration is available for this node yet.
    </div>
  );
}
