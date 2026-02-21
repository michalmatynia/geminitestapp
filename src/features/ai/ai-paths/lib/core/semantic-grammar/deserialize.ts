import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';
import {
  canvasSemanticDocumentSchema,
  semanticDocumentSchema,
} from '@/shared/contracts/ai-paths-semantic-grammar';
import type {
  CanvasSemanticDocumentDto as CanvasSemanticDocument,
  SemanticDocumentDto as SemanticDocument,
  SemanticEdgeDto as SemanticEdge,
  SemanticNodeDto as SemanticNode,
} from '@/shared/contracts/ai-paths-semantic-grammar';

import { createDefaultPathConfig } from '../utils/factory';
import { normalizeAiPathsValidationConfig } from '../validation-engine';

export type ParseSemanticDocumentResult =
  | { ok: true; value: SemanticDocument }
  | { ok: false; error: string };

export const parseSemanticDocument = (
  input: unknown,
): ParseSemanticDocumentResult => {
  const parsed = semanticDocumentSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  return {
    ok: false,
    error: parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'document'}: ${issue.message}`)
      .join('; '),
  };
};

export const parseSemanticCanvasDocument = (
  input: unknown,
): ParseSemanticDocumentResult => {
  const parsed = canvasSemanticDocumentSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  return {
    ok: false,
    error: parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'document'}: ${issue.message}`)
      .join('; '),
  };
};

const toAiNode = (semanticNode: SemanticNode, fallbackTimestamp: string): AiNode => ({
  id: semanticNode.id,
  type: semanticNode.type,
  title: semanticNode.title,
  description: semanticNode.description,
  position: semanticNode.position,
  inputs: semanticNode.inputs,
  outputs: semanticNode.outputs,
  data:
    semanticNode.data && typeof semanticNode.data === 'object'
      ? semanticNode.data
      : {},
  createdAt: semanticNode.createdAt ?? fallbackTimestamp,
  updatedAt:
    typeof semanticNode.updatedAt === 'string' || semanticNode.updatedAt === null
      ? semanticNode.updatedAt
      : null,
  ...(semanticNode.config && typeof semanticNode.config === 'object'
    ? { config: semanticNode.config as AiNode['config'] }
    : {}),
});

const toAiEdge = (semanticEdge: SemanticEdge): Edge => ({
  id: semanticEdge.id,
  from: semanticEdge.fromNodeId,
  to: semanticEdge.toNodeId,
  source: semanticEdge.fromNodeId,
  target: semanticEdge.toNodeId,
  ...(typeof semanticEdge.fromPort === 'string' || semanticEdge.fromPort === null
    ? {
      fromPort: semanticEdge.fromPort,
      sourceHandle: semanticEdge.fromPort,
    }
    : {}),
  ...(typeof semanticEdge.toPort === 'string' || semanticEdge.toPort === null
    ? {
      toPort: semanticEdge.toPort,
      targetHandle: semanticEdge.toPort,
    }
    : {}),
  ...(typeof semanticEdge.label === 'string' || semanticEdge.label === null
    ? { label: semanticEdge.label }
    : {}),
  ...(typeof semanticEdge.type === 'string' ? { type: semanticEdge.type } : {}),
  ...(semanticEdge.data && typeof semanticEdge.data === 'object'
    ? { data: semanticEdge.data }
    : {}),
  ...(typeof semanticEdge.createdAt === 'string'
    ? { createdAt: semanticEdge.createdAt }
    : {}),
  ...(typeof semanticEdge.updatedAt === 'string' || semanticEdge.updatedAt === null
    ? { updatedAt: semanticEdge.updatedAt }
    : {}),
});

export const deserializeSemanticCanvasToPathConfig = (
  semanticDocument: CanvasSemanticDocument,
): PathConfig => {
  const now = new Date().toISOString();
  const base = createDefaultPathConfig(semanticDocument.path.id);
  const nodes = semanticDocument.nodes.map((node: SemanticNode): AiNode =>
    toAiNode(node, now),
  );
  const edges = semanticDocument.edges.map((edge: SemanticEdge): Edge =>
    toAiEdge(edge),
  );
  const runtimeState: unknown =
    semanticDocument.execution?.runtimeState !== undefined
      ? semanticDocument.execution.runtimeState
      : (base.runtimeState as unknown);

  return {
    ...base,
    id: semanticDocument.path.id,
    version: semanticDocument.path.version,
    name: semanticDocument.path.name,
    description: semanticDocument.path.description,
    trigger: semanticDocument.path.trigger,
    updatedAt: semanticDocument.path.updatedAt,
    ...(typeof semanticDocument.path.executionMode === 'string'
      ? { executionMode: semanticDocument.path.executionMode }
      : {}),
    ...(typeof semanticDocument.path.flowIntensity === 'string'
      ? { flowIntensity: semanticDocument.path.flowIntensity }
      : {}),
    ...(typeof semanticDocument.path.runMode === 'string'
      ? { runMode: semanticDocument.path.runMode }
      : {}),
    ...(typeof semanticDocument.path.strictFlowMode === 'boolean'
      ? { strictFlowMode: semanticDocument.path.strictFlowMode }
      : {}),
    ...(typeof semanticDocument.path.isLocked === 'boolean'
      ? { isLocked: semanticDocument.path.isLocked }
      : {}),
    ...(typeof semanticDocument.path.isActive === 'boolean'
      ? { isActive: semanticDocument.path.isActive }
      : {}),
    nodes,
    edges,
    parserSamples:
      semanticDocument.execution?.parserSamples &&
      typeof semanticDocument.execution.parserSamples === 'object'
        ? semanticDocument.execution.parserSamples
        : {},
    updaterSamples:
      semanticDocument.execution?.updaterSamples &&
      typeof semanticDocument.execution.updaterSamples === 'object'
        ? semanticDocument.execution.updaterSamples
        : {},
    runtimeState,
    lastRunAt:
      typeof semanticDocument.execution?.lastRunAt === 'string' ||
      semanticDocument.execution?.lastRunAt === null
        ? semanticDocument.execution.lastRunAt
        : null,
    runCount:
      typeof semanticDocument.execution?.runCount === 'number'
        ? semanticDocument.execution.runCount
        : 0,
    aiPathsValidation: normalizeAiPathsValidationConfig(
      semanticDocument.validation ?? base.aiPathsValidation,
    ),
    uiState: {
      selectedNodeId: nodes[0]?.id ?? null,
      configOpen: false,
    },
  };
};

export const parseAndDeserializeSemanticCanvas = (
  input: unknown,
): { ok: true; value: PathConfig } | { ok: false; error: string } => {
  const parsed = parseSemanticCanvasDocument(input);
  if (!parsed.ok) {
    return parsed;
  }
  return {
    ok: true,
    value: deserializeSemanticCanvasToPathConfig(
      parsed.value as CanvasSemanticDocument,
    ),
  };
};
