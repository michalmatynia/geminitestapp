import type { Page } from 'playwright';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SocialArticleAggregatorInputSource } from '@/shared/lib/browser-execution/sequencers/SocialArticleAggregatorSequencer';

import type { MappedScripterRecord, ScripterDefinition } from './types';

const {
  createPlaywrightPageDriverMock,
  mapScripterRecordsMock,
  runScripterMock,
} = vi.hoisted(() => ({
  createPlaywrightPageDriverMock: vi.fn(),
  mapScripterRecordsMock: vi.fn(),
  runScripterMock: vi.fn(),
}));

vi.mock('./playwright-page-driver', () => ({
  createPlaywrightPageDriver: (...args: unknown[]) => createPlaywrightPageDriverMock(...args),
}));

vi.mock('./scripter-dry-run', () => ({
  mapScripterRecords: (...args: unknown[]) => mapScripterRecordsMock(...args),
}));

vi.mock('./scripter-runner', () => ({
  runScripter: (...args: unknown[]) => runScripterMock(...args),
}));

import { runSocialArticleSourceScripter } from './social-article-adapter';

const page = {} as Page;
const driver = { kind: 'driver' };

const definition: ScripterDefinition = {
  id: 'news-scripter',
  version: 1,
  siteHost: 'original.example',
  entryUrl: 'https://original.example/news',
  steps: [
    { id: 'open', kind: 'goto', url: 'https://original.example/news' },
    {
      id: 'list',
      kind: 'extractList',
      itemSelector: 'article',
      fields: { url: { selector: 'a', attribute: 'href' } },
    },
  ],
  fieldMap: {
    bindings: {
      sourceUrl: { path: 'url' },
      title: { path: 'title' },
      description: { path: 'description' },
      images: { path: 'imageUrl' },
    },
  },
};

const source: SocialArticleAggregatorInputSource = {
  excludePatterns: [],
  includePatterns: [],
  maxArticles: 5,
  presetId: 'preset-1',
  presetName: 'News preset',
  playwrightScripterDefinition: definition,
  playwrightScripterId: 'news-scripter',
  playwrightScripterMode: 'replace',
  url: 'https://example.com/news',
};

const mappedRecord = (
  raw: Record<string, unknown>,
  mapped: Partial<MappedScripterRecord>
): MappedScripterRecord => ({
  brand: null,
  category: null,
  currency: null,
  description: null,
  ean: null,
  externalId: null,
  images: [],
  price: null,
  raw,
  sku: null,
  sourceUrl: null,
  title: null,
  ...mapped,
});

describe('runSocialArticleSourceScripter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPlaywrightPageDriverMock.mockReturnValue(driver);
    runScripterMock.mockResolvedValue({
      errors: [],
      records: [],
      telemetry: [],
      visitedUrls: [],
    });
    mapScripterRecordsMock.mockReturnValue([]);
  });

  it('returns a diagnostic warning when the source scripter definition is unavailable', async () => {
    const result = await runSocialArticleSourceScripter(
      page,
      {
        ...source,
        playwrightScripterDefinition: null,
      },
      { limit: 3, maxArticleChars: 1000 }
    );

    expect(result.articles).toEqual([]);
    expect(result.candidates).toEqual([]);
    expect(result.diagnostic.scripterId).toBe('news-scripter');
    expect(result.diagnostic.errors.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/news-scripter/);
    expect(runScripterMock).not.toHaveBeenCalled();
  });

  it('maps short scripter records to article candidates and long records to direct articles', async () => {
    const longBody = Array.from({ length: 45 }, (_, index) => `word${index}`).join(' ');
    runScripterMock.mockResolvedValue({
      errors: [{ stepId: 'optional', message: 'optional selector missed' }],
      records: [{ id: 'raw-short' }, { id: 'raw-long' }],
      telemetry: [
        {
          durationMs: 12.8,
          error: null,
          kind: 'extractList',
          recordsAdded: 2,
          startedAt: 1,
          stepId: 'list',
        },
      ],
      visitedUrls: ['https://example.com/news'],
    });
    mapScripterRecordsMock.mockReturnValue([
      {
        index: 0,
        issues: [],
        raw: {
          description: 'Short description',
          url: '/short-story',
        },
        mapped: mappedRecord(
          { id: 'raw-short' },
          {
            description: 'Mapped short description',
            sourceUrl: '/short-story',
            title: 'Short Story',
          }
        ),
      },
      {
        index: 1,
        issues: [],
        raw: {
          articleBody: longBody,
          author: 'Reporter',
          canonicalUrl: '/long-story',
          datePublished: '2026-05-19',
          imageUrl: '/image.jpg',
          url: '/long-story',
        },
        mapped: mappedRecord(
          { id: 'raw-long' },
          {
            description: 'Long description',
            images: ['/image.jpg'],
            sourceUrl: '/long-story',
            title: 'Long Story',
          }
        ),
      },
    ]);

    const result = await runSocialArticleSourceScripter(page, source, {
      limit: 3,
      maxArticleChars: 1000,
    });

    expect(runScripterMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entryUrl: 'https://example.com/news',
        steps: expect.arrayContaining([
          expect.objectContaining({
            id: 'open',
            url: 'https://example.com/news',
          }),
        ]),
      }),
      driver,
      { entryUrl: 'https://example.com/news', limit: 3 }
    );
    expect(result.candidates).toEqual([
      expect.objectContaining({
        description: 'Mapped short description',
        title: 'Short Story',
        url: 'https://example.com/short-story',
      }),
    ]);
    expect(result.articles).toEqual([
      expect.objectContaining({
        author: 'Reporter',
        canonicalUrl: 'https://example.com/long-story',
        imageUrl: 'https://example.com/image.jpg',
        publishedAt: '2026-05-19',
        resolvedUrl: 'https://example.com/long-story',
        sourcePresetId: 'preset-1',
        sourceUrl: 'https://example.com/news',
        title: 'Long Story',
        wordCount: 45,
      }),
    ]);
    expect(result.diagnostic).toEqual(
      expect.objectContaining({
        articleCount: 1,
        candidateCount: 1,
        mode: 'replace',
        rawRecordCount: 2,
        scripterId: 'news-scripter',
        sourcePresetId: 'preset-1',
      })
    );
    expect(result.diagnostic.telemetry[0]).toEqual(
      expect.objectContaining({
        durationMs: 12,
        kind: 'extractList',
        recordsAdded: 2,
        stepId: 'list',
      })
    );
    expect(result.warnings).toContain('optional: optional selector missed');
  });
});
