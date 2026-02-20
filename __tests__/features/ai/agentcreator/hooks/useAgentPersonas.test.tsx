import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_PERSONA_SETTINGS_KEY, DEFAULT_AGENT_PERSONA_SETTINGS } from '@/features/ai/agentcreator/constants/personas';
import { useAgentPersonas, useSaveAgentPersonasMutation } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import type { AgentPersona } from '@/shared/contracts/agents';
import { fetchAgentPersonas } from '@/features/ai/agentcreator/utils/personas';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

vi.mock('@/features/ai/agentcreator/utils/personas', () => ({
  fetchAgentPersonas: vi.fn(),
}));

vi.mock('@/shared/api/settings-client', () => ({
  invalidateSettingsCache: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: vi.fn(),
  },
}));

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createPersonasFixture = (): AgentPersona[] => [
  {
    id: 'persona-1',
    name: 'Assistant',
    description: 'Helper persona',
    settings: { ...DEFAULT_AGENT_PERSONA_SETTINGS },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('useAgentPersonas hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('loads personas via query hook', async () => {
    const personas = createPersonasFixture();
    vi.mocked(fetchAgentPersonas).mockResolvedValue(personas);

    const { result } = renderHook(() => useAgentPersonas(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetchAgentPersonas).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(personas);
  });

  it('saves personas and invalidates persona list query', async () => {
    const personas = createPersonasFixture();
    vi.mocked(api.post).mockResolvedValue({ ok: true } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveAgentPersonasMutation(), { wrapper });

    await result.current.mutateAsync({ personas });

    expect(api.post).toHaveBeenCalledWith('/api/settings', {
      key: AGENT_PERSONA_SETTINGS_KEY,
      value: JSON.stringify(personas),
    });
    expect(invalidateSettingsCache).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.agentPersonas.lists(),
    }));
  });
});
