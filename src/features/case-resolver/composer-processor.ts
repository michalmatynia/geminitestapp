import {
  type AiNode,
  type CaseResolverNodeMeta,
  type CaseResolverCompiledSegment,
} from '@/shared/contracts/case-resolver';
import { resolveNodeMeta } from './composer-utils';
import { computeNodeOutput, type NodeOutput } from './composer-compiler';

export type CompilationState = {
  outputsByNode: Record<string, NodeOutput>;
  segments: CaseResolverCompiledSegment[];
};

export const processNode = (
  node: AiNode,
  nodeMeta: Record<string, CaseResolverNodeMeta>,
  incoming: {
    plainText: { value: string; firstJoinMode: any };
    plaintextContent: { value: string; firstJoinMode: any };
    wysiwygContent: { value: string; firstJoinMode: any };
  },
  transform: ((input: any) => string) | undefined
): { output: NodeOutput, segment: CaseResolverCompiledSegment } => {
  const meta = resolveNodeMeta(node.id, nodeMeta, { role: 'text_note', includeInOutput: true, quoteMode: 'none', surroundPrefix: '', surroundSuffix: '', appendTrailingNewline: false });
  
  const nodeOutput = computeNodeOutput(node, meta, incoming, transform);

  const segment: CaseResolverCompiledSegment = {
    id: `seg-${node.id}`,
    nodeId: node.id,
    role: meta.role || '',
    content: nodeOutput.wysiwygText,
    title: node.title || '',
    text: nodeOutput.plainText,
    includeInOutput: meta.includeInOutput,
    metadata: {
      title: node.title,
      includeInOutput: meta.includeInOutput,
    },
  };

  return { output: nodeOutput, segment };
};
