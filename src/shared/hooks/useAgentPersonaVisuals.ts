/**
 * Agent Persona Visuals Hook
 * 
 * TanStack Query hook for agent persona visual data.
 * Provides:
 * - Agent persona visuals query with caching
 * - Optional persona ID handling
 * - Error recovery with server fallback
 * - Permission-aware error handling (401, 403, 404)
 * - Observability integration for persona queries
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { AgentPersona } from '@/shared/contracts/agents';
import { ApiError, api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

/** Result type for agent persona visuals query */
type AgentPersonaVisualsResult = Pick<UseQueryResult<AgentPersona[], Error>, 'data'>;

/**
 * Checks if error is an optional persona visuals error (permission or not found)
 * @param error - Error to check
 * @returns True if error is a permission or not found error
 */
const isOptionalPersonaVisualsError = (error: unknown): error is ApiError =>
  error instanceof ApiError && [401, 403, 404].includes(error.status);

/**
 * Creates a server fallback result for persona visuals
 * @param normalizedPersonaId - Normalized persona ID or null
 * @returns Fallback result with empty or undefined data
 */
const createServerFallbackResult = (
  normalizedPersonaId: string | null
): AgentPersonaVisualsResult => ({
  data: normalizedPersonaId === null ? [] : undefined,
});

/**
 * Hook for querying agent persona visual data
 * @param personaId - Optional persona ID to query
 * @returns Query result with persona visuals data
 */
export function useAgentPersonaVisuals(
  personaId?: string | null
): AgentPersonaVisualsResult {
  const normalizedPersonaId =
    typeof personaId === 'string' && personaId.trim().length > 0 ? personaId.trim() : null;

  if (typeof window === 'undefined') {
    return createServerFallbackResult(normalizedPersonaId);
  }

  return useQuery<AgentPersona[], Error>({
    queryKey:
      normalizedPersonaId === null
        ? [...QUERY_KEYS.agentPersonas.details(), 'visuals', 'none']
        : [...QUERY_KEYS.agentPersonas.detail(normalizedPersonaId), 'visuals'],
    queryFn: async (): Promise<AgentPersona[]> => {
      if (normalizedPersonaId === null) {
        return [];
      }

      try {
        const persona = await api.get<AgentPersona>(
          `/api/agentcreator/personas/${encodeURIComponent(normalizedPersonaId)}/visuals`,
          { logError: false }
        );
        return [persona];
      } catch (error) {
        // Tutor visuals are optional enrichment on public Kangur surfaces.
        if (isOptionalPersonaVisualsError(error)) {
          return [];
        }
        throw error;
      }
    },
    enabled: normalizedPersonaId !== null,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
