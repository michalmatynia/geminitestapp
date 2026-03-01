import { describe, expect, it, vi } from 'vitest';

import { buildMongoUpdatePlan } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-update-plan';
import { parseJsonSafe, renderJsonTemplate } from '@/shared/lib/ai-paths/core/utils';
import type { AiNode, DbQueryConfig, DatabaseConfig } from '@/shared/contracts/ai-paths';

describe('buildMongoUpdatePlan', () => {
  it('builds plan from explicit update template and exposes updateDoc in debug payload', async () => {
    const templateInputs = {
      value: [{ parameterId: 'param-1', value: 'Metal' }],
      result: [{ parameterId: 'param-1', value: 'Metal' }],
      entityId: 'product-1',
      productId: 'product-1',
      entityType: 'product',
    };

    const result = await buildMongoUpdatePlan({
      actionCategory: 'update',
      action: 'updateOne',
      node: {
        id: 'node-update-params',
        type: 'database',
        title: 'Database Query',
      } as AiNode,
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
      } as unknown as DatabaseConfig,
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
      } as DbQueryConfig,
      collection: 'products',
      filter: { id: 'product-1' },
      idType: 'string',
      updateTemplate: '{"$set":{"parameters":{{result}}}}',
      templateInputs,
      parseJsonTemplate: (template: string): unknown =>
        parseJsonSafe(
          renderJsonTemplate(
            template,
            templateInputs as Record<string, unknown>,
            templateInputs['value']
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
    expect(parameters).toHaveLength(1);
    expect(parameters.find((entry) => entry['parameterId'] === 'param-1')?.['value']).toBe('Metal');
    expect(result.plan.primaryTarget).toBe('parameters');
    expect(result.plan.updates).toEqual(
      expect.objectContaining({
        parameters: [{ parameterId: 'param-1', value: 'Metal' }],
      })
    );
    expect(result.plan.debugPayload['updateDoc']).toEqual(result.plan.updateDoc);
  });

  it('materializes full parameter rows from definitions while preserving existing values', async () => {
    const templateInputs = {
      value: [{ parameterId: 'color', value: 'Blue' }],
      result: [
        { id: 'color', selectorType: 'text', optionLabels: [] },
        { id: 'material', selectorType: 'text', optionLabels: [] },
        { id: 'model_number', selectorType: 'text', optionLabels: [] },
      ],
      context: {
        entity: {
          parameters: [
            { parameterId: 'color', value: '' },
            { parameterId: 'material', value: 'Steel' },
            { parameterId: 'cf_model_name', value: 'X100' },
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
      } as AiNode,
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
        parameterInferenceGuard: {
          enabled: true,
          targetPath: 'parameters',
          definitionsPort: 'result',
          definitionsPath: '',
          enforceOptionLabels: false,
          allowUnknownParameterIds: false,
        },
      } as unknown as DatabaseConfig,
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
      } as DbQueryConfig,
      collection: 'products',
      filter: { id: 'product-1' },
      idType: 'string',
      updateTemplate: '{"$set":{"parameters":{{value}}}}',
      templateInputs,
      parseJsonTemplate: (template: string): unknown =>
        parseJsonSafe(
          renderJsonTemplate(
            template,
            templateInputs as Record<string, unknown>,
            templateInputs['value']
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

    expect(parameters).toEqual([
      { parameterId: 'color', value: 'Blue' },
      { parameterId: 'material', value: 'Steel' },
      { parameterId: 'cf_model_name', value: 'X100' },
      { parameterId: 'model_number', value: '' },
    ]);
  });

  it('blocks mapping payload mode with explicit guardrail output', async () => {
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const result = await buildMongoUpdatePlan({
      actionCategory: 'update',
      action: 'updateOne',
      node: {
        id: 'node-update-params',
        type: 'database',
        title: 'Database Query',
      } as AiNode,
      prevOutputs: {},
      reportAiPathsError,
      toast,
      resolvedInputs: {
        entityId: 'product-1',
      },
      nodeInputPorts: ['value'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        updatePayloadMode: 'invalid' as any,
      } as unknown as DatabaseConfig,
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
      } as DbQueryConfig,
      collection: 'products',
      filter: { id: 'product-1' },
      idType: 'string',
      updateTemplate: '{"$set":{"parameters":{{value}}}}',
      templateInputs: {
        entityId: 'product-1',
      },
      parseJsonTemplate: () => ({}),
      ensureExistingParameterTemplateContext: vi.fn(async () => {}),
      aiPrompt: '',
    });

    expect('output' in result).toBe(true);
    if (!('output' in result)) {
      throw new Error('Expected guardrail output.');
    }
    expect(result.output['bundle']).toEqual(
      expect.objectContaining({
        guardrail: 'update-mode-explicit-only',
      })
    );
    expect(reportAiPathsError).toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
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
      } as AiNode,
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
        updatePayloadMode: 'custom',
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
      } as unknown as DatabaseConfig,
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
      } as DbQueryConfig,
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
    const outputBundle = result.output['bundle'] as Record<string, unknown>;
    expect(outputBundle).toEqual(
      expect.objectContaining({
        guardrail: 'write-template-values',
      })
    );
    const guardrailMeta = outputBundle['guardrailMeta'] as Record<string, unknown>;
    expect(guardrailMeta).toEqual(
      expect.objectContaining({
        code: 'write-template-values',
      })
    );
    const missingTokens = guardrailMeta['missingTokens'];
    expect(Array.isArray(missingTokens)).toBe(true);
    expect(missingTokens).toContain('bundle.parameters');
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Database write blocked'), {
      variant: 'error',
    });
    expect(reportAiPathsError).toHaveBeenCalled();
  });
});
