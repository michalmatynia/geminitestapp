import { describe, expect, it } from 'vitest';

import { extractDebrandedMarketplaceCopyResultFromAiPathRunDetail } from './extractDebrandedMarketplaceCopyFromAiPathRunDetail';

describe('extractDebrandedMarketplaceCopyResultFromAiPathRunDetail', () => {
  it('extracts debranded title and description from mapper bundle output', () => {
    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'mapper',
            outputs: {
              bundle: {
                debrandedTitle: 'WH 40k Space Marine Figure',
                debrandedDescription: 'Compatible with grimdark sci-fi armies.',
              },
            },
          },
        ],
      })
    ).toEqual({
      title: 'WH 40k Space Marine Figure',
      description: 'Compatible with grimdark sci-fi armies.',
    });
  });

  it('falls back to runtimeState node outputs when nodes are unavailable', () => {
    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        run: {
          runtimeState: {
            nodeOutputs: {
              'node-final': {
                result: {
                  alternateTitle: 'WH Figure',
                  alternateDescription: 'Hints at the original universe without naming it.',
                },
              },
            },
          },
        },
      })
    ).toEqual({
      title: 'WH Figure',
      description: 'Hints at the original universe without naming it.',
    });
  });

  it('extracts debranded copy from stringified JSON output', () => {
    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'llm',
            outputs: {
              text: '{"debrandedTitle":"WH Figure","debrandedDescription":"Neutral listing copy"}',
            },
          },
        ],
      })
    ).toEqual({
      title: 'WH Figure',
      description: 'Neutral listing copy',
    });
  });

  it('extracts debranded copy from fenced JSON output', () => {
    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'llm',
            outputs: {
              text: '```json\n{"debrandedTitle":"WH Figure","debrandedDescription":"Neutral listing copy"}\n```',
            },
          },
        ],
      })
    ).toEqual({
      title: 'WH Figure',
      description: 'Neutral listing copy',
    });
  });

  it('extracts debranded copy from nested stringified JSON output', () => {
    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        run: {
          runtimeState: {
            nodeOutputs: {
              'node-final': {
                result:
                  '{"alternateTitle":"WH 40k Figure","alternateDescription":"Marketplace-safe description"}',
              },
            },
          },
        },
      })
    ).toEqual({
      title: 'WH 40k Figure',
      description: 'Marketplace-safe description',
    });
  });

  it('extracts debranded copy from array-wrapped output', () => {
    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'llm',
            outputs: {
              choices: [
                {
                  debrandedTitle: 'WH Figure',
                  debrandedDescription: 'Array-wrapped listing copy',
                },
              ],
            },
          },
        ],
      })
    ).toEqual({
      title: 'WH Figure',
      description: 'Array-wrapped listing copy',
    });
  });

  it('extracts debranded copy from stringified JSON array output', () => {
    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'llm',
            outputs: {
              text: '[{"debrandedTitle":"WH Figure","debrandedDescription":"Array JSON listing copy"}]',
            },
          },
        ],
      })
    ).toEqual({
      title: 'WH Figure',
      description: 'Array JSON listing copy',
    });
  });

  it('extracts marketplace override values from database update payloads', () => {
    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'database',
            outputs: {
              debugPayload: {
                updateDoc: {
                  $set: {
                    'marketplaceContentOverrides.0.title': 'WH Figure',
                    'marketplaceContentOverrides.0.description': 'Debranded listing copy',
                  },
                },
              },
            },
          },
        ],
      })
    ).toEqual({
      title: 'WH Figure',
      description: 'Debranded listing copy',
    });
  });

  it('does not treat source-context nodes as debranded output', () => {
    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        nodes: [
          {
            type: 'fetcher',
            outputs: {
              entityJson: {
                title: 'Original branded title',
                description: 'Original branded description',
              },
            },
          },
          {
            type: 'parser',
            outputs: {
              bundle: {
                title: 'Source title from parser',
                description: 'Source description from parser',
              },
            },
          },
        ],
      })
    ).toBeNull();
  });

  it('still extracts debranded copy from result nodes when source-context nodes are present', () => {
    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        nodes: [
          {
            type: 'fetcher',
            outputs: {
              entityJson: {
                title: 'Original branded title',
                description: 'Original branded description',
              },
            },
          },
          {
            type: 'regex',
            outputs: {
              value: {
                debrandedTitle: 'WH Figure',
                debrandedDescription: 'Filtered result copy',
              },
            },
          },
        ],
      })
    ).toEqual({
      title: 'WH Figure',
      description: 'Filtered result copy',
    });
  });

  it('skips cyclic output branches while scanning for debranded copy', () => {
    const cyclicOutput: Record<string, unknown> = {};
    cyclicOutput['self'] = cyclicOutput;
    cyclicOutput['next'] = {
      debrandedTitle: 'WH Figure',
      debrandedDescription: 'Cycle-safe listing copy',
    };

    expect(
      extractDebrandedMarketplaceCopyResultFromAiPathRunDetail({
        nodes: [
          {
            nodeType: 'llm',
            outputs: cyclicOutput,
          },
        ],
      })
    ).toEqual({
      title: 'WH Figure',
      description: 'Cycle-safe listing copy',
    });
  });
});
