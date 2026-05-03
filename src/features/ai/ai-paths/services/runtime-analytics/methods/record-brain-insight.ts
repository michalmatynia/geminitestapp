import { type Redis, type ChainableCommander } from 'ioredis';
import { getRedisConnection } from '@/shared/lib/db/redis-client';
import { toTimestampMs, pruneBefore, keyBrain, buildEventMember, keyTotals, randomUUID, ErrorSystem } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { normalizeBrainInsightStatus } from '../service-helpers';

const recordAnalyticsEvent = (
  multi: ChainableCommander,
  type: string,
  timestampMs: number
): void => {
  multi.zadd(keyBrain(type), String(timestampMs), buildEventMember(type, randomUUID(), timestampMs));
  multi.zremrangebyscore(keyBrain(type), 0, pruneBefore(timestampMs));
};

export const recordBrainInsightAnalytics = async (input: {
  type: 'analytics' | 'logs';
  status?: string | null;
  timestamp?: Date | string | number | null;
}): Promise<void> => {
  try {
    const redis = await getRedisConnection();
    if (redis === null) return;
    
    const timestampMs = toTimestampMs(input.timestamp);
    
    const multi = redis.multi();
    recordAnalyticsEvent(multi, input.type, timestampMs);
    recordAnalyticsEvent(multi, 'all', timestampMs);
    
    multi.hincrby(keyTotals(), `brain_${input.type}_reports`, 1);
    multi.hincrby(keyTotals(), 'brain_reports_total', 1);

    const status = normalizeBrainInsightStatus(input.status);
    if (status !== null) {
      recordAnalyticsEvent(multi, `status:${status}`, timestampMs);
      multi.hincrby(keyTotals(), `brain_status_${status}_reports`, 1);
    }
    
    await multi.exec();
  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
  }
};
