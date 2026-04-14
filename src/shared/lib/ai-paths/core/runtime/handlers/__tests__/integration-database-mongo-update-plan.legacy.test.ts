import { describe, expect, it, vi } from 'vitest';

import { buildMongoUpdatePlan } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-update-plan';
import { parseJsonSafe, renderJsonTemplate } from '@/shared/lib/ai-paths/core/utils';
import type { AiNode, DbQueryConfig, DatabaseConfig } from '@/shared/contracts/ai-paths';

describe('buildMongoUpdatePlan', () => {
  it('keeps description updates and applies safe partial legacy parameter translations', async () => {
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
          parameters: [{ parameterId: 'color', value: 'Niebieski' }],
        },
      },
      nodeInputPorts: ['entityId', 'value', 'result'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        updatePayloadMode: 'mapping',
        skipEmpty: true,
        trimStrings: true,
        localizedParameterMerge: {
          enabled: true,
          targetPath: 'parameters',
          languageCode: 'pl',
          requireFullCoverage: false,
        },
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
          parameters: [{ parameterId: 'color', value: 'Niebieski' }],
        },
        context: {
          entity: {
            parameters: [
              { parameterId: 'color', value: 'Blue' },
              { parameterId: 'material', value: 'Steel' },
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
          valuesByLanguage: {
            pl: 'Niebieski',
          },
        },
        {
          parameterId: 'material',
          value: 'Steel',
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
            valuesByLanguage: {
              pl: 'Niebieski',
            },
          },
          {
            parameterId: 'material',
            value: 'Steel',
          },
        ],
      },
    });
    expect(result.plan.debugPayload).toEqual(
      expect.objectContaining({
        localizedParameterMerge: expect.objectContaining({
          mergedCount: 1,
          coverage: expect.objectContaining({
            requiredCount: 2,
            matchedCount: 1,
            complete: false,
          }),
        }),
      })
    );
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('keeps safe partial legacy parameter translations when description is unavailable', async () => {
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
        result: {
          parameters: [{ parameterId: 'color', value: 'Niebieski' }],
        },
      },
      nodeInputPorts: ['entityId', 'value', 'result'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        updatePayloadMode: 'mapping',
        skipEmpty: true,
        trimStrings: true,
        localizedParameterMerge: {
          enabled: true,
          targetPath: 'parameters',
          languageCode: 'pl',
          requireFullCoverage: false,
        },
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
        result: {
          parameters: [{ parameterId: 'color', value: 'Niebieski' }],
        },
        context: {
          entity: {
            parameters: [
              { parameterId: 'color', value: 'Blue' },
              { parameterId: 'material', value: 'Steel' },
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
      parameters: [
        {
          parameterId: 'color',
          value: 'Blue',
          valuesByLanguage: {
            pl: 'Niebieski',
          },
        },
        {
          parameterId: 'material',
          value: 'Steel',
        },
      ],
    });
    expect(result.plan.updateDoc).toEqual({
      $set: {
        parameters: [
          {
            parameterId: 'color',
            value: 'Blue',
            valuesByLanguage: {
              pl: 'Niebieski',
            },
          },
          {
            parameterId: 'material',
            value: 'Steel',
          },
        ],
      },
    });
    expect(result.plan.debugPayload).toEqual(
      expect.objectContaining({
        localizedParameterMerge: expect.objectContaining({
          mergedCount: 1,
          coverage: expect.objectContaining({
            requiredCount: 2,
            matchedCount: 1,
            complete: false,
          }),
        }),
      })
    );
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('rehydrates canonical English parameter values before applying legacy translation merges from modal context', async () => {
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const templateInputs = {
      entityId: 'product-1',
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
              valuesByLanguage: { pl: 'Skora' },
            },
          ],
        },
        entityJson: {
          parameters: [
            {
              parameterId: 'material',
              value: 'Leather',
              valuesByLanguage: { pl: 'Skora' },
            },
          ],
        },
      },
    };
    const ensureExistingParameterTemplateContext = vi.fn(
      async (
        _targetPath: string,
        options?: { forceHydrateRichParameters?: boolean }
      ): Promise<void> => {
        if (options?.forceHydrateRichParameters !== true) return;
        const canonicalEntity = {
          parameters: [
            {
              parameterId: 'material',
              value: 'Leather',
              valuesByLanguage: { en: 'Leather' },
            },
          ],
        };
        (templateInputs.context as Record<string, unknown>)['entity'] = canonicalEntity;
        (templateInputs.context as Record<string, unknown>)['entityJson'] = canonicalEntity;
      }
    );

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
        value: templateInputs.value,
        result: templateInputs.result,
      },
      nodeInputPorts: ['entityId', 'value', 'result'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        updatePayloadMode: 'mapping',
        skipEmpty: true,
        trimStrings: true,
        localizedParameterMerge: {
          enabled: true,
          targetPath: 'parameters',
          languageCode: 'pl',
          requireFullCoverage: false,
        },
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
      templateInputs,
      parseJsonTemplate: (template: string) =>
        template.includes('"id"')
          ? {
              id: 'product-1',
            }
          : {},
      ensureExistingParameterTemplateContext,
      aiPrompt: '',
    });

    expect('plan' in result).toBe(true);
    if (!('plan' in result)) {
      throw new Error('Expected Mongo update plan.');
    }

    expect(ensureExistingParameterTemplateContext).toHaveBeenCalledWith('parameters', {
      forceHydrateRichParameters: true,
    });
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
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('hydrates existing parameters before merging legacy translation results when context is initially missing', async () => {
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const templateInputs: Record<string, unknown> = {
      entityId: 'product-1',
      entityType: 'product',
      result: {
        parameters: [{ parameterId: 'color', value: 'Niebieski' }],
      },
    };
    const ensureExistingParameterTemplateContext = vi.fn(async (): Promise<void> => {
      templateInputs['context'] = {
        entity: {
          parameters: [
            { parameterId: 'color', value: 'Blue' },
            { parameterId: 'material', value: 'Steel' },
          ],
        },
        entityId: 'product-1',
        entityType: 'product',
        productId: 'product-1',
      };
    });

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
        result: {
          parameters: [{ parameterId: 'color', value: 'Niebieski' }],
        },
      },
      nodeInputPorts: ['entityId', 'value', 'result'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        updatePayloadMode: 'mapping',
        skipEmpty: true,
        trimStrings: true,
        localizedParameterMerge: {
          enabled: true,
          targetPath: 'parameters',
          languageCode: 'pl',
          requireFullCoverage: false,
        },
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
      templateInputs,
      parseJsonTemplate: (template: string) =>
        template.includes('"id"')
          ? {
              id: 'product-1',
            }
          : {},
      ensureExistingParameterTemplateContext,
      aiPrompt: '',
    });

    expect('plan' in result).toBe(true);
    if (!('plan' in result)) {
      throw new Error('Expected Mongo update plan.');
    }

    expect(ensureExistingParameterTemplateContext).toHaveBeenCalledWith('parameters', {
      forceHydrateRichParameters: true,
    });
    expect(result.plan.updateDoc).toEqual({
      $set: {
        parameters: [
          {
            parameterId: 'color',
            value: 'Blue',
            valuesByLanguage: {
              pl: 'Niebieski',
            },
          },
          {
            parameterId: 'material',
            value: 'Steel',
          },
        ],
      },
    });
    expect(result.plan.debugPayload).toEqual(
      expect.objectContaining({
        localizedParameterMerge: expect.objectContaining({
          mergedCount: 1,
          writeCandidates: 2,
        }),
      })
    );
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('blocks legacy translation mappings when no safe translation updates resolve', async () => {
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
        result: {
          parameters: [{ parameterId: 'unknown', value: 'Nowa wartość' }],
        },
      },
      nodeInputPorts: ['entityId', 'value', 'result'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        updatePayloadMode: 'mapping',
        skipEmpty: true,
        trimStrings: true,
        localizedParameterMerge: {
          enabled: true,
          targetPath: 'parameters',
          languageCode: 'pl',
          requireFullCoverage: false,
        },
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
        result: {
          parameters: [{ parameterId: 'unknown', value: 'Nowa wartość' }],
        },
        context: {
          entity: {
            parameters: [{ parameterId: 'color', value: 'Blue' }],
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

    expect('output' in result).toBe(true);
    if (!('output' in result)) {
      throw new Error('Expected guardrail output.');
    }

    expect(result.output['bundle']).toEqual(
      expect.objectContaining({
        guardrail: 'no-safe-updates',
      })
    );
    expect(reportAiPathsError).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining('No safe write candidates were resolved'),
      {
        variant: 'error',
      }
    );
  });

  it('auto-falls back to mapping mode when custom template guardrail fails and mappings are configured', async () => {
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const templateInputs = {
      entityId: 'product-1',
      value: {
        description_pl: 'Opis',
      },
      result: {
        parameters: [{ parameterId: 'param-1', value: 'Wartosc' }],
      },
    };
    const result = await buildMongoUpdatePlan({
      actionCategory: 'update',
      action: 'updateOne',
      node: {
        id: 'node-db-update-translate-en-pl',
        type: 'database',
        title: 'Database Update',
      } as AiNode,
      prevOutputs: {},
      reportAiPathsError,
      toast,
      resolvedInputs: {
        entityId: 'product-1',
        value: {
          description_pl: 'Opis',
        },
        result: {
          parameters: [{ parameterId: 'param-1', value: 'Wartosc' }],
        },
      },
      nodeInputPorts: ['entityId', 'value', 'result'],
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        updatePayloadMode: 'custom',
        skipEmpty: true,
        trimStrings: true,
        localizedParameterMerge: {
          enabled: true,
          targetPath: 'parameters',
          languageCode: 'pl',
          requireFullCoverage: false,
        },
        mappings: [
          {
            sourcePort: 'value',
            sourcePath: 'description_pl',
            targetPath: 'description_pl',
          },
          {
            sourcePort: 'result',
            sourcePath: 'parameters',
            targetPath: 'parameters',
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
      updateTemplate:
        '{\n' +
        '  "$set": {\n' +
        '    "description_pl": "{{value.description_pl}}",\n' +
        '    "parameters": {{bundle.parameters}}\n' +
        '  }\n' +
        '}',
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

    expect('plan' in result).toBe(true);
    if (!('plan' in result)) {
      throw new Error('Expected plan after mapping fallback.');
    }
    expect(result.plan.updateDoc).toEqual({
      $set: expect.objectContaining({
        description_pl: 'Opis',
        parameters: expect.arrayContaining([
          expect.objectContaining({ parameterId: 'param-1' }),
        ]),
      }),
    });
    expect(reportAiPathsError).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('returns no-safe-updates when custom template ports are missing and mapping inputs are also disconnected', async () => {
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
        skipEmpty: true,
        trimStrings: true,
        localizedParameterMerge: {
          enabled: true,
          targetPath: 'parameters',
          languageCode: 'pl',
          requireFullCoverage: false,
        },
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
        guardrail: 'no-safe-updates',
      })
    );
    expect(reportAiPathsError).toHaveBeenCalled();
  });
});
