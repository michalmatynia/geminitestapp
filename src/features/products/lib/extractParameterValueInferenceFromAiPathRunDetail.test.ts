import { describe, expect, it } from 'vitest';

import { extractParameterValueInferenceResultFromAiPathRunDetail } from './extractParameterValueInferenceFromAiPathRunDetail';

describe('extractParameterValueInferenceResultFromAiPathRunDetail', () => {
  it('extracts the inferred value from the final regex node output', () => {
    expect(
      extractParameterValueInferenceResultFromAiPathRunDetail({
        nodes: [
          {
            type: 'regex',
            outputs: {
              value: {
                parameterId: 'condition',
                value: 'Used',
                confidence: 0.88,
              },
            },
          },
        ],
      })
    ).toEqual({
      parameterId: 'condition',
      value: 'Used',
      confidence: 0.88,
    });
  });

  it('accepts an empty inferred value as an explicit result', () => {
    expect(
      extractParameterValueInferenceResultFromAiPathRunDetail({
        nodes: [
          {
            type: 'regex',
            outputs: {
              value: {
                parameterId: 'condition',
                value: '',
                confidence: 0,
              },
            },
          },
        ],
      })
    ).toEqual({
      parameterId: 'condition',
      value: '',
      confidence: 0,
    });
  });

  it('parses fenced JSON model output when no regex object is available', () => {
    expect(
      extractParameterValueInferenceResultFromAiPathRunDetail({
        nodes: [
          {
            type: 'model',
            outputs: {
              result: '```json\n{"parameterId":"material","value":"Metal","confidence":0.73}\n```',
            },
          },
        ],
      })
    ).toEqual({
      parameterId: 'material',
      value: 'Metal',
      confidence: 0.73,
    });
  });
});
