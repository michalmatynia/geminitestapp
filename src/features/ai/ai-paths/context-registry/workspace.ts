import { PAGE_CONTEXT_ENGINE_VERSION } from '@/features/ai/ai-context-registry/context/page-context-shared';
import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type { AiNode, AiPathRuntimeEvent, AiPathsValidationConfig, Edge, PathMeta, RuntimeState } from '@/shared/lib/ai-paths';

export const AI_PATHS_CONTEXT_ROOT_IDS = [
  'page:ai-paths',
  'component:ai-paths-canvas-board',
  'component:ai-paths-paths-panel',
  'component:ai-paths-docs-panel',
  'component:ai-paths-node-config-dialog',
  'action:run-ai-path',
  'action:ai-paths-preview-model',
  'action:ai-paths-playwright-run',
  'collection:ai-path-runs',
  'collection:ai-path-playwright-runs',
] as const;

export const AI_PATHS_CONTEXT_RUNTIME_REF = {
  id: 'runtime:ai-paths:workspace',
  kind: 'runtime_document' as const,
  providerId: 'ai-paths-page-local',
  entityType: 'ai_paths_workspace_state',
};

export type BuildAiPathsWorkspaceContextBundleInput = {
  activeTab: string;
  activePathId: string | null;
  pathName: string;
  pathDescription: string;
  paths: PathMeta[];
  nodes: AiNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedNode: AiNode | null;
  activeTrigger: string;
  executionMode: string;
  runMode: string;
  strictFlowMode: boolean;
  blockedRunPolicy: string;
  aiPathsValidation: AiPathsValidationConfig;
  historyRetentionPasses: number;
  runtimeState: RuntimeState;
  runtimeRunStatus: string;
  runtimeEvents: AiPathRuntimeEvent[];
  isPathLocked: boolean;
  isPathActive: boolean;
  sendingToAi: boolean;
  saving: boolean;
  lastRunAt: string | null;
  lastError: {
    message: string;
    time: string;
    pathId?: string | null;
  } | null;
  parserSamples: Record<string, unknown>;
  updaterSamples: Record<string, unknown>;
};

const trimText = (value: string, maxLength: number): string => {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
};

const summarizePath = (path: PathMeta, activePathId: string | null): Record<string, unknown> => ({
  id: path.id,
  name: path.name,
  updatedAt: path.updatedAt,
  isActive: path.id === activePathId,
});

const summarizeSelectedNode = (node: AiNode): Record<string, unknown> => ({
  id: node.id,
  type: node.type,
  title: node.title ?? null,
  description: typeof node.description === 'string' ? trimText(node.description, 220) : null,
  inputCount: Array.isArray(node.inputs) ? node.inputs.length : 0,
  outputCount: Array.isArray(node.outputs) ? node.outputs.length : 0,
});

const summarizeEvent = (event: AiPathRuntimeEvent): Record<string, unknown> => ({
  timestamp: event.timestamp,
  source: event.source ?? null,
  level: event.level ?? null,
  kind: event.kind ?? event.type,
  nodeId: event.nodeId ?? null,
  nodeType: event.nodeType ?? null,
  message: trimText(event.message, 260),
});

const buildNodeTypeSummary = (nodes: readonly AiNode[]): Record<string, number> =>
  nodes.reduce<Record<string, number>>((summary, node) => {
    summary[node.type] = (summary[node.type] ?? 0) + 1;
    return summary;
  }, {});

const buildStatusSummary = (state: RuntimeState): Record<string, number> =>
  Object.values(state.nodeStatuses ?? {}).reduce<Record<string, number>>((summary, status) => {
    summary[status] = (summary[status] ?? 0) + 1;
    return summary;
  }, {});

export const buildAiPathsWorkspaceRuntimeDocument = (
  input: BuildAiPathsWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const nodeTypeSummary = buildNodeTypeSummary(input.nodes);
  const runtimeNodeStatusSummary = buildStatusSummary(input.runtimeState);
  const currentRun = input.runtimeState.currentRun ?? null;
  const parserSampleCount = Object.keys(input.parserSamples ?? {}).length;
  const updaterSampleCount = Object.keys(input.updaterSamples ?? {}).length;
  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Workspace snapshot',
      items: [
        {
          activeTab: input.activeTab,
          activePathId: input.activePathId,
          activePathName: input.pathName,
          pathDescription: trimText(input.pathDescription, 240),
          pathCount: input.paths.length,
          nodeCount: input.nodes.length,
          edgeCount: input.edges.length,
          selectedNodeId: input.selectedNodeId,
          activeTrigger: input.activeTrigger,
          executionMode: input.executionMode,
          runMode: input.runMode,
          strictFlowMode: input.strictFlowMode,
          blockedRunPolicy: input.blockedRunPolicy,
          isPathLocked: input.isPathLocked,
          isPathActive: input.isPathActive,
          saving: input.saving,
          sendingToAi: input.sendingToAi,
        },
      ],
    },
    {
      kind: 'facts',
      title: 'Runtime state',
      items: [
        {
          runtimeRunStatus: input.runtimeRunStatus,
          currentRunId: currentRun?.id ?? null,
          currentRunStatus: currentRun?.status ?? null,
          runtimeInputNodeCount: Object.keys(input.runtimeState.inputs ?? {}).length,
          runtimeOutputNodeCount: Object.keys(input.runtimeState.outputs ?? {}).length,
          runtimeVariableCount: Object.keys(input.runtimeState.variables ?? {}).length,
          runtimeEventCount: input.runtimeEvents.length,
          runtimeNodeStatusSummary,
          lastRunAt: input.lastRunAt,
          lastErrorMessage: input.lastError?.message ?? null,
          lastErrorAt: input.lastError?.time ?? null,
        },
      ],
    },
    {
      kind: 'facts',
      title: 'Validation and samples',
      items: [
        {
          validationEnabled: input.aiPathsValidation.enabled !== false,
          warnThreshold: input.aiPathsValidation.warnThreshold ?? null,
          blockThreshold: input.aiPathsValidation.blockThreshold ?? null,
          historyRetentionPasses: input.historyRetentionPasses,
          parserSampleCount,
          updaterSampleCount,
        },
      ],
    },
  ];

  if (input.selectedNode) {
    sections.push({
      kind: 'facts',
      title: 'Selected node',
      items: [summarizeSelectedNode(input.selectedNode)],
    });
  }

  if (input.paths.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Paths',
      summary: 'Available paths visible in the AI Paths workspace.',
      items: input.paths.slice(0, 12).map((path) => summarizePath(path, input.activePathId)),
    });
  }

  if (input.runtimeEvents.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Recent runtime events',
      summary: 'Latest local or server runtime events emitted by the AI Paths workspace.',
      items: input.runtimeEvents.slice(-8).map(summarizeEvent),
    });
  }

  return {
    id: AI_PATHS_CONTEXT_RUNTIME_REF.id,
    kind: 'runtime_document',
    entityType: AI_PATHS_CONTEXT_RUNTIME_REF.entityType,
    title: input.pathName.trim()
      ? `AI Paths workspace for ${input.pathName.trim()}`
      : 'AI Paths workspace state',
    summary:
      'Live AI Paths workspace state for the current canvas, selected node, runtime diagnostics, ' +
      'and current authoring mode.',
    status: input.runtimeRunStatus,
    tags: ['ai-paths', 'admin', 'canvas', 'workflow', 'live-state'],
    relatedNodeIds: [...AI_PATHS_CONTEXT_ROOT_IDS],
    facts: {
      activeTab: input.activeTab,
      activePathId: input.activePathId,
      activePathName: input.pathName,
      activeTrigger: input.activeTrigger,
      nodeCount: input.nodes.length,
      edgeCount: input.edges.length,
      selectedNodeId: input.selectedNodeId,
      selectedNodeType: input.selectedNode?.type ?? null,
      executionMode: input.executionMode,
      runMode: input.runMode,
      strictFlowMode: input.strictFlowMode,
      blockedRunPolicy: input.blockedRunPolicy,
      isPathLocked: input.isPathLocked,
      isPathActive: input.isPathActive,
      runtimeRunStatus: input.runtimeRunStatus,
      currentRunId: currentRun?.id ?? null,
      currentRunStatus: currentRun?.status ?? null,
      lastRunAt: input.lastRunAt,
      lastErrorMessage: input.lastError?.message ?? null,
      sendingToAi: input.sendingToAi,
      saving: input.saving,
      nodeTypeSummary,
      runtimeNodeStatusSummary,
      parserSampleCount,
      updaterSampleCount,
      validationEnabled: input.aiPathsValidation.enabled !== false,
      warnThreshold: input.aiPathsValidation.warnThreshold ?? null,
      blockThreshold: input.aiPathsValidation.blockThreshold ?? null,
    },
    sections,
    provenance: {
      source: 'ai-paths.admin.client-state',
      persisted: false,
    },
  };
};

export const buildAiPathsWorkspaceContextBundle = (
  input: BuildAiPathsWorkspaceContextBundleInput
): ContextRegistryResolutionBundle => ({
  refs: [AI_PATHS_CONTEXT_RUNTIME_REF],
  nodes: [],
  documents: [buildAiPathsWorkspaceRuntimeDocument(input)],
  truncated: false,
  engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
});
