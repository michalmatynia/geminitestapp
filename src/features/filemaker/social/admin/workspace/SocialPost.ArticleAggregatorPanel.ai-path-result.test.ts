import { describe, expect, it } from 'vitest';

import { extractSocialArticleAggregationAiPathRunText } from './SocialPost.ArticleAggregatorPanel.ai-path-result';

describe('SocialPost.ArticleAggregatorPanel AI Path result extraction', () => {
  it('uses the canonical run result when it is present', () => {
    expect(
      extractSocialArticleAggregationAiPathRunText({
        result: {
          bodyEn: 'Generated article post from run.result',
        },
        runtimeState: {
          outputs: {
            model: {
              result: 'Generated article post from runtime state',
            },
          },
        },
      })
    ).toBe('Generated article post from run.result');
  });

  it('falls back to model output stored in runtime state', () => {
    expect(
      extractSocialArticleAggregationAiPathRunText({
        result: undefined,
        runtimeState: {
          status: 'completed',
          outputs: {
            trigger: {
              triggerName: 'social_article_aggregation',
            },
            model: {
              result: 'Generated article post from runtime state',
              status: 'completed',
            },
          },
        },
      })
    ).toBe('Generated article post from runtime state');
  });

  it('prefers the longest graph output candidate instead of status strings', () => {
    expect(
      extractSocialArticleAggregationAiPathRunText({
        runtimeState: {
          nodeOutputs: {
            model: {
              result: 'Short',
            },
            parser: {
              summary: 'Longer generated social article aggregation post.',
            },
          },
          status: 'completed',
        },
      })
    ).toBe('Longer generated social article aggregation post.');
  });
});
