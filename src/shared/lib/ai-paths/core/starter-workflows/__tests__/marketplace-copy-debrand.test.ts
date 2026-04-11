import { describe, expect, it } from 'vitest';

import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowRecoveryBundle,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { handleParser } from '@/shared/lib/ai-paths/core/runtime/handlers/transform/parser';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import {
  MARKETPLACE_COPY_DEBRAND_PATH_ID,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
} from '@/shared/lib/ai-paths/marketplace-copy-debrand';

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

  it('materializes the canonical Debrand path with a matching trigger node event id', () => {
    const entry = getStarterWorkflowTemplateById('starter_marketplace_copy_debrand');
    if (!entry) throw new Error('Missing starter_marketplace_copy_debrand entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: MARKETPLACE_COPY_DEBRAND_PATH_ID,
      seededDefault: true,
    });
    const triggerNodes = config.nodes.filter((node) => node.type === 'trigger');

    expect(triggerNodes).toHaveLength(1);
    expect(triggerNodes[0]?.config?.trigger?.event).toBe(MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID);
  });

  it('restores the canonical Debrand row trigger from the static recovery bundle', () => {
    const bundle = materializeStarterWorkflowRecoveryBundle('static_recovery');
    const triggerButton = bundle.triggerButtons.find(
      (button) => button.id === 'bdf0f5d2-a300-4f79-991c-2b5f1e0ef3a4'
    );

    expect(bundle.pathConfigs.some((config) => config.id === 'path_marketplace_copy_debrand_v1')).toBe(
      true
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

  it('parses embedded row-level trigger context into the model bundle', async () => {
    const entry = getStarterWorkflowTemplateById('starter_marketplace_copy_debrand');
    if (!entry) throw new Error('Missing starter_marketplace_copy_debrand entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_marketplace_copy_debrand_parser_runtime',
    });
    const parserNode = config.nodes.find((node) => node.id === 'node-parser-marketplace-copy-debrand');
    if (!parserNode) throw new Error('Missing marketplace copy debrand parser node');

    const result = await handleParser({
      node: parserNode,
      nodeInputs: {
        context: {
          entityJson: {
            id: 'product-1',
            name_en: 'Warhammer 40,000 Space Marine Figure',
            description_en: 'Official branded description',
            images: ['https://example.test/product.jpg'],
            marketplaceCopyDebrandInput: {
              sourceEnglishTitle: 'Warhammer 40,000 Space Marine Figure',
              sourceEnglishDescription: 'Official branded description',
              targetRow: {
                id: 'row-1',
                index: 0,
                integrationIds: ['integration-tradera'],
                integrationNames: ['Tradera'],
                currentAlternateTitle: 'Old branded marketplace title',
                currentAlternateDescription: 'Old branded marketplace description',
              },
            },
          },
        },
      },
      fetchEntityCached: async () => null,
      simulationEntityType: null,
      resolvedEntity: null,
      reportAiPathsError: () => undefined,
    } as Parameters<typeof handleParser>[0]);

    expect(result['bundle']).toEqual(
      expect.objectContaining({
        sourceEnglishTitle: 'Warhammer 40,000 Space Marine Figure',
        sourceEnglishDescription: 'Official branded description',
        productTitle: 'Warhammer 40,000 Space Marine Figure',
        productDescriptionEn: 'Official branded description',
        images: ['https://example.test/product.jpg'],
        rowContext: expect.objectContaining({
          id: 'row-1',
          integrationNames: ['Tradera'],
          currentAlternateTitle: 'Old branded marketplace title',
          currentAlternateDescription: 'Old branded marketplace description',
        }),
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
