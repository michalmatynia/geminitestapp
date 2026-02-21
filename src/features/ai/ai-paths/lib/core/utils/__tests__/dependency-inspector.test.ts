import { describe, expect, it } from 'vitest';

import { inspectPathDependencies } from '@/features/ai/ai-paths/lib/core/utils/dependency-inspector';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

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

describe('inspectPathDependencies', () => {
  it('flags fallback-prone wiring', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        inputs: ['context'],
        outputs: ['context'],
      }),
      buildNode({
        id: 'parser-1',
        type: 'parser',
        title: 'Parser',
        inputs: ['entityJson', 'context'],
      }),
      buildNode({
        id: 'db-1',
        type: 'database',
        title: 'Database',
        inputs: ['entityId', 'productId', 'value'],
        config: {
          runtime: {
            waitForInputs: false,
          },
          database: {
            operation: 'update',
            updatePayloadMode: 'mapping',
            entityType: 'product',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'preset',
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

    const report = inspectPathDependencies(nodes, []);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.strictReady).toBe(false);
    expect(
      report.risks.some((risk) => risk.category === 'trigger_context_fallback')
    ).toBe(true);
    expect(
      report.risks.some((risk) => risk.category === 'parser_entity_fallback')
    ).toBe(true);
    expect(
      report.risks.some(
        (risk) => risk.category === 'database_write_missing_identity_inputs',
      )
    ).toBe(true);
    expect(
      report.risks.some(
        (risk) => risk.category === 'database_update_mode_mapping_disallowed',
      )
    ).toBe(true);
  });

  it('reports strict-ready when identity/query ports are explicit', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        inputs: ['context'],
        outputs: ['context'],
      }),
      buildNode({
        id: 'context-1',
        type: 'context',
        title: 'Context',
        outputs: ['context'],
      }),
      buildNode({
        id: 'parser-1',
        type: 'parser',
        title: 'Parser',
        inputs: ['entityJson', 'context'],
        outputs: ['entityId'],
      }),
      buildNode({
        id: 'db-1',
        type: 'database',
        title: 'Database',
        inputs: ['entityId', 'productId', 'value'],
        config: {
          runtime: {
            waitForInputs: true,
          },
          database: {
            operation: 'update',
            entityType: 'product',
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
        id: 'edge-context-trigger',
        from: 'context-1',
        to: 'trigger-1',
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-context-parser',
        from: 'context-1',
        to: 'parser-1',
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-parser-db',
        from: 'parser-1',
        to: 'db-1',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
    ];

    const report = inspectPathDependencies(nodes, edges);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.strictReady).toBe(true);
  });

  it('flags preset query mode as disallowed for database query nodes', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'db-query',
        type: 'database',
        title: 'Database Query',
        inputs: ['query', 'aiQuery', 'queryCallback'],
        config: {
          runtime: {
            waitForInputs: true,
          },
          database: {
            operation: 'query',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'preset',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '',
              limit: 20,
              sort: '',
              projection: '',
              single: false,
            },
          },
        },
      }),
    ];

    const report = inspectPathDependencies(nodes, []);
    expect(
      report.risks.some(
        (risk) => risk.category === 'database_query_mode_preset_disallowed',
      )
    ).toBe(true);
    expect(report.strictReady).toBe(false);
  });

  it('supports edges using source/target handles', () => {
    const nodes: AiNode[] = [
      buildNode({
        id: 'context-1',
        type: 'context',
        title: 'Context',
        outputs: ['context'],
      }),
      buildNode({
        id: 'trigger-1',
        type: 'trigger',
        title: 'Trigger',
        inputs: ['context'],
        outputs: ['context'],
      }),
      buildNode({
        id: 'parser-1',
        type: 'parser',
        title: 'Parser',
        inputs: ['entityJson', 'context'],
      }),
    ];

    const edges: Edge[] = [
      {
        id: 'edge-context-trigger',
        source: 'context-1',
        target: 'trigger-1',
        sourceHandle: 'context',
        targetHandle: 'context',
      },
      {
        id: 'edge-context-parser',
        source: 'context-1',
        target: 'parser-1',
        sourceHandle: 'context',
        targetHandle: 'context',
      },
    ];

    const report = inspectPathDependencies(nodes, edges);
    expect(
      report.risks.some((risk) => risk.category === 'trigger_context_fallback')
    ).toBe(false);
    expect(
      report.risks.some((risk) => risk.category === 'parser_entity_fallback')
    ).toBe(false);
  });
});
