import { describe, expect, it } from 'vitest';

import {
  applyParameterInferenceGuard,
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
