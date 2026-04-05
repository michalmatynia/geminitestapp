import { readFile } from 'fs/promises';
import path from 'path';
import { getLatestKangurAiTutorNativeGuideUpdateAt } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { getLatestKangurPageContentUpdateAt } from '@/features/kangur/server/page-content-repository';
import type { KangurKnowledgeGraphStatusSnapshot } from '@/shared/contracts/kangur-observability';
import type { KangurPerformanceBaseline } from '@/shared/contracts/kangur-observability';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { KangurKnowledgeGraphFreshnessSnapshot, KangurKnowledgeGraphFreshnessSource } from './summary.contracts';

export const toIso = (value: Date | string | undefined | null): string => {
  if (!value) {
    return new Date(0).toISOString();
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date(0).toISOString();
  }
  return date.toISOString();
};

export const toValidDate = (value: Date | string | undefined | null): Date | null => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export const toLatestDate = (values: Array<Date | null>): Date | null =>
  values.reduce<Date | null>((latest, value) => {
    if (!value) {
      return latest;
    }
    if (!latest) {
      return value;
    }
    return value.getTime() > latest.getTime() ? value : latest;
  }, null);

export const formatFreshnessLag = (lagMs: number): string => {
  const hours = lagMs / (60 * 60 * 1000);
  if (hours >= 48) {
    return `${Math.round(hours / 24)} days`;
  }
  if (hours >= 1) {
    return `${Math.round(hours)} hours`;
  }
  const minutes = Math.max(1, Math.round(lagMs / (60 * 1000)));
  return `${minutes} minutes`;
};

export const describeFreshnessSources = (sources: KangurKnowledgeGraphFreshnessSource[]): string => {
  if (sources.length === 0) {
    return 'Canonical Tutor content';
  }
  if (sources.length === 1) {
    return sources[0] === 'page_content' ? 'Page content' : 'Native guides';
  }
  return 'Page content and native guides';
};

export const describeFreshnessVerb = (sources: KangurKnowledgeGraphFreshnessSource[]): string =>
  sources.length === 1 && sources[0] === 'page_content' ? 'was' : 'were';

export const loadKangurPerformanceBaseline = async (): Promise<KangurPerformanceBaseline | null> => {
  try {
    const filepath = path.join(process.cwd(), 'docs', 'metrics', 'kangur-performance-latest.json');
    const raw = await readFile(filepath, 'utf8');
    const parsed = JSON.parse(raw) as {
      generatedAt?: string;
      unit?: { status?: string; durationMs?: number };
      e2e?: { status?: string; durationMs?: number };
      summary?: { infraFailures?: number; failedRuns?: number };
      bundleRisk?: { totalBytes?: number; totalLines?: number };
    };
    const unitDurationMs = parsed.unit?.durationMs;
    const e2eDurationMs = parsed.e2e?.durationMs;
    return {
      generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : null,
      unitStatus: typeof parsed.unit?.status === 'string' ? parsed.unit.status : null,
      unitDurationMs:
        typeof unitDurationMs === 'number' && Number.isFinite(unitDurationMs)
          ? unitDurationMs
          : null,
      e2eStatus: typeof parsed.e2e?.status === 'string' ? parsed.e2e.status : null,
      e2eDurationMs:
        typeof e2eDurationMs === 'number' && Number.isFinite(e2eDurationMs)
          ? e2eDurationMs
          : null,
      infraFailures: Number.isFinite(parsed.summary?.infraFailures)
        ? parsed.summary?.infraFailures ?? null
        : null,
      failedRuns: Number.isFinite(parsed.summary?.failedRuns)
        ? parsed.summary?.failedRuns ?? null
        : null,
      bundleRiskTotalBytes: Number.isFinite(parsed.bundleRisk?.totalBytes)
        ? parsed.bundleRisk?.totalBytes ?? null
        : null,
      bundleRiskTotalLines: Number.isFinite(parsed.bundleRisk?.totalLines)
        ? parsed.bundleRisk?.totalLines ?? null
        : null,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const loadKangurKnowledgeGraphFreshness = async (
  knowledgeGraphStatus: KangurKnowledgeGraphStatusSnapshot
): Promise<KangurKnowledgeGraphFreshnessSnapshot> => {
  const graphSyncedAt =
    knowledgeGraphStatus.mode === 'status' ? toValidDate(knowledgeGraphStatus.syncedAt) : null;

  if (!graphSyncedAt) {
    return {
      latestCanonicalUpdateAt: null,
      latestPageContentUpdateAt: null,
      latestNativeGuideUpdateAt: null,
      graphSyncedAt: null,
      lagMs: null,
      staleSources: [],
    };
  }

  const [latestPageContentUpdateAt, latestNativeGuideUpdateAt] = await Promise.all([
    getLatestKangurPageContentUpdateAt(),
    getLatestKangurAiTutorNativeGuideUpdateAt(),
  ]);
  const latestCanonicalUpdateAt = toLatestDate([
    latestPageContentUpdateAt,
    latestNativeGuideUpdateAt,
  ]);
  const staleSources: KangurKnowledgeGraphFreshnessSource[] = [];

  if (
    latestPageContentUpdateAt &&
    latestPageContentUpdateAt.getTime() > graphSyncedAt.getTime()
  ) {
    staleSources.push('page_content');
  }
  if (
    latestNativeGuideUpdateAt &&
    latestNativeGuideUpdateAt.getTime() > graphSyncedAt.getTime()
  ) {
    staleSources.push('native_guides');
  }

  return {
    latestCanonicalUpdateAt,
    latestPageContentUpdateAt,
    latestNativeGuideUpdateAt,
    graphSyncedAt,
    lagMs:
      latestCanonicalUpdateAt && latestCanonicalUpdateAt.getTime() > graphSyncedAt.getTime()
        ? latestCanonicalUpdateAt.getTime() - graphSyncedAt.getTime()
        : null,
    staleSources,
  };
};
