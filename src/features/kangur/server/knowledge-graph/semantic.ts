import 'server-only';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { generateBrainEmbedding } from '@/shared/lib/ai-brain/server-embeddings-client';
import type { KangurKnowledgeGraphNode, KangurKnowledgeGraphSnapshot } from '@/features/kangur/shared/contracts/kangur-knowledge-graph';

const dedupeSemanticParts = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    lines.push(normalized);
  }

  return lines;
};

export const buildKangurKnowledgeNodeSemanticText = (
  node: Pick<
    KangurKnowledgeGraphNode,
    | 'title'
    | 'summary'
    | 'kind'
    | 'surface'
    | 'focusKind'
    | 'route'
    | 'anchorId'
    | 'refId'
    | 'focusIdPrefixes'
    | 'contentIdPrefixes'
    | 'triggerPhrases'
    | 'sourcePath'
    | 'tags'
    | 'semanticText'
  >
): string => {
  if (typeof node.semanticText === 'string' && node.semanticText.trim()) {
    return node.semanticText.trim();
  }

  return dedupeSemanticParts([
    node.title,
    node.summary,
    `Kind: ${node.kind}`,
    node.surface ? `Surface: ${node.surface}` : null,
    node.focusKind ? `Focus kind: ${node.focusKind}` : null,
    node.route ? `Route: ${node.route}` : null,
    node.anchorId ? `Anchor: ${node.anchorId}` : null,
    node.refId ? `Reference: ${node.refId}` : null,
    node.focusIdPrefixes?.length ? `Focus ids: ${node.focusIdPrefixes.join(', ')}` : null,
    node.contentIdPrefixes?.length ? `Content ids: ${node.contentIdPrefixes.join(', ')}` : null,
    node.triggerPhrases?.length ? `Trigger phrases: ${node.triggerPhrases.join(', ')}` : null,
    node.tags?.length ? `Tags: ${node.tags.join(', ')}` : null,
    node.sourcePath ? `Source path: ${node.sourcePath}` : null,
  ]).join('\n');
};

export const cosineSimilarity = (left: number[], right: number[]): number => {
  const len = Math.min(left.length, right.length);
  if (len === 0) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < len; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  if (!Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }

  return dot / denominator;
};

const resolveKangurKnowledgeGraphEmbeddingModelId = async (): Promise<string> => {
  const config = await resolveBrainExecutionConfigForCapability('agent_teaching.embeddings', {
    runtimeKind: 'embedding',
  });
  return config.modelId;
};

export const generateKangurKnowledgeGraphQueryEmbedding = async (
  text: string
): Promise<number[] | null> => {
  const normalized = text.trim();
  if (!normalized) {
    return null;
  }

  const modelId = await resolveKangurKnowledgeGraphEmbeddingModelId();
  return generateBrainEmbedding({
    modelId,
    text: normalized,
  });
};

export const enrichKangurKnowledgeGraphWithEmbeddings = async (
  snapshot: KangurKnowledgeGraphSnapshot
): Promise<KangurKnowledgeGraphSnapshot> => {
  const modelId = await resolveKangurKnowledgeGraphEmbeddingModelId();
  const nextNodes: KangurKnowledgeGraphNode[] = [];

  for (const node of snapshot.nodes) {
    const semanticText = buildKangurKnowledgeNodeSemanticText(node);
    if (!semanticText) {
      nextNodes.push(node);
      continue;
    }

    const embedding = await generateBrainEmbedding({
      modelId,
      text: semanticText,
    });

    nextNodes.push({
      ...node,
      semanticText,
      embedding,
      embeddingModel: modelId,
      embeddingDimensions: embedding.length,
    });
  }

  return {
    ...snapshot,
    nodes: nextNodes,
  };
};
