import { getHomeContent } from '@/lib/cms';
import type { HomeEditorialContent, HomeEditorialReportContent } from '@/data/homeContent';

export type LoreDropsArticle = HomeEditorialReportContent & {
  slug: string;
};

type LocaleInput = string | null | undefined;

const LORE_DROPS_PREFIX = '/lore-drops/';

export function slugifyLoreDropsArticle(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug.length > 0 ? slug : 'article';
}

export function getLoreDropsArticleSlug(article: HomeEditorialReportContent): string {
  if (article.href.startsWith(LORE_DROPS_PREFIX)) {
    const rawSlug = article.href.slice(LORE_DROPS_PREFIX.length).split(/[?#]/)[0] ?? '';
    try {
      return slugifyLoreDropsArticle(decodeURIComponent(rawSlug));
    } catch {
      return slugifyLoreDropsArticle(rawSlug);
    }
  }
  return slugifyLoreDropsArticle(article.id.length > 0 ? article.id : article.title);
}

export function withLoreDropsArticleSlugs(
  editorial: HomeEditorialContent
): LoreDropsArticle[] {
  return editorial.reports
    .filter((article) => article.visible !== false)
    .map((article) => ({
      ...article,
      href: article.href === '#' || article.href.length === 0
        ? `${LORE_DROPS_PREFIX}${getLoreDropsArticleSlug(article)}`
        : article.href,
      slug: getLoreDropsArticleSlug(article),
    }));
}

export async function getLoreDropsArticles(locale?: LocaleInput): Promise<{
  articles: LoreDropsArticle[];
  editorial: HomeEditorialContent;
}> {
  const content = await getHomeContent(locale);
  return {
    articles: withLoreDropsArticleSlugs(content.editorial),
    editorial: content.editorial,
  };
}

export async function getLoreDropsArticleBySlug(
  slug: string,
  locale?: LocaleInput
): Promise<{ article: LoreDropsArticle | null; editorial: HomeEditorialContent }> {
  const { articles, editorial } = await getLoreDropsArticles(locale);
  const normalizedSlug = slugifyLoreDropsArticle(slug);
  return {
    article: articles.find((article) => article.slug === normalizedSlug) ?? null,
    editorial,
  };
}

export function getLoreDropsArticleParagraphs(article: LoreDropsArticle): string[] {
  const body = article.body.trim().length > 0 ? article.body : article.excerpt;
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}
