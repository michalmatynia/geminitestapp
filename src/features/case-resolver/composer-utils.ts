import {
  type CaseResolverJoinMode,
  type AiNode,
  type CaseResolverEdge,
  type CaseResolverNodeMeta,
  type CaseResolverEdgeMeta,
} from '@/shared/contracts/case-resolver';
import {
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
} from '@/shared/contracts/case-resolver/constants';
import { stripHtml } from './utils/text-sanitization';

type CaseResolverOutputChannels = {
  wysiwygText: string;
  plaintextContent: string;
  plainText: string;
  wysiwygContent: string;
};

export const JOIN_VALUE_MAP: Record<CaseResolverJoinMode, string> = {
  newline: '\n',
  none: '',
  space: ' ',
  tab: '\t',
};

export const resolveNodeMeta = (
  nodeId: string,
  nodeMeta: Record<string, CaseResolverNodeMeta>,
  fallback: CaseResolverNodeMeta = DEFAULT_CASE_RESOLVER_NODE_META
): CaseResolverNodeMeta => ({
  ...fallback,
  ...(nodeMeta[nodeId] ?? {}),
});

export const resolveEdgeMeta = (
  edgeId: string,
  edgeMeta: Record<string, CaseResolverEdgeMeta>
): CaseResolverEdgeMeta => ({
  ...DEFAULT_CASE_RESOLVER_EDGE_META,
  ...(edgeMeta[edgeId] ?? {}),
});

export const resolveSourceOutputValue = (
  outputs: CaseResolverOutputChannels | undefined,
  sourceHandle: string | null | undefined,
  fallbackType: keyof CaseResolverOutputChannels
): string => {
  if (outputs === undefined) return '';
  if (sourceHandle === 'wysiwygText') return outputs.wysiwygText;
  if (sourceHandle === 'plaintextContent') return outputs.plaintextContent;
  if (sourceHandle === 'plainText') return outputs.plainText;
  if (sourceHandle === 'wysiwygContent') return outputs.wysiwygContent;
  return outputs[fallbackType];
};

export const resolveNodeText = (node: AiNode): string => {
  const promptTemplate = node.config?.prompt?.template;
  if (typeof promptTemplate === 'string' && promptTemplate.trim().length > 0) {
    return stripHtml(promptTemplate);
  }
  const noteText = node.config?.notes?.text;
  if (typeof noteText === 'string' && noteText.trim().length > 0) {
    return stripHtml(noteText);
  }
  return '';
};

export const resolveNodeWysiwygText = (node: AiNode): string => {
  const promptTemplate = node.config?.prompt?.template;
  if (typeof promptTemplate === 'string' && promptTemplate.trim().length > 0) {
    return promptTemplate;
  }
  const noteText = node.config?.notes?.text;
  if (typeof noteText === 'string' && noteText.trim().length > 0) {
    return noteText;
  }
  return '';
};

export const wrapByQuoteMode = (value: string, meta: CaseResolverNodeMeta): string => {
  const wrappedValue = wrapByQuoteModeWithoutColor(value, meta);
  if (!wrappedValue) return wrappedValue;
  const canApplyHtmlColorWrapper = meta.role !== 'explanatory';
  const normalizedColor =
    canApplyHtmlColorWrapper &&
    typeof meta.textColor === 'string' &&
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(meta.textColor.trim())
      ? meta.textColor.trim()
      : '';
  if (!normalizedColor) return wrappedValue;
  return `<span style="color: ${normalizedColor};">${wrappedValue}</span>`;
};

export const wrapByQuoteModeWithoutColor = (value: string, meta: CaseResolverNodeMeta): string => {
  if (!value) return value;
  const quotedValue =
    meta.quoteMode === 'double' ? `"${value}"` : meta.quoteMode === 'single' ? `'${value}'` : value;
  return `${meta.surroundPrefix}${quotedValue}${meta.surroundSuffix}${
    meta.appendTrailingNewline ? '\n' : ''
  }`;
};

export const sortNodeIdsByPosition = (nodes: AiNode[]): string[] =>
  [...nodes]
    .sort((left: AiNode, right: AiNode) => {
      if (left.position.y !== right.position.y) return left.position.y - right.position.y;
      if (left.position.x !== right.position.x) return left.position.x - right.position.x;
      return left.id.localeCompare(right.id);
    })
    .map((node: AiNode) => node.id);

export const appendWithJoin = (current: string, value: string, joinMode: CaseResolverJoinMode): string => {
  if (!value) return current;
  if (!current) return value;
  return `${current}${JOIN_VALUE_MAP[joinMode]}${value}`;
};

export const sortEdgesBySourcePosition = (edges: CaseResolverEdge[], nodeById: Map<string, AiNode>): CaseResolverEdge[] => {
  return [...edges].sort((left: CaseResolverEdge, right: CaseResolverEdge) => {
    const leftNode = left.source ? nodeById.get(left.source) : undefined;
    const rightNode = right.source ? nodeById.get(right.source) : undefined;
    if (leftNode && rightNode) {
      if (leftNode.position.y !== rightNode.position.y) {
        return leftNode.position.y - rightNode.position.y;
      }
      if (leftNode.position.x !== rightNode.position.x) {
        return leftNode.position.x - rightNode.position.x;
      }
      if (leftNode.id !== rightNode.id) {
        return leftNode.id.localeCompare(rightNode.id);
      }
    } else if (leftNode || rightNode) {
      return leftNode ? -1 : 1;
    }
    return left.id.localeCompare(right.id);
  });
};
