import type {
  KangurAnalyticsCount,
  KangurAnalyticsSnapshot,
  KangurKnowledgeGraphStatusSnapshot,
  KangurObservabilityAlert,
  KangurObservabilityRange,
  KangurObservabilityStatus,
} from '@/shared/contracts';

export const eventCount = (analytics: KangurAnalyticsSnapshot, name: string): number =>
  analytics.importantEvents.find((entry: KangurAnalyticsCount) => entry.name === name)?.count ?? 0;

export const resolveKnowledgeGraphAlertStatus = (
  knowledgeGraphStatus: KangurKnowledgeGraphStatusSnapshot | undefined
): KangurObservabilityStatus => {
  if (!knowledgeGraphStatus || knowledgeGraphStatus.mode === 'disabled') {
    return 'insufficient_data';
  }

  if (knowledgeGraphStatus.mode === 'error') {
    return 'critical';
  }

  switch (knowledgeGraphStatus.semanticReadiness) {
    case 'vector_ready':
      return 'ok';
    case 'metadata_only':
    case 'vector_index_pending':
      return 'warning';
    case 'embeddings_without_index':
    case 'no_graph':
    case 'no_semantic_text':
      return 'critical';
    default:
      return 'insufficient_data';
  }
};

export const buildKnowledgeGraphAlertSummary = (
  knowledgeGraphStatus: KangurKnowledgeGraphStatusSnapshot | undefined
): string => {
  if (!knowledgeGraphStatus) {
    return 'Live Neo4j knowledge graph status is unavailable for this summary window.';
  }

  if (knowledgeGraphStatus.mode === 'disabled') {
    return knowledgeGraphStatus.message;
  }

  if (knowledgeGraphStatus.mode === 'error') {
    return `Failed to load Neo4j knowledge graph status for ${knowledgeGraphStatus.graphKey}: ${knowledgeGraphStatus.message}`;
  }

  switch (knowledgeGraphStatus.semanticReadiness) {
    case 'vector_ready':
      return `Neo4j graph ${knowledgeGraphStatus.graphKey} is vector-ready with ${knowledgeGraphStatus.liveNodeCount} nodes, ${knowledgeGraphStatus.liveEdgeCount} edges, and an online vector index.`;
    case 'vector_index_pending':
      return `Neo4j graph ${knowledgeGraphStatus.graphKey} has embeddings, but the vector index is ${knowledgeGraphStatus.vectorIndexState ?? 'not online'}, so vector recall is still degraded.`;
    case 'embeddings_without_index':
      return `Neo4j graph ${knowledgeGraphStatus.graphKey} has embeddings on knowledge nodes, but the vector index is missing.`;
    case 'metadata_only':
      return `Neo4j graph ${knowledgeGraphStatus.graphKey} has semantic text but no embeddings yet, so Tutor retrieval is limited to metadata matching.`;
    case 'no_semantic_text':
      return `Neo4j graph ${knowledgeGraphStatus.graphKey} is present, but semantic text has not been populated on Kangur knowledge nodes.`;
    case 'no_graph':
      return `Neo4j graph ${knowledgeGraphStatus.graphKey} is not present in the configured database.`;
    default:
      return 'Live Neo4j knowledge graph status is unavailable for this summary window.';
  }
};

export const rateStatus = (
  value: number | null,
  options: {
    warningThreshold: number;
    criticalThreshold: number;
    minSample?: number;
    sampleSize?: number;
  }
): KangurObservabilityStatus => {
  if (value === null) return 'insufficient_data';
  if ((options.sampleSize ?? 0) < (options.minSample ?? 0)) {
    return 'insufficient_data';
  }
  if (value >= options.criticalThreshold) return 'critical';
  if (value >= options.warningThreshold) return 'warning';
  return 'ok';
};

export const minimumRateStatus = (
  value: number | null,
  options: {
    warningThreshold: number;
    criticalThreshold: number;
    minSample?: number;
    sampleSize?: number;
  }
): KangurObservabilityStatus => {
  if (value === null) return 'insufficient_data';
  if ((options.sampleSize ?? 0) < (options.minSample ?? 0)) {
    return 'insufficient_data';
  }
  if (value <= options.criticalThreshold) return 'critical';
  if (value <= options.warningThreshold) return 'warning';
  return 'ok';
};

export const valueStatus = (
  value: number | null,
  options: {
    warningThreshold: number;
    criticalThreshold: number;
    minSample?: number;
    sampleSize?: number;
  }
): KangurObservabilityStatus => {
  if (value === null) return 'insufficient_data';
  if ((options.sampleSize ?? 0) < (options.minSample ?? 0)) {
    return 'insufficient_data';
  }
  if (value >= options.criticalThreshold) return 'critical';
  if (value >= options.warningThreshold) return 'warning';
  return 'ok';
};

export const countStatus = (
  value: number,
  options: {
    warningThreshold: number;
    criticalThreshold: number;
  }
): Exclude<KangurObservabilityStatus, 'insufficient_data'> => {
  if (value >= options.criticalThreshold) return 'critical';
  if (value >= options.warningThreshold) return 'warning';
  return 'ok';
};

export const scaleCountThreshold = (
  range: KangurObservabilityRange,
  base24hThreshold: number
): number => {
  if (range === '24h') return base24hThreshold;
  if (range === '7d') return base24hThreshold * 7;
  return base24hThreshold * 30;
};

export const buildKangurObservabilitySectionHref = (
  range: KangurObservabilityRange,
  sectionId: string
): string => {
  const params = new URLSearchParams({ range });
  return `/admin/kangur/observability?${params.toString()}#${sectionId}`;
};

export const resolveOverallStatus = (
  alerts: KangurObservabilityAlert[],
  errors: Record<string, string>
): Exclude<KangurObservabilityStatus, 'insufficient_data'> => {
  if (alerts.some((alert: KangurObservabilityAlert) => alert.status === 'critical')) {
    return 'critical';
  }
  if (
    alerts.some((alert: KangurObservabilityAlert) => alert.status === 'warning') ||
    Object.keys(errors).length > 0
  ) {
    return 'warning';
  }
  return 'ok';
};
