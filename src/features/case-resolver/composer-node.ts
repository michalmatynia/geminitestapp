import { type AiNode, type CaseResolverGraph, type CaseResolverJoinMode, type CaseResolverNodeMeta } from '@/shared/contracts/case-resolver';
import type { CaseResolverCompiledSegment } from '@/shared/contracts/case-resolver/capture';
import { stripHtml } from './utils/text-sanitization';
import {
  appendWithJoin,
  resolveEdgeMeta,
  resolveNodeMeta,
  resolveNodeText,
  resolveSourceOutputValue,
  sortEdgesBySourcePosition,
  wrapByQuoteMode,
  wrapByQuoteModeWithoutColor,
} from './composer-utils';
import {
  type GraphContext,
  type NodeOutputs,
  isAcceptedPort,
} from './composer-graph';

export type CaseResolverPlainTextTransformInput = {
  nodeId: string;
  nodeMeta: CaseResolverNodeMeta;
  output: 'plainText' | 'plaintextContent';
  value: string;
};

export type CaseResolverCompileOptions = {
  transformPlainTextOutput?: (input: CaseResolverPlainTextTransformInput) => string;
};

export interface CollectIncomingParams {
  nodeId: string;
  type: keyof NodeOutputs;
  context: GraphContext;
  outputsByNode: Record<string, NodeOutputs>;
  graph: CaseResolverGraph;
}

export const collectIncoming = ({
  nodeId,
  type,
  context,
  outputsByNode,
  graph
}: CollectIncomingParams): { value: string; firstJoinMode: CaseResolverJoinMode | null } => {
  let value = '';
  let firstJoinMode: CaseResolverJoinMode | null = null;
  const incomingEdges = sortEdgesBySourcePosition(context.incomingByNode.get(nodeId) ?? [], context.nodeById);

  incomingEdges.forEach((edge): void => {
    const targetHandle = edge.targetHandle;
    const isAccepted = isAcceptedPort(type, targetHandle);
    if (!isAccepted || edge.source === undefined) return;
    
    const sourceOutputs = outputsByNode[edge.source];
    if (sourceOutputs === undefined) return;

    
    const rawSourceValue = resolveSourceOutputValue(sourceOutputs, edge.sourceHandle, type);
    const sourceValue = type === 'plainText' ? stripHtml(rawSourceValue) : rawSourceValue;
    if (sourceValue.length === 0) return;
    
    const edgeJoinMode = resolveEdgeMeta(edge.id, graph.edgeMeta || {}).joinMode ?? 'newline';
    if (firstJoinMode === null) {
      firstJoinMode = edgeJoinMode;
    }
    value = appendWithJoin(value, sourceValue, edgeJoinMode);
  });

  return { value, firstJoinMode };
};


export const resolveIncomingText = (
  meta: CaseResolverNodeMeta,
  wysiwyg: { value: string; firstJoinMode: CaseResolverJoinMode | null },
  plain: { value: string; firstJoinMode: CaseResolverJoinMode | null },
  plainContent: { value: string; firstJoinMode: CaseResolverJoinMode | null }
): { text: string; joinMode: CaseResolverJoinMode } => {
  if (wysiwyg.value.trim().length > 0) {
    return { text: wysiwyg.value, joinMode: wysiwyg.firstJoinMode ?? 'newline' };
  }
  if (plain.value.trim().length > 0) {
    return { text: plain.value, joinMode: plain.firstJoinMode ?? 'newline' };
  }
  if (meta.role === 'explanatory' && plainContent.value.trim().length > 0) {
    return { text: plainContent.value, joinMode: plainContent.firstJoinMode ?? 'newline' };
  }
  return { text: '', joinMode: 'newline' };
};

export const resolveResolvedWysiwygText = (
  meta: CaseResolverNodeMeta,
  incomingText: string,
  nodeText: string,
  incomingTextJoinMode: CaseResolverJoinMode
): string => {
  if (meta.role === 'explanatory' && incomingText.trim().length > 0 && nodeText.trim().length > 0) {
    return appendWithJoin(incomingText, nodeText, incomingTextJoinMode);
  }
  return incomingText.trim().length > 0 ? incomingText : nodeText;
};

export const resolvePlainTextOutput = (
  nodeId: string,
  meta: CaseResolverNodeMeta,
  value: string,
  options: CaseResolverCompileOptions
): string => {
  const wrapped = wrapByQuoteModeWithoutColor(value, meta);
  if (options.transformPlainTextOutput === undefined) {
    return stripHtml(wrapped);
  }
  return options.transformPlainTextOutput({
    nodeId,
    nodeMeta: meta,
    output: 'plainText',
    value: wrapped,
  });
};

export const resolvePlaintextContentOutput = (
  nodeId: string,
  meta: CaseResolverNodeMeta,
  options: CaseResolverCompileOptions,
  params: {
    isExplanatory: boolean;
    plainTextValue: string;
    plaintextContentValue: string;
    plainTextJoinMode: CaseResolverJoinMode | null;
    plaintextContentJoinMode: CaseResolverJoinMode | null;
    wrappedSecondaryText: string;
  }
): string => {
  let output = params.isExplanatory ? params.plainTextValue : params.plaintextContentValue;
  const includeInOutput = meta.includeInOutput ?? false;
  
  if (includeInOutput && params.wrappedSecondaryText.trim().length > 0) {
    const joinMode = (params.isExplanatory ? params.plainTextJoinMode : params.plaintextContentJoinMode) ?? 'newline';
    output = appendWithJoin(output, params.wrappedSecondaryText, joinMode);
  }
  
  if (meta.role === 'explanatory') {
    if (options.transformPlainTextOutput !== undefined) {
      output = options.transformPlainTextOutput({
        nodeId,
        nodeMeta: meta,
        output: 'plaintextContent',
        value: output,
      });
    } else {
      output = stripHtml(output);
    }
  }
  return output;
};

export const resolveNodeOutputChannels = (
  nodeId: string,
  meta: CaseResolverNodeMeta,
  options: CaseResolverCompileOptions,
  inputs: {
    resolvedWysiwygText: string;
    nodeText: string;
    incomingPlainText: { value: string; firstJoinMode: CaseResolverJoinMode | null };
    incomingPlaintextContent: { value: string; firstJoinMode: CaseResolverJoinMode | null };
  }
): NodeOutputs => {
  const isExplanatory = meta.role === 'explanatory';
  const hasIncomingPlainText = inputs.incomingPlainText.value.trim().length > 0;
  const isExplanatoryPlainTextInputFlow = isExplanatory && hasIncomingPlainText;
  
  const plainTextOutput = resolvePlainTextOutput(
    nodeId, meta, isExplanatoryPlainTextInputFlow ? inputs.nodeText : inputs.resolvedWysiwygText, options
  );

  const secondaryTextSeed = isExplanatoryPlainTextInputFlow ? inputs.nodeText : inputs.resolvedWysiwygText;
  const wrappedSecondaryText = wrapByQuoteMode(secondaryTextSeed, meta);

  const plaintextContentOutput = resolvePlaintextContentOutput(nodeId, meta, options, {
    isExplanatory: isExplanatoryPlainTextInputFlow,
    plainTextValue: inputs.incomingPlainText.value,
    plaintextContentValue: inputs.incomingPlaintextContent.value,
    plainTextJoinMode: inputs.incomingPlainText.firstJoinMode,
    plaintextContentJoinMode: inputs.incomingPlaintextContent.firstJoinMode,
    wrappedSecondaryText,
  });

  return {
    wysiwygText: wrapByQuoteModeWithoutColor(inputs.resolvedWysiwygText, meta),
    plaintextContent: plaintextContentOutput,
    plainText: plainTextOutput,
    wysiwygContent: '', // Placeholder
  };
};

export const processNode = (
  node: AiNode,
  graph: CaseResolverGraph,
  context: GraphContext,
  outputsByNode: Record<string, NodeOutputs>,
  options: CaseResolverCompileOptions
): { output: NodeOutputs; segment: CaseResolverCompiledSegment } => {
  const meta = resolveNodeMeta(node.id, graph.nodeMeta || {});
  const nodeText = resolveNodeText(node);
  
  const incomingWysiwygText = collectIncoming({ nodeId: node.id, type: 'wysiwygText', context, outputsByNode, graph });
  const incomingPlaintextContent = collectIncoming({ nodeId: node.id, type: 'plaintextContent', context, outputsByNode, graph });
  const incomingPlainText = collectIncoming({ nodeId: node.id, type: 'plainText', context, outputsByNode, graph });
  
  const { text: incomingText, joinMode: incomingTextJoinMode } = resolveIncomingText(
    meta, incomingWysiwygText, incomingPlainText, incomingPlaintextContent
  );

  const resolvedWysiwygText = resolveResolvedWysiwygText(meta, incomingText, nodeText, incomingTextJoinMode);
  const wrappedText = wrapByQuoteMode(resolvedWysiwygText, meta);

  const output = resolveNodeOutputChannels(node.id, meta, options, {
    resolvedWysiwygText,
    nodeText,
    incomingPlainText,
    incomingPlaintextContent,
  });

  return {
    output,
    segment: {
      id: `seg-${node.id}`,
      nodeId: node.id,
      role: meta.role ?? '',
      content: wrappedText,
      title: node.title ?? '',
      text: wrappedText,
      includeInOutput: meta.includeInOutput ?? false,
      metadata: {
        title: node.title,
        includeInOutput: meta.includeInOutput,
      },
    },
  };
};

