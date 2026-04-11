import { describe, expect, it } from 'vitest';

import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowRecoveryBundle,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';

describe('starter marketplace copy debrand workflow', () => {
  it('maps row-level debrand source fields from the trigger payload', () => {
    const entry = getStarterWorkflowTemplateById('starter_marketplace_copy_debrand');
    if (!entry) throw new Error('Missing starter_marketplace_copy_debrand entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_marketplace_copy_debrand_mapping',
    });
    const parserNode = config.nodes.find((node) => node.id === 'node-parser-marketplace-copy-debrand');

    expect(parserNode).toBeTruthy();

    const parserConfig = JSON.stringify(parserNode?.config ?? {});
    expect(parserConfig).toContain('$.marketplaceCopyDebrandInput.sourceEnglishTitle');
    expect(parserConfig).toContain('$.marketplaceCopyDebrandInput.sourceEnglishDescription');
    expect(parserConfig).toContain('$.marketplaceCopyDebrandInput.targetRow');
  });

  it('ships a canonical Debrand trigger button bound to the starter path', () => {
    const bundle = materializeStarterWorkflowRecoveryBundle('auto_seed');
    const triggerButton = bundle.triggerButtons.find(
      (button) => button.id === 'bdf0f5d2-a300-4f79-991c-2b5f1e0ef3a4'
    );

    expect(triggerButton).toEqual(
      expect.objectContaining({
        name: 'Debrand',
        pathId: 'path_marketplace_copy_debrand_v1',
        locations: ['product_marketplace_copy_row'],
        mode: 'click',
      })
    );
    expect(triggerButton?.display).toEqual(
      expect.objectContaining({
        label: 'Debrand',
        showLabel: true,
      })
    );
  });

  it('extracts the model JSON response through the final value output', () => {
    const entry = getStarterWorkflowTemplateById('starter_marketplace_copy_debrand');
    if (!entry) throw new Error('Missing starter_marketplace_copy_debrand entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_marketplace_copy_debrand_result_contract',
    });
    const regexNode = config.nodes.find(
      (node) => node.id === 'node-regex-marketplace-copy-debrand'
    );
    const resultEdge = config.edges.find(
      (edge) =>
        edge.from === 'node-regex-marketplace-copy-debrand' &&
        edge.fromPort === 'value' &&
        edge.to === 'node-view-marketplace-copy-debrand'
    );

    expect(regexNode?.type).toBe('regex');
    expect(regexNode?.outputs).toContain('value');
    expect(regexNode?.config?.regex).toEqual(
      expect.objectContaining({
        mode: 'extract_json',
        outputMode: 'object',
        jsonIntegrityPolicy: 'repair',
      })
    );
    expect(resultEdge).toEqual(
      expect.objectContaining({
        toPort: 'bundle',
      })
    );
  });

  it('materializes a runnable row-level starter graph without background database writes', () => {
    const entry = getStarterWorkflowTemplateById('starter_marketplace_copy_debrand');
    if (!entry) throw new Error('Missing starter_marketplace_copy_debrand entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_marketplace_copy_debrand_runtime',
    });
    const report = evaluateRunPreflight({
      nodes: config.nodes,
      edges: config.edges,
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(config.nodes.some((node) => node.type === 'database')).toBe(false);
    expect(entry.triggerButtonPresets?.[0]?.locations).toContain('product_marketplace_copy_row');
    expect(report.shouldBlock).toBe(false);
    expect(report.blockReason).toBeNull();
    expect(report.compileReport.errors).toBe(0);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });
});
