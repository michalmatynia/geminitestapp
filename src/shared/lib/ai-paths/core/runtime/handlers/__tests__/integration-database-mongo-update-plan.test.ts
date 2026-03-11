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
      } as DatabaseConfig,
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
      } as DatabaseConfig,
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
      } as DatabaseConfig,
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
      parseJsonTemplate: (template: string) =>
        template.includes('"id"')
          ? {
              id: 'product-1',
            }
          : {},
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

  it('blocks legacy translation mappings when no mapping updates resolve from inputs', async () => {
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
        updatePayloadMode: 'mapping',
        mappings: [
          {
            targetPath: 'description_pl',
            sourcePort: 'value',
            sourcePath: 'description_pl',
          },
          {
            targetPath: 'parameters',
            sourcePort: 'result',
            sourcePath: 'parameters',
          },
        ],
      } as DatabaseConfig,
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
      updateTemplate: '',
      templateInputs: {
        entityId: 'product-1',
        entityType: 'product',
      },
      parseJsonTemplate: (template: string) =>
        template.includes('"id"')
          ? {
              id: 'product-1',
            }
          : {},
      ensureExistingParameterTemplateContext: vi.fn(async () => {}),
      aiPrompt: '',
    });

    expect('output' in result).toBe(true);
    if (!('output' in result)) {
      throw new Error('Expected guardrail output.');
    }
    expect(result.output['bundle']).toEqual(
      expect.objectContaining({
        guardrail: 'translation-no-updates',
        guardrailMeta: expect.objectContaining({
          unresolvedSourcePorts: ['value', 'result'],
        }),
      })
    );
    expect(reportAiPathsError).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining('No safe description or parameter translation updates were resolved'),
      {
        variant: 'error',
      }
    );
  });

  it('builds partial mapping updates when only one translation branch resolves', async () => {
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
        value: {
          description_pl: 'Opis produktu',
        },
      },
      nodeInputPorts: ['entityId', 'value', 'result'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        updatePayloadMode: 'mapping',
        mappings: [
          {
            targetPath: 'description_pl',
            sourcePort: 'value',
            sourcePath: 'description_pl',
          },
          {
            targetPath: 'parameters',
            sourcePort: 'result',
            sourcePath: 'parameters',
          },
        ],
      } as DatabaseConfig,
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
      updateTemplate: '',
      templateInputs: {
        entityId: 'product-1',
        entityType: 'product',
        value: {
          description_pl: 'Opis produktu',
        },
      },
      parseJsonTemplate: (template: string) =>
        template.includes('"id"')
          ? {
              id: 'product-1',
            }
          : {},
      ensureExistingParameterTemplateContext: vi.fn(async () => {}),
      aiPrompt: '',
    });

    expect('plan' in result).toBe(true);
    if (!('plan' in result)) {
      throw new Error('Expected Mongo update plan.');
    }
    expect(result.plan.updates).toEqual({
      description_pl: 'Opis produktu',
    });
    expect(result.plan.updateDoc).toEqual({
      $set: {
        description_pl: 'Opis produktu',
      },
    });
    expect(result.plan.debugPayload).toEqual(
      expect.objectContaining({
        mode: 'mongo',
      })
    );
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('merges translated parameter language updates for custom translation update documents without relying on mappings', async () => {
    const templateInputs = {
      entityId: 'product-1',
      productId: 'product-1',
      entityType: 'product',
      value: {
        description_pl: 'Opis produktu',
      },
      result: {
        parameters: [{ parameterId: 'material', value: 'Skora' }],
      },
      context: {
        entity: {
          parameters: [
            {
              parameterId: 'material',
              value: 'Leather',
              valuesByLanguage: { en: 'Leather' },
            },
          ],
        },
      },
    } as const;

    const result = await buildMongoUpdatePlan({
      actionCategory: 'update',
      action: 'updateOne',
      node: {
        id: 'node-db-update-translate-en-pl',
        type: 'database',
        title: 'Database Update: Desc + Params',
      } as AiNode,
      prevOutputs: {},
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      resolvedInputs: {
        entityId: 'product-1',
        entityType: 'product',
        value: templateInputs.value,
        result: templateInputs.result,
      },
      nodeInputPorts: ['entityId', 'value', 'result'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        updatePayloadMode: 'custom',
      } as DatabaseConfig,
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
        '{"$set":{"description_pl":"{{value.description_pl}}","parameters":{{result.parameters}}}}',
      templateInputs,
      parseJsonTemplate: (template: string): unknown =>
        parseJsonSafe(
          renderJsonTemplate(
            template,
            templateInputs as unknown as Record<string, unknown>,
            templateInputs['value']
          )
        ),
      ensureExistingParameterTemplateContext: vi.fn(async () => {}),
      aiPrompt: '',
    });

    expect('plan' in result).toBe(true);
    if (!('plan' in result)) {
      throw new Error('Expected Mongo update plan.');
    }

    expect(result.plan.updates).toEqual({
      description_pl: 'Opis produktu',
      parameters: [
        {
          parameterId: 'material',
          value: 'Leather',
          valuesByLanguage: {
            en: 'Leather',
            pl: 'Skora',
          },
        },
      ],
    });
  });


  it('merges translated parameters into existing product rows for legacy translation mappings', async () => {
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
        value: {
          description_pl: 'Opis produktu',
        },
        result: {
          parameters: [
            { parameterId: 'color', value: 'Niebieski' },
            { parameterId: 'material', valuesByLanguage: { pl: 'Stal' } },
          ],
        },
      },
      nodeInputPorts: ['entityId', 'value', 'result'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        updatePayloadMode: 'mapping',
        mappings: [
          {
            targetPath: 'description_pl',
            sourcePort: 'value',
            sourcePath: 'description_pl',
          },
          {
            targetPath: 'parameters',
            sourcePort: 'result',
            sourcePath: 'parameters',
          },
        ],
      } as DatabaseConfig,
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
      updateTemplate: '',
      templateInputs: {
        entityId: 'product-1',
        entityType: 'product',
        value: {
          description_pl: 'Opis produktu',
        },
        result: {
          parameters: [
            { parameterId: 'color', value: 'Niebieski' },
            { parameterId: 'material', valuesByLanguage: { pl: 'Stal' } },
          ],
        },
        context: {
          entity: {
            parameters: [
              {
                parameterId: 'color',
                value: 'Blue',
                selectorType: 'select',
                optionLabels: ['Blue', 'Black'],
                valuesByLanguage: { en: 'Blue' },
              },
              {
                parameterId: 'material',
                value: 'Steel',
                attributeId: 'attr-material',
              },
            ],
          },
        },
      },
      parseJsonTemplate: (template: string) =>
        template.includes('"id"')
          ? {
              id: 'product-1',
            }
          : {},
      ensureExistingParameterTemplateContext: vi.fn(async () => {}),
      aiPrompt: '',
    });

    expect('plan' in result).toBe(true);
    if (!('plan' in result)) {
      throw new Error('Expected Mongo update plan.');
    }

    expect(result.plan.updates).toEqual({
      description_pl: 'Opis produktu',
      parameters: [
        {
          parameterId: 'color',
          value: 'Blue',
          selectorType: 'select',
          optionLabels: ['Blue', 'Black'],
          valuesByLanguage: { en: 'Blue', pl: 'Niebieski' },
        },
        {
          parameterId: 'material',
          value: 'Steel',
          attributeId: 'attr-material',
          valuesByLanguage: { pl: 'Stal' },
        },
      ],
    });
    expect(result.plan.updateDoc).toEqual({
      $set: {
        description_pl: 'Opis produktu',
        parameters: [
          {
            parameterId: 'color',
            value: 'Blue',
            selectorType: 'select',
            optionLabels: ['Blue', 'Black'],
            valuesByLanguage: { en: 'Blue', pl: 'Niebieski' },
          },
          {
            parameterId: 'material',
            value: 'Steel',
            attributeId: 'attr-material',
            valuesByLanguage: { pl: 'Stal' },
          },
        ],
      },
    });
    expect(result.plan.debugPayload).toEqual(
      expect.objectContaining({
        translationParameterMerge: expect.objectContaining({
          languageCode: 'pl',
          mergedCount: 2,
        }),
      })
    );
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
