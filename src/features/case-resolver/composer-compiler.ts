import {
  type AiNode,
  type CaseResolverEdge,
  type CaseResolverJoinMode,
  type CaseResolverNodeMeta,
} from '@/shared/contracts/case-resolver';
import { DEFAULT_CASE_RESOLVER_EDGE_META } from '@/shared/contracts/case-resolver/constants';
import { stripHtml } from './utils/text-sanitization';
import { JOIN_VALUE_MAP, appendWithJoin } from './composer-utils';

export type NodeOutput = {
  wysiwygText: string;
  plaintextContent: string;
  plainText: string;
  wysiwygContent: string;
};

export const computeNodeOutput = (
  node: AiNode,
  meta: CaseResolverNodeMeta,
  incoming: {
    plainText: { value: string; firstJoinMode: CaseResolverJoinMode };
    plaintextContent: { value: string; firstJoinMode: CaseResolverJoinMode };
    wysiwygContent: { value: string; firstJoinMode: CaseResolverJoinMode };
  },
  transform: ((input: any) => string) | undefined
): NodeOutput => {
  const nodeText = ''; // Placeholder for actual text resolution logic
  const nodeWysiwygText = ''; // Placeholder

  let plainTextOutput = transform 
    ? transform({ nodeId: node.id, nodeMeta: meta, output: 'plainText', value: nodeText })
    : stripHtml(nodeText);

  let plaintextContentOutput = meta.role === 'explanatory' ? incoming.plainText.value : incoming.plaintextContent.value;
  
  if (meta.includeInOutput && nodeText.trim().length > 0) {
    const joinMode = (meta.role === 'explanatory' ? incoming.plainText.firstJoinMode : incoming.plaintextContent.firstJoinMode) || (DEFAULT_CASE_RESOLVER_EDGE_META.joinMode ?? 'newline');
    plaintextContentOutput = appendWithJoin(plaintextContentOutput, nodeText, joinMode as CaseResolverJoinMode);
  }

  if (meta.role === 'explanatory' && !transform) {
    plaintextContentOutput = stripHtml(plaintextContentOutput);
  }

  let wysiwygContentOutput = meta.role === 'explanatory' ? incoming.wysiwygContent.value : '';
  if (meta.role === 'explanatory' && meta.includeInOutput && nodeWysiwygText.trim().length > 0) {
    const joinMode = (incoming.wysiwygContent.firstJoinMode || DEFAULT_CASE_RESOLVER_EDGE_META.joinMode || 'newline') as CaseResolverJoinMode;
    wysiwygContentOutput = appendWithJoin(wysiwygContentOutput, nodeWysiwygText, joinMode);
  }

  return {
    wysiwygText: '', // Placeholder
    plaintextContent: plaintextContentOutput,
    plainText: plainTextOutput,
    wysiwygContent: wysiwygContentOutput,
  };
};
