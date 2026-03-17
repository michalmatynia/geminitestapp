import type {
  KangurAnalyticsEventType,
} from '@/shared/contracts';

export type AnalyticsEventMongoDoc = {
  _id?: { toString(): string } | string;
  ts?: Date | string;
  type?: KangurAnalyticsEventType;
  name?: string | null;
  path?: string;
  visitorId?: string;
  sessionId?: string;
  meta?: Record<string, unknown> | null;
};

export type KangurKnowledgeGraphFreshnessSource = 'page_content' | 'native_guides';

export type KangurKnowledgeGraphFreshnessSnapshot = {
  latestCanonicalUpdateAt: Date | null;
  latestPageContentUpdateAt: Date | null;
  latestNativeGuideUpdateAt: Date | null;
  graphSyncedAt: Date | null;
  lagMs: number | null;
  staleSources: KangurKnowledgeGraphFreshnessSource[];
};

export type DuelLobbyMetricKey =
  | 'viewed'
  | 'refreshClicked'
  | 'filterChanged'
  | 'sortChanged'
  | 'joinClicked'
  | 'createClicked'
  | 'loginClicked';

export type LobbyMetricRecord = Record<DuelLobbyMetricKey, number>;

export type SystemLogLatencyMongoDoc = {
  source?: string | null;
  context?: Record<string, unknown> | null;
  createdAt?: Date;
};
