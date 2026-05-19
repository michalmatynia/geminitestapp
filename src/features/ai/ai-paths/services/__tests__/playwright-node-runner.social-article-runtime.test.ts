import type { Page } from 'playwright';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable prefer-arrow-callback */

type SequencerContext = {
  emit: (type: string, payload: unknown) => void;
  log?: (message: string, context?: unknown) => void;
  page: Page;
  runScripter?: (source: Record<string, unknown>, options: Record<string, unknown>) => Promise<unknown>;
};

const socialArticleSequencerMock = vi.hoisted(() => ({
  instances: [] as Array<{ context: SequencerContext; input: Record<string, unknown> }>,
  scan: vi.fn<() => Promise<void>>(),
}));

const runSocialArticleSourceScripterMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/playwright/scripters/social-article-adapter', () => ({
  runSocialArticleSourceScripter: (...args: unknown[]) =>
    runSocialArticleSourceScripterMock(...args),
}));

vi.mock('@/shared/lib/browser-execution/sequencers/SocialArticleAggregatorSequencer', () => ({
  SocialArticleAggregatorSequencer: vi.fn().mockImplementation(function MockSocialArticleSequencer(
    context: SequencerContext,
    input: Record<string, unknown>
  ) {
    socialArticleSequencerMock.instances.push({ context, input });
    return {
      scan: socialArticleSequencerMock.scan,
    };
  }),
}));

describe('playwright-node-runner.social-article-runtime', () => {
  beforeEach(() => {
    socialArticleSequencerMock.instances.length = 0;
    socialArticleSequencerMock.scan.mockReset();
    runSocialArticleSourceScripterMock.mockReset();
  });

  it('injects the source scripter runner into the article aggregator sequencer', async () => {
    const { executeSocialArticleAggregatorScrapeRuntime } = await import(
      '../playwright-node-runner.social-article-runtime'
    );
    const page = { url: () => 'https://example.com/news' } as unknown as Page;
    const emit = vi.fn();
    const log = vi.fn();
    const source = {
      playwrightScripterId: 'news-scripter',
      playwrightScripterMode: 'replace',
      url: 'https://example.com/news',
    };

    runSocialArticleSourceScripterMock.mockResolvedValue({
      articles: [],
      candidates: [],
      diagnostic: {
        articleCount: 0,
        candidateCount: 0,
        errors: [],
        mode: 'replace',
        rawRecordCount: 0,
        scripterId: 'news-scripter',
        sourcePresetId: null,
        sourceUrl: 'https://example.com/news',
        telemetry: [],
        visitedUrls: [],
        warnings: [],
      },
      visitedUrls: [],
      warnings: [],
    });
    socialArticleSequencerMock.scan.mockImplementation(() => {
      const instance = socialArticleSequencerMock.instances[0];
      const runScripter = instance?.context.runScripter;
      if (runScripter === undefined) {
        return Promise.reject(new Error('runScripter was not injected'));
      }
      return runScripter(source, { limit: 3, maxArticleChars: 45000 }).then(() => {
        instance.context.emit('result', {
          articles: [],
          currentUrl: 'https://example.com/news',
          message: 'Scraped 0 article(s).',
          scripterDiagnostics: [],
          status: 'completed',
          steps: [
            {
              completedAt: '2026-05-19T00:00:01.000Z',
              details: [],
              durationMs: 1000,
              key: 'social_article_aggregator_finalize',
              label: 'Finalize article scrape',
              message: 'Done',
              startedAt: '2026-05-19T00:00:00.000Z',
              status: 'completed',
              url: 'https://example.com/news',
              warning: null,
            },
          ],
          visitedUrls: ['https://example.com/news'],
          warnings: [],
        });
      });
    });

    const result = await executeSocialArticleAggregatorScrapeRuntime({
      page,
      input: { sources: [source] },
      emit,
      log,
    });

    expect(socialArticleSequencerMock.instances).toHaveLength(1);
    expect(socialArticleSequencerMock.instances[0]?.context.page).toBe(page);
    expect(socialArticleSequencerMock.instances[0]?.input).toEqual({ sources: [source] });
    expect(runSocialArticleSourceScripterMock).toHaveBeenCalledWith(
      page,
      source,
      { limit: 3, maxArticleChars: 45000 }
    );
    expect(emit).toHaveBeenCalledWith(
      'result',
      expect.objectContaining({ status: 'completed' })
    );
    expect(result).toMatchObject({
      status: 'completed',
      actionRunSteps: expect.arrayContaining([
        expect.objectContaining({ key: 'browser_preparation' }),
        expect.objectContaining({ key: 'social_article_aggregator_finalize' }),
        expect.objectContaining({ key: 'browser_close' }),
      ]),
    });
  });
});
