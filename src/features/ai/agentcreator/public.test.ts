import { describe, expect, it } from 'vitest';

import * as agentCreatorPublic from './public';

describe('agentcreator public barrel', () => {
  it('exposes the agentcreator pages and runtime hooks used by shared ai imports', () => {
    expect(agentCreatorPublic.AgentRunsPage).toBeDefined();
    expect(agentCreatorPublic.AgentPersonasPage).toBeDefined();
    expect(agentCreatorPublic.AgentPersonaMemoryPage).toBeDefined();
    expect(agentCreatorPublic.AgentRunProvider).toBeDefined();
    expect(agentCreatorPublic.useAgentPersonas).toBeDefined();
  });

  it('keeps the persona helpers available', () => {
    expect(agentCreatorPublic.AgentPersonaMoodAvatar).toBeDefined();
    expect(agentCreatorPublic.resolveAgentPersonaMood).toBeDefined();
  });
});
