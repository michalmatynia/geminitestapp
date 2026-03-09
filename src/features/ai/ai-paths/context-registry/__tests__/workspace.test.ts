import { describe, expect, it } from 'vitest';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import type { PathMeta, RuntimeState } from '@/shared/lib/ai-paths';

import {
  AI_PATHS_CONTEXT_ROOT_IDS,
  AI_PATHS_CONTEXT_RUNTIME_REF,
  buildAiPathsWorkspaceContextBundle,
} from '../workspace';

const config = createDefaultPathConfig('path-test');
const paths: PathMeta[] = [
  {
    id: config.id,
    name: config.name,
    createdAt: '2026-03-09T08:00:00.000Z',
    updatedAt: '2026-03-09T09:00:00.000Z',
  },
];

const runtimeState: RuntimeState = {
  status: 'running',
  nodeStatuses: {
    [config.nodes[0]!.id]: 'completed',
    [config.nodes[1]!.id]: 'running',
  },
  nodeOutputs: {},
  variables: { locale: 'en' },
  events: [],
  currentRun: {
    id: 'run-1',
    status: 'running',
    pathId: config.id,
    pathName: config.name,
    createdAt: '2026-03-09T09:00:00.000Z',
    updatedAt: '2026-03-09T09:00:00.000Z',
  },
  inputs: {},
  outputs: {
    [config.nodes[0]!.id]: {
      result: 'Draft output',
    },
  },
};

describe('buildAiPathsWorkspaceContextBundle', () => {
  it('builds a live runtime document for the AI Paths workspace', () => {
    const bundle = buildAiPathsWorkspaceContextBundle({
      activeTab: 'canvas',
      activePathId: config.id,
      pathName: config.name,
      pathDescription: 'Main AI Paths test workflow',
      paths,
      nodes: config.nodes,
      edges: config.edges,
      selectedNodeId: config.nodes[1]!.id,
      selectedNode: config.nodes[1]!,
      activeTrigger: 'manual',
      executionMode: 'server',
      runMode: 'live',
      strictFlowMode: true,
      blockedRunPolicy: 'fail_run',
      aiPathsValidation: {
        enabled: true,
        warnThreshold: 70,
        blockThreshold: 50,
      },
      historyRetentionPasses: 8,
      runtimeState,
      runtimeRunStatus: 'running',
      runtimeEvents: [
        {
          id: 'event-1',
          timestamp: '2026-03-09T09:05:00.000Z',
          type: 'status',
          source: 'server',
          level: 'info',
          message: 'Server run queued.',
          nodeId: config.nodes[0]!.id,
        },
      ],
      isPathLocked: false,
      isPathActive: true,
      sendingToAi: true,
      saving: false,
      lastRunAt: '2026-03-09T09:05:00.000Z',
      lastError: null,
      parserSamples: { parserNode: { sample: 'x' } },
      updaterSamples: { updaterNode: { sample: 'y' } },
    });

    expect(bundle.refs).toEqual([AI_PATHS_CONTEXT_RUNTIME_REF]);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]?.relatedNodeIds).toEqual([...AI_PATHS_CONTEXT_ROOT_IDS]);
    expect(bundle.documents[0]?.facts).toMatchObject({
      activeTab: 'canvas',
      activePathId: config.id,
      activePathName: config.name,
      activeTrigger: 'manual',
      nodeCount: config.nodes.length,
      edgeCount: config.edges.length,
      executionMode: 'server',
      runMode: 'live',
      strictFlowMode: true,
      blockedRunPolicy: 'fail_run',
      runtimeRunStatus: 'running',
      currentRunId: 'run-1',
      sendingToAi: true,
      validationEnabled: true,
      parserSampleCount: 1,
      updaterSampleCount: 1,
    });
    expect(bundle.documents[0]?.sections[0]?.title).toBe('Workspace snapshot');
    expect(bundle.documents[0]?.sections[3]?.title).toBe('Selected node');
    expect(bundle.documents[0]?.sections[4]?.items?.[0]).toMatchObject({
      id: config.id,
      isActive: true,
    });
  });
});
