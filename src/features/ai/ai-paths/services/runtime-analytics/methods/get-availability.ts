import { getRuntimeAnalyticsAvailabilityShared } from '@/features/ai/ai-paths/server';

export const getRuntimeAnalyticsAvailability = getRuntimeAnalyticsAvailabilityShared as () => Promise<{ status: string }>;
