import 'server-only';

 
 
 
 
 
 

import { getBrainAssignmentForCapability } from '@/shared/lib/ai-brain/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getRedisConnection } from '@/shared/lib/queue';
import { RUNTIME_ANALYTICS_CAPABILITY_CACHE_TTL_MS } from './config';

export type RuntimeAnalyticsAvailability = {
  enabled: boolean;
  storage: 'redis' | 'disabled';
};

let runtimeAnalyticsCapabilityCache: { enabled: boolean; expiresAt: number } | null = null;

export const resolveRuntimeAnalyticsCapabilityEnabled = async (): Promise<boolean> => {
  const now = Date.now();
  if (runtimeAnalyticsCapabilityCache && runtimeAnalyticsCapabilityCache.expiresAt > now) {
    return runtimeAnalyticsCapabilityCache.enabled;
  }
  try {
    const [runtimeAnalyticsAssignment, aiPathsAssignment] = await Promise.all([
      getBrainAssignmentForCapability('insights.runtime_analytics'),
      getBrainAssignmentForCapability('ai_paths.model'),
    ]);
    const enabled = runtimeAnalyticsAssignment.enabled && aiPathsAssignment.enabled;
    runtimeAnalyticsCapabilityCache = {
      enabled,
      expiresAt: now + RUNTIME_ANALYTICS_CAPABILITY_CACHE_TTL_MS,
    };
    return enabled;
  } catch (error) {
    void ErrorSystem.logWarning('Failed to resolve Brain runtime analytics capability gate.', {
      service: 'ai-paths-analytics',
      error,
    });
    runtimeAnalyticsCapabilityCache = {
      enabled: false,
      expiresAt: now + Math.min(1_000, RUNTIME_ANALYTICS_CAPABILITY_CACHE_TTL_MS),
    };
    return false;
  }
};

export const getRuntimeAnalyticsAvailability = async (): Promise<RuntimeAnalyticsAvailability> => {
  const capabilityEnabled = await resolveRuntimeAnalyticsCapabilityEnabled();
  if (!capabilityEnabled) {
    return {
      enabled: false,
      storage: 'disabled',
    };
  }

  const redis = getRedisConnection();
  if (!redis) {
    return {
      enabled: false,
      storage: 'disabled',
    };
  }

  return {
    enabled: true,
    storage: 'redis',
  };
};
