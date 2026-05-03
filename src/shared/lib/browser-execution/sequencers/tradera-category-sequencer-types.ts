export type TraderaCategorySequencerResult = {
  categories: Array<{ id: string; name: string; parentId: string }>;
  categorySource: string;
  scrapedFrom: string;
  diagnostics: Record<string, unknown> | null;
  crawlStats: Record<string, unknown> | null;
};
