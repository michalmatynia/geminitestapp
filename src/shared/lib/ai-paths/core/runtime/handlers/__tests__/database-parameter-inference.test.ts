import { describe, expect, it } from 'vitest';

import {
  applyParameterInferenceGuard,
  mergeTranslatedParameterUpdates,
  materializeParameterInferenceUpdates,
} from '@/shared/lib/ai-paths/core/runtime/handlers/database-parameter-inference';

describe('applyParameterInferenceGuard', () => {
  it('normalizes multi-value text parameter inference to title-cased pipe delimiter', () => {
    const result = applyParameterInferenceGuard({
      dbConfig: {
        operation: 'update',
        parameterInferenceGuard: {
          enabled: true,
          targetPath: 'parameters',
          definitionsPort: 'result',
          definitionsPath: '',
          enforceOptionLabels: false,
          allowUnknownParameterIds: false,
        },
      },
      updates: {
        parameters: [
          {
            parameterId: 'color',
            value: 'silver, gold, blue',
          },
        ],
      },
      templateInputs: {
        result: [
          {
            id: 'color',
            selectorType: 'text',
            optionLabels: [],
          },
        ],
      },
    });

    expect(result.blocked).not.toBe(true);
    expect(result.updates).toEqual({
      parameters: [
        {
          parameterId: 'color',
          value: 'Silver|Gold|Blue',
        },
      ],
    });
  });

  it('normalizes checklist parameter inference to pipe delimiter', () => {
    const result = applyParameterInferenceGuard({
      dbConfig: {
        operation: 'update',
        parameterInferenceGuard: {
          enabled: true,
          targetPath: 'parameters',
          definitionsPort: 'result',
          definitionsPath: '',
          enforceOptionLabels: true,
          allowUnknownParameterIds: false,
        },
      },
      updates: {
        parameters: [
          {
            parameterId: 'color',
            value: 'silver, gold, blue',
          },
        ],
      },
      templateInputs: {
        result: [
          {
            id: 'color',
            selectorType: 'checklist',
            optionLabels: ['Silver', 'Gold', 'Blue'],
          },
        ],
      },
    });

    expect(result.blocked).not.toBe(true);
    expect(result.updates).toEqual({
      parameters: [
        {
          parameterId: 'color',
          value: 'Silver|Gold|Blue',
        },
      ],
    });
  });

  it('accepts existing pipe-delimited checklist values', () => {
    const result = applyParameterInferenceGuard({
      dbConfig: {
        operation: 'update',
        parameterInferenceGuard: {
          enabled: true,
          targetPath: 'parameters',
          definitionsPort: 'result',
          definitionsPath: '',
          enforceOptionLabels: true,
          allowUnknownParameterIds: false,
        },
      },
      updates: {
        parameters: [
          {
            parameterId: 'color',
            value: 'silver|gold',
          },
        ],
      },
      templateInputs: {
        result: [
          {
            id: 'color',
            selectorType: 'checklist',
            optionLabels: ['Silver', 'Gold', 'Blue'],
          },
        ],
      },
    });

    expect(result.blocked).not.toBe(true);
    expect(result.updates).toEqual({
      parameters: [
        {
          parameterId: 'color',
          value: 'Silver|Gold',
        },
      ],
    });
  });

  it('blocks deprecated parameter inference target paths outside canonical parameters', () => {
    const result = applyParameterInferenceGuard({
      dbConfig: {
        operation: 'update',
        parameterInferenceGuard: {
          enabled: true,
          targetPath: 'simpleParameters',
          definitionsPort: 'result',
          definitionsPath: '',
          enforceOptionLabels: true,
          allowUnknownParameterIds: false,
        },
      },
      updates: {
        simpleParameters: [{ parameterId: 'color', value: 'Blue' }],
      },
      templateInputs: {
        result: [{ id: 'color', selectorType: 'text', optionLabels: [] }],
      },
    });

    expect(result.blocked).toBe(true);
    expect(result.errorMessage).toMatch(/targetPath must use canonical "parameters" path/i);
    expect(result.updates).toEqual({});
  });

  it('materializes missing definition rows and preserves custom parameters', () => {
    const result = materializeParameterInferenceUpdates({
      targetPath: 'parameters',
      updates: {
        parameters: [{ parameterId: 'color', value: 'Blue' }],
      },
      templateInputs: {
        context: {
          entity: {
            parameters: [
              { parameterId: 'color', value: '' },
              { parameterId: 'material', value: 'Steel' },
              { parameterId: 'cf_model_name', value: 'X100' },
            ],
          },
        },
        result: [
          { id: 'color', selectorType: 'text', optionLabels: [] },
          { id: 'material', selectorType: 'text', optionLabels: [] },
          { id: 'model_number', selectorType: 'text', optionLabels: [] },
        ],
      },
      definitionsPort: 'result',
      definitionsPath: '',
    });

    expect(result.updates).toEqual({
      parameters: [
        { parameterId: 'color', value: 'Blue' },
        { parameterId: 'material', value: 'Steel' },
        { parameterId: 'cf_model_name', value: 'X100' },
        { parameterId: 'model_number', value: '' },
      ],
    });
  });

  it('creates full parameter rows with empty values when existing rows are missing', () => {
    const result = materializeParameterInferenceUpdates({
      targetPath: 'parameters',
      updates: {},
      templateInputs: {
        result: [
          { id: 'color', selectorType: 'text', optionLabels: [] },
          { id: 'material', selectorType: 'text', optionLabels: [] },
        ],
      },
      definitionsPort: 'result',
      definitionsPath: '',
    });

    expect(result.updates).toEqual({
      parameters: [
        { parameterId: 'color', value: '' },
        { parameterId: 'material', value: '' },
      ],
    });
  });
});

describe('mergeTranslatedParameterUpdates', () => {
  it('preserves existing parameter metadata while merging Polish translations by parameterId', () => {
    const result = mergeTranslatedParameterUpdates({
      targetPath: 'parameters',
      updates: {
        parameters: [
          { parameterId: 'color', value: 'Niebieski' },
          { parameterId: 'material', valuesByLanguage: { pl: 'Stal' } },
        ],
      },
      templateInputs: {
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
      languageCode: 'pl',
    });

    expect(result.applied).toBe(true);
    expect(result.updates).toEqual({
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
  });

  it('skips parameter writes when the translation payload does not match existing parameter rows', () => {
    const result = mergeTranslatedParameterUpdates({
      targetPath: 'parameters',
      updates: {
        parameters: [{ parameterId: 'unknown', value: 'Nowa wartosc' }],
      },
      templateInputs: {
        context: {
          entity: {
            parameters: [{ parameterId: 'color', value: 'Blue' }],
          },
        },
      },
      languageCode: 'pl',
    });

    expect(result.applied).toBe(true);
    expect(result.updates).toEqual({});
    expect(result.meta).toEqual(
      expect.objectContaining({
        mergedCount: 0,
        skipped: expect.objectContaining({
          unknownParameterIds: 1,
        }),
      })
    );
  });

  it('skips translation parameter writes when full parameter coverage is required and payload is incomplete', () => {
    const result = mergeTranslatedParameterUpdates({
      targetPath: 'parameters',
      updates: {
        parameters: [{ parameterId: 'color', value: 'Niebieski' }],
      },
      templateInputs: {
        context: {
          entity: {
            parameters: [
              { parameterId: 'color', value: 'Blue' },
              { parameterId: 'material', value: 'Steel' },
            ],
          },
        },
      },
      languageCode: 'pl',
      requireFullCoverage: true,
    });

    expect(result.applied).toBe(true);
    expect(result.updates).toEqual({});
    expect(result.meta).toEqual(
      expect.objectContaining({
        coverage: expect.objectContaining({
          requiredCount: 2,
          matchedCount: 1,
          complete: false,
        }),
        skipped: expect.objectContaining({
          reason: 'incomplete_coverage',
        }),
      })
    );
  });
});
