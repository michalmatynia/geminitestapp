import { describe, expect, it } from 'vitest';

import { extractTranslationEnPlFromAiPathRunDetail } from './extractTranslationEnPlFromAiPathRunDetail';

describe('extractTranslationEnPlFromAiPathRunDetail', () => {
  it('extracts translation updates from database update payloads in runtime state', () => {
    expect(
      extractTranslationEnPlFromAiPathRunDetail({
        run: {
          runtimeState: {
            outputs: {
              'node-db-update': {
                debugPayload: {
                  updateDoc: {
                    $set: {
                      description_pl: 'Polski opis produktu',
                      parameters: [
                        {
                          parameterId: 'color',
                          value: 'Blue',
                          valuesByLanguage: {
                            pl: 'Niebieski',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      })
    ).toEqual({
      descriptionPl: 'Polski opis produktu',
      parameterTranslations: [
        {
          parameterId: 'color',
          value: 'Niebieski',
        },
      ],
    });
  });

  it('merges description and parameter translations across result-bearing nodes', () => {
    expect(
      extractTranslationEnPlFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'regex',
            outputs: {
              value: {
                description_pl: 'Opis z wezla regex',
              },
            },
          },
          {
            nodeType: 'mapper',
            outputs: {
              result: {
                parameters: [
                  {
                    parameterId: 'material',
                    value: 'Metal',
                    valuesByLanguage: {
                      pl: 'Metal',
                    },
                  },
                  {
                    parameterId: 'theme',
                    value: 'One Piece',
                    valuesByLanguage: {
                      pl: 'One Piece',
                    },
                  },
                ],
              },
            },
          },
        ],
      })
    ).toEqual({
      descriptionPl: 'Opis z wezla regex',
      parameterTranslations: [
        {
          parameterId: 'material',
          value: 'Metal',
        },
        {
          parameterId: 'theme',
          value: 'One Piece',
        },
      ],
    });
  });

  it('ignores source-only parser and fetcher payloads', () => {
    expect(
      extractTranslationEnPlFromAiPathRunDetail({
        nodes: [
          {
            type: 'fetcher',
            outputs: {
              entityJson: {
                description_pl: '',
                parameters: [
                  {
                    parameterId: 'color',
                    value: 'Blue',
                  },
                ],
              },
            },
          },
          {
            type: 'parser',
            outputs: {
              bundle: {
                description_pl: '',
                parameters: [
                  {
                    parameterId: 'color',
                    value: 'Blue',
                  },
                ],
              },
            },
          },
        ],
      })
    ).toBeNull();
  });

  it('extracts parameter translations from stringified JSON outputs', () => {
    expect(
      extractTranslationEnPlFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'model',
            outputs: {
              result:
                '{"parameters":[{"parameterId":"color","value":"Blue","valuesByLanguage":{"pl":"Niebieski"}}]}',
            },
          },
        ],
      })
    ).toEqual({
      descriptionPl: null,
      parameterTranslations: [
        {
          parameterId: 'color',
          value: 'Niebieski',
        },
      ],
    });
  });
});
