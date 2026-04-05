import { describe, expect, it } from 'vitest';

import * as agentCreatorIndex from './index';

describe('agentcreator index barrel', () => {
  it('continues exposing the agentcreator settings, context, and hook surface', () => {
    expect(agentCreatorIndex).toHaveProperty('AgentCreatorSettingsSection');
    expect(agentCreatorIndex).toHaveProperty('AgentPersonaSettingsForm');
    expect(agentCreatorIndex).toHaveProperty('AgentCreatorSettingsProvider');
    expect(agentCreatorIndex).toHaveProperty('AgentRunProvider');
    expect(agentCreatorIndex).toHaveProperty('useAgentCreatorSettings');
    expect(agentCreatorIndex).toHaveProperty('useAgentPersonaMemory');
    expect(agentCreatorIndex).toHaveProperty('useAgentPersonas');
  });

  it('continues exposing agentcreator pages, contracts, and persona helpers', () => {
    expect(agentCreatorIndex).toHaveProperty('AgentRunsPage');
    expect(agentCreatorIndex).toHaveProperty('AgentPersonasPage');
    expect(agentCreatorIndex).toHaveProperty('AgentPersonaMemoryPage');
    expect(agentCreatorIndex).toHaveProperty('agentPersonaSchema');
    expect(agentCreatorIndex).toHaveProperty('DEFAULT_AGENT_SETTINGS');
    expect(agentCreatorIndex).toHaveProperty('createAgentPersonaId');
    expect(agentCreatorIndex).toHaveProperty('resolveAgentPersonaMood');
  });
});
