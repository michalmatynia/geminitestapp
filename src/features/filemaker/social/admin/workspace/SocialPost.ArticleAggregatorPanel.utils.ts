import type {
  SocialArticleRecord,
  SocialArticleScrapeRun,
} from '@/shared/contracts/social-article-aggregator';

export const splitLooseUrls = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );

export const uniqueTrimmedValues = (
  values: Array<string | null | undefined>,
  max = 80
): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => value?.trim() ?? '')
        .filter(Boolean)
    )
  ).slice(0, max);

export const uniqueArticleIds = (values: Array<string | null | undefined>): string[] =>
  uniqueTrimmedValues(values, 1000);

export const deriveArticleSourcePresetIds = (
  articles: SocialArticleRecord[],
  explicitPresetIds: string[] = []
): string[] => {
  const articlePresetIds = uniqueTrimmedValues(
    articles.map((article) => article.sourcePresetId)
  );
  return articlePresetIds.length > 0 ? articlePresetIds : uniqueTrimmedValues(explicitPresetIds);
};

export const deriveArticleSourceUrls = (
  articles: SocialArticleRecord[],
  explicitUrls: string[] = []
): string[] => {
  const articleSourceUrls = uniqueTrimmedValues(
    articles.map((article) => article.sourceUrl)
  );
  return articleSourceUrls.length > 0 ? articleSourceUrls : uniqueTrimmedValues(explicitUrls);
};

export const deriveScrapeResultSourceMetadata = ({
  articles,
  fallbackSourcePresetIds = [],
  fallbackSourceUrls = [],
  run,
}: {
  articles: SocialArticleRecord[];
  fallbackSourcePresetIds?: string[];
  fallbackSourceUrls?: string[];
  run: Pick<SocialArticleScrapeRun, 'customUrls' | 'sourcePresetIds'>;
}): { sourcePresetIds: string[]; sourceUrls: string[] } => {
  const sourcePresetFallback =
    articles.length === 0 || run.sourcePresetIds.length > 0
      ? run.sourcePresetIds
      : fallbackSourcePresetIds;
  const sourceUrlFallback =
    articles.length === 0 || run.customUrls.length > 0
      ? run.customUrls
      : fallbackSourceUrls;
  return {
    sourcePresetIds: deriveArticleSourcePresetIds(articles, sourcePresetFallback),
    sourceUrls: deriveArticleSourceUrls(articles, sourceUrlFallback),
  };
};

export const mergeArticleRecordsById = (
  base: SocialArticleRecord[],
  incoming: SocialArticleRecord[]
): SocialArticleRecord[] => {
  const merged = [...base];
  const indexes = new Map(base.map((article, index) => [article.id, index]));
  incoming.forEach((article) => {
    const existingIndex = indexes.get(article.id);
    if (existingIndex === undefined) {
      indexes.set(article.id, merged.length);
      merged.push(article);
      return;
    }
    merged[existingIndex] = article;
  });
  return merged;
};

type BuildRetainedArticleLoadStateInput = {
  append: boolean;
  currentArticles: SocialArticleRecord[];
  currentSelectedArticleIds: string[];
  fallbackSourcePresetIds?: string[];
  incomingArticles: SocialArticleRecord[];
  offset: number;
  total: number;
};

type RetainedArticleLoadState = {
  articles: SocialArticleRecord[];
  selectedArticleIds: string[];
  sourcePresetIds: string[];
  sourceUrls: string[];
  status: string;
};

const buildRetainedArticleStatus = ({
  append,
  loadedCount,
  offset,
  total,
  workingSetCount,
}: {
  append: boolean;
  loadedCount: number;
  offset: number;
  total: number;
  workingSetCount: number;
}): string => {
  if (total === 0) {
    return append
      ? 'No retained articles matched; working set unchanged.'
      : 'No retained articles matched.';
  }
  if (loadedCount === 0) {
    return append
      ? 'No retained articles loaded for this page; working set unchanged.'
      : 'No retained articles loaded for this page.';
  }

  const loadedRangeEnd = Math.min(offset + loadedCount, total);
  const workingSetLabel = `${workingSetCount} article${workingSetCount === 1 ? '' : 's'} in working set.`;
  return `${append ? 'Appended' : 'Loaded'} retained articles ${offset + 1}-${loadedRangeEnd} of ${total}${append ? `; ${workingSetLabel}` : '.'}`;
};

export const buildRetainedArticleLoadState = ({
  append,
  currentArticles,
  currentSelectedArticleIds,
  fallbackSourcePresetIds = [],
  incomingArticles,
  offset,
  total,
}: BuildRetainedArticleLoadStateInput): RetainedArticleLoadState => {
  const incomingArticleIds = incomingArticles.map((article) => article.id);
  const articles = append
    ? mergeArticleRecordsById(currentArticles, incomingArticles)
    : incomingArticles;
  const selectedArticleIds = append
    ? uniqueArticleIds([...currentSelectedArticleIds, ...incomingArticleIds])
    : incomingArticleIds;
  const selectedArticleIdSet = new Set(selectedArticleIds);
  const selectedArticles = articles.filter((article) => selectedArticleIdSet.has(article.id));
  const sourcePresetIds = deriveArticleSourcePresetIds(
    selectedArticles,
    fallbackSourcePresetIds
  );
  const sourceUrls = deriveArticleSourceUrls(selectedArticles);

  return {
    articles,
    selectedArticleIds,
    sourcePresetIds,
    sourceUrls,
    status: buildRetainedArticleStatus({
      append,
      loadedCount: incomingArticles.length,
      offset,
      total,
      workingSetCount: articles.length,
    }),
  };
};
