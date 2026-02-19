import { describe, expect, it } from 'vitest';

import { applyParameterInferenceGuard } from '@/features/ai/ai-paths/lib/core/runtime/handlers/database-parameter-inference';

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
});
