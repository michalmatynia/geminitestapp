// Query-related hooks
export { useInfiniteQueryWithPagination, useFlattenedInfiniteData } from './useInfiniteQuery';
export { useQueryPersistence } from './useQueryPersistence';
export { useStreamingQuery, useWebSocketQuery, useSmartPolling } from './useStreamingQueries';
export { useQueryDiagnostics } from './useQueryDiagnostics';
export { useGlobalQueryErrorHandler, useResilientQuery, useCircuitBreakerQuery } from './useQueryErrorHandling';
export { useDependentQueries, useParallelQueries, useConditionalQuery } from './useAdvancedQueries';
export { useSearchQuery, useAutocomplete, usePaginatedSearch, useSearchSuggestions } from './useSearchQueries';
export { useRealtimeQuery } from './useRealtimeQuery';
export { useQueryLifecycle } from './useQueryLifecycle';
export { useQueryMiddleware } from './useQueryMiddleware';
export { useSmartCache } from './useSmartCache';
export { useQueryBatching } from './useQueryBatching';
export { useCacheWarmup } from './useCacheWarmup';
