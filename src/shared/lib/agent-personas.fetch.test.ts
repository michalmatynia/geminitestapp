import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchSettingValueMock } = vi.hoisted(() => ({
  fetchSettingValueMock: vi.fn(),
}));

vi.mock('@/shared/api/settings-client', () => ({
  fetchSettingValue: fetchSettingValueMock,
}));

import { fetchAgentPersonas } from './agent-personas';

describe('fetchAgentPersonas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads agent personas from the dedicated agent_personas setting key', async () => {
    fetchSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'persona-1',
          name: 'Persona One',
          settings: {
            memory: {
              enabled: false,
            },
          },
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>',
            },
          ],
        },
      ])
    );

    const personas = await fetchAgentPersonas();

    expect(fetchSettingValueMock).toHaveBeenCalledWith({
      key: 'agent_personas',
      scope: 'heavy',
      bypassCache: true,
    });
    expect(personas).toEqual([
      expect.objectContaining({
        id: 'persona-1',
        name: 'Persona One',
        settings: {
          memory: {
            enabled: false,
            includeChatHistory: true,
            useMoodSignals: true,
            defaultSearchLimit: 20,
          },
        },
      }),
    ]);
  });
});
