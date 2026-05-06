/**
 * Real-time Jobs Hook
 * 
 * React hook for monitoring job status in real-time.
 * Provides:
 * - Real-time job status updates with polling
 * - Automatic job monitoring with configurable intervals
 * - Integration with React Query for caching and state management
 * - Job domain-specific query handling
 * - Background job progress tracking
 */

import { useRealtimeQuery } from '@/shared/hooks/query/useRealtimeQuery';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { getJobStatus } from '../api';

import type { UseQueryResult } from '@tanstack/react-query';

export const jobKeys = QUERY_KEYS.jobs;

// Real-time job monitoring
export function useRealtimeJobs(): UseQueryResult<unknown, Error> {
  return useRealtimeQuery(jobKeys.realtime(), getJobStatus, {
    interval: 5000, // 5 second fallback
    enabled: true,
    domain: 'jobs',
  });
}
