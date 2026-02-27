import { describe, expect, it } from 'vitest';

import { evaluateDataContractPreflight } from '@/shared/lib/ai-paths/core/utils/data-contract-preflight';
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

describe('evaluateDataContractPreflight', () => {
  it('flags object payload sent into database entityId scalar input', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'mapper-1',
        type: 'mapper',
        outputs: ['entityId'],
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
    const edges: Edge[] = [
      {
        id: 'edge-value-entity-id',
        from: 'mapper-1',
        to: 'db-1',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
    ];
    const runtimeState = buildRuntimeState({
      outputs: {
        'mapper-1': {
          entityId: { EntityID: 'A-1' },
        },
      },
    });

    const report = evaluateDataContractPreflight({
      nodes,
      edges,
      runtimeState,
      mode: 'full',
    });

    expect(
      report.issues.some(
        (issue) =>
          issue.code === 'database_scalar_identity_expected' &&
          issue.nodeId === 'db-1' &&
          issue.port === 'entityId' &&
          issue.severity === 'error'
      )
    ).toBe(true);
  });

  it('flags missing and empty database template tokens with token context', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'db-1',
        type: 'database',
        inputs: ['entityId', 'bundle', 'value'],
        outputs: ['result'],
        config: {
          database: {
            operation: 'update',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{"id":"{{entityId}}","sku":"{{bundle.sku}}"}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
            updateTemplate: '{"$set":{"name":"{{value.name}}"}}',
          },
        },
      }),
    ];

    const runtimeState = buildRuntimeState({
      inputs: {
        'db-1': {
          entityId: null,
          bundle: { sku: '' },
          value: {},
        },
      },
    });

    const report = evaluateDataContractPreflight({
      nodes,
      edges: [],
      runtimeState,
      mode: 'full',
    });

    expect(
      report.issues.some(
        (issue) =>
          issue.code === 'database_template_token_empty' &&
          issue.token === 'entityId'
      )
    ).toBe(true);
    expect(
      report.issues.some(
        (issue) =>
          issue.code === 'database_template_token_empty' &&
          issue.token === 'bundle.sku'
      )
    ).toBe(true);
    expect(
      report.issues.some(
        (issue) =>
          issue.code === 'database_template_token_missing' &&
          issue.token === 'value.name'
      )
    ).toBe(true);
  });

  it('does not flag optional value/prompt ports as unresolved when unwired', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'db-1',
        type: 'database',
        title: 'DB',
        inputs: ['value', 'prompt'],
        outputs: ['result'],
        inputContracts: {
          value: { required: false },
          prompt: { required: false },
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

    const report = evaluateDataContractPreflight({
      nodes,
      edges: [],
      runtimeState: buildRuntimeState({}),
      mode: 'full',
    });

    expect(
      report.issues.some(
        (issue) =>
          issue.code === 'required_input_unresolved' &&
          issue.nodeId === 'db-1' &&
          (issue.port === 'value' || issue.port === 'prompt')
      )
    ).toBe(false);
  });

  it('does not flag template token missing when upstream root is connected but unresolved', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'mapper-1',
        type: 'mapper',
        outputs: ['value'],
      }),
      buildNode({
        id: 'db-1',
        type: 'database',
        inputs: ['value'],
        outputs: ['result'],
        config: {
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
            updateTemplate: '{"$set":{"description_pl":"{{value.description_pl}}"}}',
          },
        },
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-mapper-db-value',
        from: 'mapper-1',
        to: 'db-1',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const report = evaluateDataContractPreflight({
      nodes,
      edges,
      runtimeState: buildRuntimeState({}),
      mode: 'full',
    });

    expect(
      report.issues.some(
        (issue) =>
          issue.code === 'database_template_token_missing' &&
          issue.token === 'value.description_pl' &&
          issue.nodeId === 'db-1'
      )
    ).toBe(false);
  });

  it('flags runtime type mismatch on non-database connected inputs', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'prompt-1',
        type: 'prompt',
        outputs: ['prompt'],
      }),
      buildNode({
        id: 'model-1',
        type: 'model',
        inputs: ['prompt'],
        outputs: ['result'],
      }),
    ];
    const edges: Edge[] = [
      {
        id: 'edge-prompt',
        from: 'prompt-1',
        to: 'model-1',
        fromPort: 'prompt',
        toPort: 'prompt',
      },
    ];
    const runtimeState = buildRuntimeState({
      outputs: {
        'prompt-1': {
          prompt: {
            text: 'this should be a string',
          },
        },
      },
    });

    const report = evaluateDataContractPreflight({
      nodes,
      edges,
      runtimeState,
      mode: 'full',
    });

    expect(
      report.issues.some(
        (issue) =>
          issue.code === 'runtime_value_type_mismatch' &&
          issue.nodeId === 'model-1' &&
          issue.port === 'prompt'
      )
    ).toBe(true);
  });

  it('limits findings to reachable scope when requested', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        inputs: ['context'],
        outputs: ['trigger'],
      }),
      buildNode({
        id: 'viewer-1',
        type: 'viewer',
        title: 'Viewer',
        inputs: ['trigger'],
      }),
      buildNode({
        id: 'mapper-1',
        type: 'mapper',
        title: 'Mapper',
        outputs: ['entityId'],
      }),
      buildNode({
        id: 'db-1',
        type: 'database',
        title: 'DB',
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

    const edges: Edge[] = [
      {
        id: 'edge-trigger-viewer',
        from: 'trigger-1',
        to: 'viewer-1',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-mapper-db',
        from: 'mapper-1',
        to: 'db-1',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
    ];

    const runtimeState = buildRuntimeState({
      outputs: {
        'mapper-1': {
          entityId: {
            EntityID: 'A-1',
          },
        },
      },
    });

    const fullReport = evaluateDataContractPreflight({
      nodes,
      edges,
      runtimeState,
      mode: 'full',
      scopeMode: 'full',
    });
    const scopedReport = evaluateDataContractPreflight({
      nodes,
      edges,
      runtimeState,
      mode: 'full',
      scopeMode: 'reachable_from_roots',
      scopeRootNodeIds: ['trigger-1'],
    });

    expect(
      fullReport.issues.some(
        (issue) => issue.code === 'database_scalar_identity_expected' && issue.nodeId === 'db-1'
      )
    ).toBe(true);
    expect(
      scopedReport.issues.some(
        (issue) => issue.code === 'database_scalar_identity_expected' && issue.nodeId === 'db-1'
      )
    ).toBe(false);
  });
});
