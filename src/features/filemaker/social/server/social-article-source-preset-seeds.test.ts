import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./social-article-aggregator-repository', () => ({
  getSocialArticleSourcePresetsByIds: vi.fn(),
  upsertSocialArticleSourcePreset: vi.fn(),
}));

import {
  getSocialArticleSourcePresetsByIds,
  upsertSocialArticleSourcePreset,
} from './social-article-aggregator-repository';

import {
  AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET,
  SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS,
  seedSocialArticleSourcePresets,
} from './social-article-source-preset-seeds';

const mockGet = vi.mocked(getSocialArticleSourcePresetsByIds);
const mockUpsert = vi.mocked(upsertSocialArticleSourcePreset);

describe('SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS', () => {
  it('includes the artificialintelligence-news preset', () => {
    const ids = SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS.map((s) => s.id);
    expect(ids).toContain('ai-news-artificialintelligence-news-com');
  });
});

describe('AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET', () => {
  it('points to the correct scripter in replace mode', () => {
    expect(AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET.playwrightScripterId).toBe(
      'artificialintelligence-news'
    );
    expect(AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET.playwrightScripterMode).toBe('replace');
  });

  it('targets the correct URL', () => {
    expect(AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET.urls).toEqual([
      'https://www.artificialintelligence-news.com/',
    ]);
  });

  it('has crawlDepth 0 because the scripter handles pagination', () => {
    expect(AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET.crawlDepth).toBe(0);
  });
});

describe('seedSocialArticleSourcePresets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({
      ...AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('upserts missing presets and returns their ids in seeded', async () => {
    mockGet.mockResolvedValue([]);

    const result = await seedSocialArticleSourcePresets();

    expect(mockUpsert).toHaveBeenCalledTimes(SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS.length);
    expect(result.seeded).toEqual(
      SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS.map((s) => s.id)
    );
    expect(result.skipped).toEqual([]);
  });

  it('skips presets that already exist', async () => {
    mockGet.mockResolvedValue([
      {
        ...AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const result = await seedSocialArticleSourcePresets();

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(result.skipped).toContain('ai-news-artificialintelligence-news-com');
    expect(result.seeded).toHaveLength(0);
  });

  it('re-upserts existing presets when force=true', async () => {
    mockGet.mockResolvedValue([
      {
        ...AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const result = await seedSocialArticleSourcePresets({ force: true });

    expect(mockUpsert).toHaveBeenCalledTimes(SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS.length);
    expect(result.seeded).toContain('ai-news-artificialintelligence-news-com');
    expect(result.skipped).toHaveLength(0);
  });

  it('seeds only the specified ids when ids is provided', async () => {
    mockGet.mockResolvedValue([]);

    const result = await seedSocialArticleSourcePresets({
      ids: ['ai-news-artificialintelligence-news-com'],
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(result.seeded).toEqual(['ai-news-artificialintelligence-news-com']);
  });

  it('returns empty result when ids list matches nothing', async () => {
    mockGet.mockResolvedValue([]);

    const result = await seedSocialArticleSourcePresets({ ids: ['non-existent-id'] });

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(result.seeded).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });
});
