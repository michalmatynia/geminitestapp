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

  it('prefers runtime regex output over trigger and viewer product parameters', () => {
    expect(
      extractParameterValueInferenceResultFromAiPathRunDetail({
        run: {
          runtimeState: {
            nodeOutputs: {
              'node-trigger': {
                trigger: 'Parameter Value Inference',
                context: {
                  product: {
                    parameters: [
                      {
                        parameterId: 'material',
                        value: 'Metal',
                      },
                    ],
                  },
                },
                entityJson: {
                  parameters: [
                    {
                      parameterId: 'material',
                      value: 'Metal',
                    },
                  ],
                },
              },
              'node-regex': {
                grouped: {},
                matches: [],
                value: {
                  parameterId: 'colour',
                  value: 'darkened silver',
                  confidence: 1,
                },
              },
              'node-viewer': {
                context: {
                  product: {
                    parameters: [
                      {
                        parameterId: 'condition',
                        value: 'Used',
                      },
                    ],
                  },
                },
                bundle: {
                  parameters: [
                    {
                      parameterId: 'condition',
                      value: 'Used',
                    },
                  ],
                },
              },
            },
          },
        },
      })
    ).toEqual({
      parameterId: 'colour',
      value: 'darkened silver',
      confidence: 1,
    });
  });

  it('ignores runtime trigger context when it only contains existing product parameter values', () => {
    expect(
      extractParameterValueInferenceResultFromAiPathRunDetail({
        run: {
          runtimeState: {
            nodeOutputs: {
              'node-trigger': {
                trigger: 'Parameter Value Inference',
                entityId: 'product-1',
                entityType: 'product',
                entityJson: {
                  parameters: [
                    {
                      parameterId: 'material',
                      value: 'Metal',
                    },
                  ],
                },
              },
            },
          },
        },
      })
    ).toBeNull();
  });

  it('extracts fenced JSON model output from runtime state when nodes are unavailable', () => {
    expect(
      extractParameterValueInferenceResultFromAiPathRunDetail({
        run: {
          runtimeState: {
            nodeOutputs: {
              'node-trigger': {
                trigger: 'Parameter Value Inference',
                entityJson: {
                  parameters: [
                    {
                      parameterId: 'material',
                      value: 'Metal',
                    },
                  ],
                },
              },
              'node-model': {
                result:
                  '```json\n{"parameterId":"colour","value":"darkened silver","confidence":0.94}\n```',
                status: 'completed',
              },
            },
          },
        },
      })
    ).toEqual({
      parameterId: 'colour',
      value: 'darkened silver',
      confidence: 0.94,
    });
  });
});
