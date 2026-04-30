import type { FilemakerJobBoardScrapeOfferResult } from '@/features/filemaker/filemaker-job-board-scrape-contracts';

export type OfferProgressTracker = {
  averageMs: number | null;
  firstAt: number | null;
  lastAt: number | null;
  lastIndex: number;
  total: number;
};

export const createEmptyOfferProgress = (): OfferProgressTracker => ({
  averageMs: null,
  firstAt: null,
  lastAt: null,
  lastIndex: 0,
  total: 0,
});

const EMA_ALPHA = 0.3;

export const advanceOfferProgress = (
  current: OfferProgressTracker,
  index: number,
  total: number,
  eventAtIso: string
): OfferProgressTracker => {
  const parsed = Date.parse(eventAtIso);
  const at = Number.isNaN(parsed) ? Date.now() : parsed;
  if (current.lastAt === null) {
    return { averageMs: null, firstAt: at, lastAt: at, lastIndex: index, total };
  }
  const sampleMs = at - current.lastAt;
  if (sampleMs <= 0) {
    return { ...current, lastAt: at, lastIndex: index, total };
  }
  const averageMs =
    current.averageMs === null
      ? sampleMs
      : current.averageMs * (1 - EMA_ALPHA) + sampleMs * EMA_ALPHA;
  return { averageMs, firstAt: current.firstAt ?? at, lastAt: at, lastIndex: index, total };
};

export const formatEtaMs = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `~${seconds}s`;
  return `~${minutes}m ${seconds}s`;
};

export const computeEtaLabel = (progress: OfferProgressTracker): string | null => {
  if (progress.averageMs === null || progress.total <= progress.lastIndex) return null;
  const remaining = progress.total - progress.lastIndex;
  return formatEtaMs(progress.averageMs * remaining);
};

const HIGH_CONFIDENCE_THRESHOLD = 85;

export type MatchSummaryCounts = {
  highConfidence: number;
  lowConfidence: number;
  unmatched: number;
};

export const computeMatchSummary = (
  offers: readonly FilemakerJobBoardScrapeOfferResult[]
): MatchSummaryCounts => {
  let highConfidence = 0;
  let lowConfidence = 0;
  let unmatched = 0;
  for (const item of offers) {
    if (item.match === null) {
      unmatched += 1;
      continue;
    }
    if (item.match.confidence >= HIGH_CONFIDENCE_THRESHOLD) highConfidence += 1;
    else lowConfidence += 1;
  }
  return { highConfidence, lowConfidence, unmatched };
};

export const formatSecondsAgo = (deltaMs: number): string => {
  const seconds = Math.max(0, Math.floor(deltaMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
};
