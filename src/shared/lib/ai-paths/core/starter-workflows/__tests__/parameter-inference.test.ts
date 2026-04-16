import { describe, expect, it } from 'vitest';

import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';

describe('starter parameter inference workflow', () => {
  it('maps product modal snapshots from canonical product name and description fields', () => {
    const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!entry) throw new Error('Missing starter_parameter_inference entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_parameter_inference_mapping',
    });
    const parserNode = config.nodes.find((node) => node.title === 'JSON Parser');

    expect(parserNode).toBeTruthy();

    const parserConfig = JSON.stringify(parserNode?.config ?? {});
    expect(parserConfig).toContain('$.name_en');
    expect(parserConfig).toContain('$.description_en');
    expect(parserConfig).toContain('$.catalogs[0].catalogId');
  });

  it('uses pass policy for zero-affected rows on all database nodes', () => {
    const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!entry) throw new Error('Missing starter_parameter_inference entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_parameter_inference_policy',
    });
    const updateNodes = config.nodes.filter(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );
    const queryNode = config.nodes.find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'query'
    );

    expect(updateNodes.length).toBeGreaterThanOrEqual(2);
    updateNodes.forEach((node) => {
      expect(node.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
    });
    expect(queryNode).toBeTruthy();
    expect(queryNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
  });

  it('materializes a strict-flow runnable graph', () => {
    const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!entry) throw new Error('Missing starter_parameter_inference entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_parameter_inference_runtime',
    });
    const report = evaluateRunPreflight({
      nodes: config.nodes,
      edges: config.edges,
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    if (report.shouldBlock) {
      console.log('Full report:', JSON.stringify(report, null, 2));
    }

    expect(report.shouldBlock).toBe(false);
    expect(report.blockReason).toBeNull();
    expect(report.compileReport.errors).toBe(0);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });
});
