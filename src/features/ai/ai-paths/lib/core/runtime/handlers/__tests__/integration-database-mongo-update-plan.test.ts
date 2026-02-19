import { describe, expect, it, vi } from 'vitest';

import { buildMongoUpdatePlan } from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-mongo-update-plan';
import { coerceInput, parseJsonSafe, renderJsonTemplate } from '@/features/ai/ai-paths/lib/core/utils';

describe('buildMongoUpdatePlan', () => {
  it('applies merged parameter updates into custom update doc and exposes updateDoc in debug payload', async () => {
    const templateInputs = {
      value: [{ parameterId: 'param-1', value: 'Metal' }],
      result: [
        { id: 'param-1', selectorType: 'text' },
        { id: 'param-2', selectorType: 'text' },
      ],
      context: {
        entity: {
          parameters: [
            { parameterId: 'param-1', value: '' },
            { parameterId: 'param-2', value: '' },
          ],
        },
      },
      entityId: 'product-1',
      productId: 'product-1',
      entityType: 'product',
    } as const;

    const result = await buildMongoUpdatePlan({
      actionCategory: 'update',
      action: 'updateOne',
      node: {
        id: 'node-update-params',
        type: 'database',
        title: 'Database Query',
      },
      prevOutputs: {},
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      resolvedInputs: {
        entityId: 'product-1',
        productId: 'product-1',
        entityType: 'product',
      },
      nodeInputPorts: ['value', 'result', 'entityId'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
        parameterInferenceGuard: {
          enabled: true,
          targetPath: 'parameters',
          definitionsPort: 'result',
          definitionsPath: '',
          enforceOptionLabels: false,
          allowUnknownParameterIds: false,
        },
      },
      queryConfig: {
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
      collection: 'products',
      filter: { id: 'product-1' },
      idType: 'string',
      updateTemplate: '{"$set":{"parameters":{{value}}}}',
      templateInputs,
      parseJsonTemplate: (template: string): unknown =>
        parseJsonSafe(
          renderJsonTemplate(
            template,
            templateInputs as unknown as Record<string, unknown>,
            coerceInput(templateInputs['value']) ?? ''
          )
        ),
      ensureExistingParameterTemplateContext: vi.fn(async () => {}),
      aiPrompt: '',
    });

    if (!('plan' in result)) {
      throw new Error('Expected plan result');
    }

    const updateDoc = result.plan.updateDoc as Record<string, unknown>;
    const updateSet = updateDoc['$set'] as Record<string, unknown>;
    const parameters = updateSet['parameters'] as Array<Record<string, unknown>>;

    expect(Array.isArray(parameters)).toBe(true);
    expect(parameters).toHaveLength(2);
    expect(
      parameters.find((entry) => entry['parameterId'] === 'param-1')?.['value']
    ).toBe('Metal');
    expect(
      parameters.find((entry) => entry['parameterId'] === 'param-2')?.['value']
    ).toBe('');
    expect(result.plan.debugPayload['updateDoc']).toEqual(result.plan.updateDoc);
  });

  it('returns explicit guardrail output when update template ports are missing', async () => {
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const result = await buildMongoUpdatePlan({
      actionCategory: 'update',
      action: 'updateOne',
      node: {
        id: 'node-db-update-translate-en-pl',
        type: 'database',
        title: 'Database Update: Desc + Params',
      },
      prevOutputs: {},
      reportAiPathsError,
      toast,
      resolvedInputs: {
        entityId: 'product-1',
        entityType: 'product',
      },
      nodeInputPorts: ['entityId', 'value', 'result'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        mappings: [
          {
            targetPath: '__translation_description_payload__',
            sourcePort: 'value',
          },
          {
            targetPath: '__translation_parameters_payload__',
            sourcePort: 'result',
          },
        ],
      },
      queryConfig: {
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
      collection: 'products',
      filter: { id: 'product-1' },
      idType: 'string',
      updateTemplate:
        '{\n' +
        '  "$set": {\n' +
        '    "description_pl": "{{value.description_pl}}",\n' +
        '    "parameters": {{bundle.parameters}}\n' +
        '  }\n' +
        '}',
      templateInputs: {
        entityId: 'product-1',
        entityType: 'product',
        value: {
          description_pl: 'Opis',
        },
        result: {
          parameters: [{ parameterId: 'param-1', valuesByLanguage: { pl: 'Wartosc' } }],
        },
      },
      parseJsonTemplate: (template: string): unknown =>
        parseJsonSafe(
          renderJsonTemplate(
            template,
            {
              entityId: 'product-1',
              entityType: 'product',
              value: { description_pl: 'Opis' },
              result: {
                parameters: [{ parameterId: 'param-1', valuesByLanguage: { pl: 'Wartosc' } }],
              },
            },
            ''
          )
        ),
      ensureExistingParameterTemplateContext: vi.fn(async () => {}),
      aiPrompt: '',
    });

    expect('output' in result).toBe(true);
    if (!('output' in result)) {
      throw new Error('Expected guardrail output.');
    }
    const outputBundle = result.output.bundle as Record<string, unknown>;
    expect(outputBundle).toEqual(
      expect.objectContaining({
        guardrail: 'update-template-inputs',
      })
    );
    const missingTemplatePorts = outputBundle['missingTemplatePorts'];
    expect(Array.isArray(missingTemplatePorts)).toBe(true);
    expect(missingTemplatePorts).toContain('bundle');
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining('Update template is missing connected inputs'),
      { variant: 'error' }
    );
    expect(reportAiPathsError).toHaveBeenCalled();
  });
});
