import 'server-only';

import type { SocialArticleSourcePreset } from '@/shared/contracts/social-article-aggregator';

import {
  getSocialArticleSourcePresetsByIds,
  upsertSocialArticleSourcePreset,
} from './social-article-aggregator-repository';

/**
 * Built-in source preset for https://www.artificialintelligence-news.com/.
 *
 * Paired with the `artificialintelligence-news` Playwright scripter
 * (data/scripters/artificialintelligence-news.json) which drives the full
 * extraction, so crawlDepth=0 and mode='replace'.
 */
export const AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET = {
  id: 'ai-news-artificialintelligence-news-com',
  name: 'AI News (artificialintelligence-news.com)',
  urls: ['https://www.artificialintelligence-news.com/'],
  enabled: true,
  obeyRobotsTxt: true,
  maxArticlesPerSource: 20,
  crawlDepth: 0,
  includePatterns: [],
  excludePatterns: [],
  playwrightScripterId: 'artificialintelligence-news',
  playwrightScripterMode: 'replace' as const,
} satisfies Omit<SocialArticleSourcePreset, 'createdAt' | 'updatedAt'>;

export const SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS = [
  AI_NEWS_ARTIFICIALINTELLIGENCE_SOURCE_PRESET,
] as const;

export type SeedSocialArticleSourcePresetsResult = {
  seeded: string[];
  skipped: string[];
};

/**
 * Upserts built-in source presets that are not yet present in the store.
 * Safe to call on every startup — existing presets are left unchanged.
 *
 * Pass `force: true` to overwrite any existing seed presets (useful in dev
 * to reset presets back to their defaults).
 */
export async function seedSocialArticleSourcePresets(
  options: { ids?: string[]; force?: boolean } = {}
): Promise<SeedSocialArticleSourcePresetsResult> {
  const seeds = options.ids
    ? SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS.filter((s) =>
        options.ids!.includes(s.id)
      )
    : SOCIAL_ARTICLE_SOURCE_PRESET_SEEDS;

  if (seeds.length === 0) {
    return { seeded: [], skipped: [] };
  }

  const existing = await getSocialArticleSourcePresetsByIds(seeds.map((s) => s.id));
  const existingIds = new Set(existing.map((p) => p.id));

  const seeded: string[] = [];
  const skipped: string[] = [];

  for (const seed of seeds) {
    if (!options.force && existingIds.has(seed.id)) {
      skipped.push(seed.id);
      continue;
    }
    await upsertSocialArticleSourcePreset(seed);
    seeded.push(seed.id);
  }

  return { seeded, skipped };
}
