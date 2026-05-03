import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeDatabaseUpdateMock } = vi.hoisted(() => ({
  executeDatabaseUpdateMock: vi.fn(),
}));

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution',
  () => ({
    executeDatabaseUpdate: executeDatabaseUpdateMock,
  })
);

import { handleDatabaseUpdateOperation } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-operation';
import type {
  HandleDatabaseUpdateOperationInput,
} from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-operation';
import type { AiNode, DatabaseConfig, DbQueryConfig } from '@/shared/contracts/ai-paths';

const createExecutedState = (): HandleDatabaseUpdateOperationInput['executed'] => ({
  notification: new Set(),
  updater: new Set(),
  http: new Set(),
  delay: new Set(),
  poll: new Set(),
  ai: new Set(),
  schema: new Set(),
  mapper: new Set(),
});

const baseQueryConfig: DbQueryConfig = {
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
};

const buildBaseArgs = (): HandleDatabaseUpdateOperationInput => ({
  node: {
    id: 'node-db-update-translate-en-pl',
    type: 'database',
    title: 'Database Update',
  } as AiNode,
  nodeInputs: {},
  prevOutputs: {},
  executed: createExecutedState(),
  reportAiPathsError: vi.fn(),
  toast: vi.fn(),
  simulationEntityType: 'product',
  simulationEntityId: 'product-1',
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
  nodeInputPorts: ['entityId', 'entityType', 'value', 'result'],
  dbConfig: {
    operation: 'update',
    entityType: 'product',
    mode: 'replace',
    updateStrategy: 'one',
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
  queryConfig: baseQueryConfig,
  dryRun: false,
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
  aiPrompt: '',
  ensureExistingParameterTemplateContext: vi.fn(async () => {}),
});

describe('handleDatabaseUpdateOperation', () => {
  beforeEach(() => {
    executeDatabaseUpdateMock.mockReset();
    executeDatabaseUpdateMock.mockResolvedValue({
      skipped: false,
      updateResult: { ok: true },
      executionMeta: { action: 'entityUpdate' },
      writeOutcome: {
        status: 'success',
        operation: 'update',
      },
    });
  });

  it('merges Polish translation updates into existing English parameter rows for mapping mode', async () => {
    const args = buildBaseArgs();

    const result = await handleDatabaseUpdateOperation(args);

    expect(args.ensureExistingParameterTemplateContext).toHaveBeenCalledWith('parameters', {
      forceHydrateRichParameters: true,
    });
    expect(executeDatabaseUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        updatePayloadMode: 'mapping',
        updates: {
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
      })
    );
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        updates: {
          description_pl: 'Opis produktu',
          parameters: [
            expect.objectContaining({
              parameterId: 'color',
              value: 'Blue',
              valuesByLanguage: { en: 'Blue', pl: 'Niebieski' },
            }),
            expect.objectContaining({
              parameterId: 'material',
              value: 'Steel',
              valuesByLanguage: { pl: 'Stal' },
            }),
          ],
        },
      })
    );
    expect(result['debugPayload']).toEqual(
      expect.objectContaining({
        localizedParameterMerge: expect.objectContaining({
          languageCode: 'pl',
          mergedCount: 2,
        }),
      })
    );
  });

  it('patches custom update documents with merged translation-safe parameter payloads', async () => {
    const args = buildBaseArgs();
    args.dbConfig = {
      ...args.dbConfig,
      updatePayloadMode: 'custom',
      updateTemplate:
        '{"$set":{"description_pl":"{{value.description_pl}}","parameters":{{result.parameters}}}}',
    } as DatabaseConfig;

    const result = await handleDatabaseUpdateOperation(args);

    expect(args.ensureExistingParameterTemplateContext).toHaveBeenCalledWith('parameters', {
      forceHydrateRichParameters: true,
    });
    expect(executeDatabaseUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        updatePayloadMode: 'custom',
        customUpdateDoc: {
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
        },
      })
    );
    expect(result['debugPayload']).toEqual(
      expect.objectContaining({
        localizedParameterMerge: expect.objectContaining({
          languageCode: 'pl',
          mergedCount: 2,
        }),
        updateDoc: {
          $set: {
            description_pl: 'Opis produktu',
            parameters: [
              expect.objectContaining({
                parameterId: 'color',
                value: 'Blue',
                valuesByLanguage: { en: 'Blue', pl: 'Niebieski' },
              }),
              expect.objectContaining({
                parameterId: 'material',
                value: 'Steel',
                valuesByLanguage: { pl: 'Stal' },
              }),
            ],
          },
        },
      })
    );
  });

  it('renders nested value-scoped translation tokens from the current payload fallback in custom mode', async () => {
    const args = buildBaseArgs();
    args.resolvedInputs = {
      entityId: 'product-1',
      entityType: 'product',
      result: {
        description_pl: 'Opis produktu',
        parameters: [
          { parameterId: 'color', value: 'Niebieski' },
          { parameterId: 'material', valuesByLanguage: { pl: 'Stal' } },
        ],
      },
    };
    args.nodeInputPorts = ['entityId', 'entityType', 'result'];
    args.dbConfig = {
      ...args.dbConfig,
      updatePayloadMode: 'custom',
      updateTemplate:
        '{"$set":{"description_pl":"{{value.description_pl}}","parameters":{{result.parameters}}}}',
    } as DatabaseConfig;
    args.templateInputs = {
      entityId: 'product-1',
      entityType: 'product',
      result: {
        description_pl: 'Opis produktu',
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
    };

    const result = await handleDatabaseUpdateOperation(args);

    expect(executeDatabaseUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        updatePayloadMode: 'custom',
        customUpdateDoc: {
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
        },
      })
    );
    expect(result['debugPayload']).toEqual(
      expect.objectContaining({
        updateDoc: {
          $set: {
            description_pl: 'Opis produktu',
            parameters: [
              expect.objectContaining({
                parameterId: 'color',
                value: 'Blue',
                valuesByLanguage: { en: 'Blue', pl: 'Niebieski' },
              }),
              expect.objectContaining({
                parameterId: 'material',
                value: 'Steel',
                valuesByLanguage: { pl: 'Stal' },
              }),
            ],
          },
        },
      })
    );
  });

  it('blocks unsafe stale translation writes when no safe parameter or description update remains', async () => {
    const args = buildBaseArgs();
    args.resolvedInputs = {
      entityId: 'product-1',
      entityType: 'product',
      result: {
        parameters: [{ parameterId: 'unknown', value: 'Nowa wartość' }],
      },
    };
    args.templateInputs = {
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
    };

    const result = await handleDatabaseUpdateOperation(args);

    expect(executeDatabaseUpdateMock).not.toHaveBeenCalled();
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        guardrail: 'no-safe-updates',
      })
    );
    expect(result['debugPayload']).toEqual(
      expect.objectContaining({
        localizedParameterMerge: expect.objectContaining({
          skippedCount: 1,
          writeCandidates: 0,
        }),
      })
    );
    expect(args.reportAiPathsError).toHaveBeenCalled();
    expect(args.toast).toHaveBeenCalledWith(
      'Database update blocked. No safe write candidates were resolved after applying the configured write policies.',
      { variant: 'error' }
    );
  });

  it('auto-falls back to mapping mode when custom template fails guardrail but mappings are configured', async () => {
    executeDatabaseUpdateMock.mockResolvedValue({
      skipped: false,
      updateResult: { ok: true },
      executionMeta: { action: 'entityUpdate' },
      writeOutcome: { status: 'success', affectedCount: 1 },
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();
    const result = await handleDatabaseUpdateOperation({
      node: {
        id: 'node-db-update-fallback',
        type: 'database',
        title: 'Database Update',
      } as AiNode,
      nodeInputs: {},
      prevOutputs: {},
      executed: createExecutedState(),
      reportAiPathsError,
      toast,
      simulationEntityType: 'product',
      simulationEntityId: 'product-1',
      resolvedInputs: {
        entityId: 'product-1',
        entityType: 'product',
        result: {
          parameters: [{ parameterId: 'color', value: 'Blue' }],
        },
      },
      nodeInputPorts: ['entityId', 'result'],
      dbConfig: {
        operation: 'update',
        entityType: 'product',
        mode: 'replace',
        updateStrategy: 'one',
        updatePayloadMode: 'custom',
        updateTemplate: '{"$set":{"parameters":{{missingPort.parameters}}}}',
        mappings: [
          { targetPath: 'parameters', sourcePort: 'result', sourcePath: 'parameters' },
        ],
      } as DatabaseConfig,
      queryConfig: baseQueryConfig,
      dryRun: false,
      templateInputs: {
        entityId: 'product-1',
        entityType: 'product',
        result: {
          parameters: [{ parameterId: 'color', value: 'Blue' }],
        },
      },
      aiPrompt: '',
      ensureExistingParameterTemplateContext: vi.fn(async () => {}),
    });

    expect(executeDatabaseUpdateMock).toHaveBeenCalled();
    expect(reportAiPathsError).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining('Update template has unresolved tokens'),
      expect.objectContaining({ variant: 'warning' })
    );
    expect(result['bundle']).not.toEqual(expect.objectContaining({ guardrail: 'write-template-values' }));
  });
});
