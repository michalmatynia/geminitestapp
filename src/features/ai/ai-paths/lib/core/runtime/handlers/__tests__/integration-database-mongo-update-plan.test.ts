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
        queryTemplate: '{\"id\":\"{{entityId}}\"}',
        limit: 1,
        sort: '',
        projection: '',
        single: true,
      },
      collection: 'products',
      filter: { id: 'product-1' },
      idType: 'string',
      updateTemplate: '{\"$set\":{\"parameters\":{{value}}}}',
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
});
