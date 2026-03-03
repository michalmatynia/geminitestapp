import { describe, expect, it } from 'vitest';

import { upgradeStarterWorkflowPathConfig } from '@/shared/lib/ai-paths/core/starter-workflows';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node',
    type: 'viewer',
    title: 'Node',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    data: {},
    ...patch,
  }) as AiNode;

const buildRuntimeState = (patch: Partial<RuntimeState>): RuntimeState => ({
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  inputs: {},
  outputs: {},
  ...patch,
});

const buildLegacyTranslationPreflightGraph = (): { nodes: AiNode[]; edges: Edge[] } => ({
  nodes: [
    buildNode({
      id: 'node-trigger-translate-en-pl',
      type: 'trigger',
      title: 'Trigger: Translate EN->PL (Desc+Params)',
      inputs: ['context'],
      outputs: ['trigger', 'triggerName', 'context', 'meta', 'entityId', 'entityType'],
    }),
    buildNode({
      id: 'node-context-translate-en-pl',
      type: 'context',
      title: 'Context Filter',
      inputs: ['context'],
      outputs: ['context', 'entityId', 'entityType', 'entityJson'],
    }),
    buildNode({
      id: 'node-parser-translate-en-pl',
      type: 'parser',
      title: 'JSON Parser',
      inputs: ['entityJson', 'context'],
      outputs: ['bundle'],
    }),
    buildNode({
      id: 'node-prompt-translate-en-pl',
      type: 'prompt',
      title: 'Prompt',
      inputs: ['bundle', 'title', 'images', 'result', 'entityId'],
      outputs: ['prompt', 'images'],
    }),
    buildNode({
      id: 'node-model-translate-en-pl',
      type: 'model',
      title: 'Model',
      inputs: ['prompt', 'images', 'context'],
      outputs: ['result', 'jobId'],
    }),
    buildNode({
      id: 'node-regex-translate-en-pl',
      type: 'regex',
      title: 'Regex JSON Extract',
      inputs: ['value', 'prompt', 'regexCallback'],
      outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
    }),
    buildNode({
      id: 'node-db-update-translate-en-pl',
      type: 'database',
      title: 'Database Query',
      inputs: [
        'entityId',
        'entityType',
        'productId',
        'context',
        'query',
        'value',
        'bundle',
        'result',
        'content_en',
        'queryCallback',
        'schema',
        'aiQuery',
      ],
      outputs: ['result', 'bundle', 'content_en', 'aiPrompt'],
      config: {
        runtime: {
          waitForInputs: true,
        },
        database: {
          operation: 'update',
          entityType: 'product',
          updatePayloadMode: 'mapping',
          updateTemplate: '',
          query: {
            provider: 'auto',
            collection: 'products',
            mode: 'custom',
            preset: 'by_id',
            field: 'id',
            idType: 'string',
            queryTemplate: '{"id":"{{entityId}}"}',
            limit: 1,
            sort: '',
            projection: '',
            single: true,
          },
        },
      },
    }),
    buildNode({
      id: 'node-view-translate-en-pl',
      type: 'viewer',
      title: 'Result Viewer',
      inputs: ['result', 'value', 'bundle'],
      outputs: [],
    }),
    buildNode({
      id: 'node-f2qfiiyi',
      type: 'simulation',
      title: 'Simulation: Entity Modal',
      inputs: ['trigger'],
      outputs: ['context', 'entityId', 'entityType', 'productId'],
    }),
  ],
  edges: [
    {
      id: 'edge-tr-pl-01',
      from: 'node-trigger-translate-en-pl',
      to: 'node-context-translate-en-pl',
      fromPort: 'context',
      toPort: 'context',
    },
    {
      id: 'edge-tr-pl-02',
      from: 'node-context-translate-en-pl',
      to: 'node-parser-translate-en-pl',
      fromPort: 'entityJson',
      toPort: 'entityJson',
    },
    {
      id: 'edge-tr-pl-03',
      from: 'node-parser-translate-en-pl',
      to: 'node-prompt-translate-en-pl',
      fromPort: 'bundle',
      toPort: 'bundle',
    },
    {
      id: 'edge-tr-pl-04',
      from: 'node-prompt-translate-en-pl',
      to: 'node-model-translate-en-pl',
      fromPort: 'prompt',
      toPort: 'prompt',
    },
    {
      id: 'edge-tr-pl-05',
      from: 'node-model-translate-en-pl',
      to: 'node-regex-translate-en-pl',
      fromPort: 'result',
      toPort: 'value',
    },
    {
      id: 'edge-tr-pl-06',
      from: 'node-regex-translate-en-pl',
      to: 'node-db-update-translate-en-pl',
      fromPort: 'value',
      toPort: 'value',
    },
    {
      id: 'edge-tr-pl-07',
      from: 'node-context-translate-en-pl',
      to: 'node-db-update-translate-en-pl',
      fromPort: 'entityId',
      toPort: 'entityId',
    },
    {
      id: 'edge-tr-pl-08',
      from: 'node-context-translate-en-pl',
      to: 'node-db-update-translate-en-pl',
      fromPort: 'entityType',
      toPort: 'entityType',
    },
    {
      id: 'edge-tr-pl-09',
      from: 'node-regex-translate-en-pl',
      to: 'node-view-translate-en-pl',
      fromPort: 'value',
      toPort: 'value',
    },
    {
      id: 'edge-tr-pl-10',
      from: 'node-db-update-translate-en-pl',
      to: 'node-view-translate-en-pl',
      fromPort: 'result',
      toPort: 'result',
    },
    {
      id: 'edge-tr-pl-11',
      from: 'node-parser-translate-en-pl',
      to: 'node-view-translate-en-pl',
      fromPort: 'bundle',
      toPort: 'bundle',
    },
    {
      id: 'edge-trigger-simulation',
      from: 'node-trigger-translate-en-pl',
      to: 'node-f2qfiiyi',
      fromPort: 'trigger',
      toPort: 'trigger',
    },
    {
      id: 'edge-simulation-trigger',
      from: 'node-f2qfiiyi',
      to: 'node-trigger-translate-en-pl',
      fromPort: 'context',
      toPort: 'context',
    },
  ],
});

describe('evaluateRunPreflight', () => {
  it('blocks when node validation is enabled and preflight errors exist', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        inputs: ['context'],
        outputs: ['trigger'],
      }),
      buildNode({
        id: 'db-1',
        type: 'database',
        inputs: ['entityId'],
        outputs: ['result'],
        config: {
          database: {
            operation: 'query',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{"id":"{{entityId}}"}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
          },
        },
      }),
    ];
    const edges: Edge[] = [];
    const runtimeState = buildRuntimeState({
      inputs: {
        'db-1': {
          entityId: { id: 'A-1' },
        },
      },
    });

    const report = evaluateRunPreflight({
      nodes,
      edges,
      runtimeState,
      aiPathsValidation: { enabled: true },
      strictFlowMode: false,
      mode: 'full',
    });

    expect(report.nodeValidationEnabled).toBe(true);
    expect(report.shouldBlock).toBe(true);
    expect(report.blockReason).toBe('data_contract');
    expect(report.dataContractReport.errors).toBeGreaterThan(0);
  });

  it('never blocks preflight findings when node validation is disabled', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'db-1',
        type: 'database',
        inputs: ['entityId'],
        outputs: ['result'],
        config: {
          database: {
            operation: 'query',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{"id":"{{entityId}}"}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
          },
        },
      }),
    ];
    const runtimeState = buildRuntimeState({
      inputs: {
        'db-1': {
          entityId: { id: 'A-1' },
        },
      },
    });

    const report = evaluateRunPreflight({
      nodes,
      edges: [],
      runtimeState,
      aiPathsValidation: { enabled: false },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(report.nodeValidationEnabled).toBe(false);
    expect(report.shouldBlock).toBe(false);
    expect(report.dataContractReport.errors).toBeGreaterThan(0);
    expect(
      report.warnings.some((warning) => warning.code === 'data_contract_errors_non_blocking')
    ).toBe(true);
  });

  it('ignores optional node-level value/prompt ports when validation is disabled', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        inputs: ['context'],
        outputs: ['trigger'],
      }),
      buildNode({
        id: 'db-1',
        type: 'database',
        inputs: ['value', 'prompt', 'entityId'],
        outputs: ['result'],
        inputContracts: {
          value: { required: false },
          prompt: { required: false },
          entityId: { required: false },
        },
        config: {
          database: {
            operation: 'query',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{"id":"{{entityId}}"}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
          },
        },
      }),
    ];

    const report = evaluateRunPreflight({
      nodes,
      edges: [],
      runtimeState: buildRuntimeState({}),
      aiPathsValidation: { enabled: false },
      strictFlowMode: true,
      triggerNodeId: 'trigger-1',
      mode: 'full',
    });

    expect(report.nodeValidationEnabled).toBe(false);
    expect(report.shouldBlock).toBe(false);
    expect(report.compileReport.errors).toBe(0);
    expect(report.dataContractReport.errors).toBe(0);
    expect(
      report.warnings.some(
        (warning) =>
          warning.code === 'compile_errors_non_blocking' ||
          warning.code === 'data_contract_errors_non_blocking'
      )
    ).toBe(false);
  });

  it('keeps strict-flow dependency behavior consistent with validation toggle', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        inputs: ['context'],
        outputs: ['trigger', 'context'],
      }),
      buildNode({
        id: 'db-1',
        type: 'database',
        inputs: ['entityId', 'productId', 'value'],
        outputs: ['result'],
        config: {
          runtime: {
            waitForInputs: true,
          },
          database: {
            operation: 'update',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{"id":"{{entityId}}"}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
          },
        },
      }),
    ];

    const enabledReport = evaluateRunPreflight({
      nodes,
      edges: [],
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });
    const disabledReport = evaluateRunPreflight({
      nodes,
      edges: [],
      aiPathsValidation: { enabled: false },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(enabledReport.shouldBlock).toBe(true);
    expect(enabledReport.blockReason).toBe('dependency');
    expect(enabledReport.dependencyReport?.errors ?? 0).toBeGreaterThan(0);

    expect(disabledReport.shouldBlock).toBe(false);
    expect(disabledReport.dependencyReport?.errors ?? 0).toBe(0);
    expect(
      disabledReport.warnings.some((warning) => warning.code === 'dependency_errors_non_blocking')
    ).toBe(false);
  });

  it('unblocks renamed legacy EN->PL starter graphs after generic starter migration', () => {
    const legacy = buildLegacyTranslationPreflightGraph();

    const before = evaluateRunPreflight({
      nodes: legacy.nodes,
      edges: legacy.edges,
      runtimeState: buildRuntimeState({}),
      aiPathsValidation: { enabled: true, blockThreshold: 0, warnThreshold: 0 },
      strictFlowMode: true,
      mode: 'full',
    });

    const upgraded = upgradeStarterWorkflowPathConfig({
      id: 'path_translation_v2',
      name: 'Translation EN->PL Description + Parameters v2',
      description: '',
      trigger: 'manual',
      version: 1,
      updatedAt: '2026-03-03T10:00:00.000Z',
      nodes: legacy.nodes,
      edges: legacy.edges,
    });

    const after = evaluateRunPreflight({
      nodes: upgraded.config.nodes as AiNode[],
      edges: upgraded.config.edges as Edge[],
      runtimeState: buildRuntimeState({}),
      aiPathsValidation: { enabled: true, blockThreshold: 0, warnThreshold: 0 },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(before.shouldBlock).toBe(true);
    expect(before.dependencyReport?.errors ?? 0).toBeGreaterThan(0);

    expect(upgraded.changed).toBe(true);
    expect(upgraded.resolution?.matchedBy).toBe('canonical_hash');
    expect(after.dependencyReport?.errors ?? 0).toBeLessThanOrEqual(
      before.dependencyReport?.errors ?? 0
    );
  });
});
