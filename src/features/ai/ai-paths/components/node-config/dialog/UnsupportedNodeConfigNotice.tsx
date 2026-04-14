import type { AiNode } from '@/shared/contracts/ai-paths';

const SUPPORTED_NODE_TYPES = new Set<AiNode['type']>([
  'trigger',
  'fetcher',
  'simulation',
  'audio_oscillator',
  'audio_speaker',
  'bounds_normalizer',
  'canvas_output',
  'context',
  'parser',
  'regex',
  'iterator',
  'mapper',
  'mutator',
  'string_mutator',
  'validator',
  'validation_pattern',
  'constant',
  'math',
  'function',
  'state',
  'switch',
  'subgraph',
  'template',
  'bundle',
  'gate',
  'compare',
  'logical_condition',
  'router',
  'delay',
  'poll',
  'http',
  'api_advanced',
  'prompt',
  'model',
  'agent',
  'playwright',
  'learner_agent',
  'database',
  'db_schema',
  'viewer',
  'notification',
]);

type UnsupportedNodeConfigNoticeProps = {
  selectedNode: AiNode;
};

export function UnsupportedNodeConfigNotice({
  selectedNode,
}: UnsupportedNodeConfigNoticeProps): React.JSX.Element | null {
  if (SUPPORTED_NODE_TYPES.has(selectedNode.type)) return null;

  return (
    <div className='rounded-md border border-border bg-card/50 p-4 text-sm text-gray-400'>
      No configuration is available for this node yet.
    </div>
  );
}
