import { describe, expect, it } from 'vitest';

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
});
