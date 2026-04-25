import { describe, expect, it } from 'vitest';

import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
  materializeStarterWorkflowSeedBundle,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { handleParser } from '@/shared/lib/ai-paths/core/runtime/handlers/transform/parser';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import {
  PARAMETER_VALUE_INFERENCE_PATH_ID,
  PARAMETER_VALUE_INFERENCE_STARTER_TEMPLATE_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION,
  PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
} from '@/shared/lib/ai-paths/parameter-value-inference';

describe('starter parameter value inference workflow', () => {
  it('maps row-level parameter inference fields from the trigger payload', () => {
    const entry = getStarterWorkflowTemplateById(PARAMETER_VALUE_INFERENCE_STARTER_TEMPLATE_ID);
    if (!entry) throw new Error('Missing starter_parameter_value_inference entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_parameter_value_inference_mapping',
    });
    const parserNode = config.nodes.find((node) => node.type === 'parser');

    expect(parserNode).toBeTruthy();
    const parserConfig = JSON.stringify(parserNode?.config ?? {});
    expect(parserConfig).toContain('$.parameterValueInferenceInput.product.title');
    expect(parserConfig).toContain('$.parameterValueInferenceInput.product.description');
    expect(parserConfig).toContain('$.parameterValueInferenceInput.targetParameter');
    expect(parserConfig).toContain('$.parameterValueInferenceInput.currentValue');
  });

  it('guides model-name inference to use structured product titles instead of empty output', () => {
    const entry = getStarterWorkflowTemplateById(PARAMETER_VALUE_INFERENCE_STARTER_TEMPLATE_ID);
    if (!entry) throw new Error('Missing starter_parameter_value_inference entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_parameter_value_inference_prompt',
    });
    const promptNode = config.nodes.find((node) => node.type === 'prompt');
    const promptTemplate = JSON.stringify(promptNode?.config?.prompt ?? {});

    expect(promptTemplate).toContain('Model name');
    expect(promptTemplate).toContain('first segment before the first |');
    expect(promptTemplate).toContain('Do not return an empty value for text or textarea');
  });

  it('ships a canonical parameter-row trigger button bound to the starter path', () => {
    const bundle = materializeStarterWorkflowSeedBundle('canonical_seed');
    const triggerButton = bundle.triggerButtons.find(
      (button) => button.id === PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID
    );

    expect(bundle.pathConfigs.some((config) => config.id === PARAMETER_VALUE_INFERENCE_PATH_ID)).toBe(
      true
    );
    expect(triggerButton).toEqual(
      expect.objectContaining({
        name: PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
        pathId: PARAMETER_VALUE_INFERENCE_PATH_ID,
        locations: [PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION],
        mode: 'click',
      })
    );
    expect(triggerButton?.display).toEqual(
      expect.objectContaining({
        label: PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
        showLabel: true,
      })
    );
  });

  it('materializes the starter path with a matching trigger node event id', () => {
    const entry = getStarterWorkflowTemplateById(PARAMETER_VALUE_INFERENCE_STARTER_TEMPLATE_ID);
    if (!entry) throw new Error('Missing starter_parameter_value_inference entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: PARAMETER_VALUE_INFERENCE_PATH_ID,
      seededDefault: true,
    });
    const triggerNodes = config.nodes.filter((node) => node.type === 'trigger');

    expect(triggerNodes).toHaveLength(1);
    expect(triggerNodes[0]?.config?.trigger?.event).toBe(PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID);
  });

  it('parses embedded row-level trigger context into the model bundle', async () => {
    const entry = getStarterWorkflowTemplateById(PARAMETER_VALUE_INFERENCE_STARTER_TEMPLATE_ID);
    if (!entry) throw new Error('Missing starter_parameter_value_inference entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_parameter_value_inference_parser_runtime',
    });
    const parserNode = config.nodes.find((node) => node.type === 'parser');
    if (!parserNode) throw new Error('Missing parameter value inference parser node');

    const result = await handleParser({
      node: parserNode,
      nodeInputs: {
        context: {
          entityJson: {
            id: 'product-1',
            name_en: 'Soft plush keychain',
            description_en: 'Small plush keychain with metal ring.',
            images: ['https://example.test/product.jpg'],
            parameterValueInferenceInput: {
              product: {
                title: 'Soft plush keychain',
                description: 'Small plush keychain with metal ring.',
                imageLinks: ['https://example.test/product.jpg'],
              },
              targetParameter: {
                id: 'condition',
                name: 'Condition',
                selectorType: 'select',
                optionLabels: ['New', 'Used'],
                languageCode: 'en',
              },
              currentValue: '',
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
        sourceTitle: 'Soft plush keychain',
        sourceDescription: 'Small plush keychain with metal ring.',
        currentValue: '',
        images: ['https://example.test/product.jpg'],
        targetParameter: expect.objectContaining({
          id: 'condition',
          name: 'Condition',
          selectorType: 'select',
          optionLabels: ['New', 'Used'],
        }),
      })
    );
  });

  it('materializes a runnable starter graph without a hardcoded model selection', () => {
    const entry = getStarterWorkflowTemplateById(PARAMETER_VALUE_INFERENCE_STARTER_TEMPLATE_ID);
    if (!entry) throw new Error('Missing starter_parameter_value_inference entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_parameter_value_inference_runtime',
    });
    const modelNodes = config.nodes.filter((node) => node.type === 'model');
    const report = evaluateRunPreflight({
      nodes: config.nodes,
      edges: config.edges,
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(modelNodes).toHaveLength(1);
    expect(modelNodes[0]?.config?.model?.modelId).toBeUndefined();
    expect(entry.triggerButtonPresets?.[0]?.locations).toContain(
      PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION
    );
    expect(report.shouldBlock).toBe(false);
    expect(report.blockReason).toBeNull();
    expect(report.compileReport.errors).toBe(0);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });
});
