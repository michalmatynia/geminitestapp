import { describe, expect, it } from 'vitest';

import * as agentTeachingPublic from './public';

describe('agentcreator teaching public barrel', () => {
  it('exposes the teaching pages and provider used by admin routes', () => {
    expect(agentTeachingPublic.AgentTeachingAgentsPage).toBeDefined();
    expect(agentTeachingPublic.AgentTeachingChatPage).toBeDefined();
    expect(agentTeachingPublic.AgentTeachingCollectionsPage).toBeDefined();
    expect(agentTeachingPublic.AgentTeachingCollectionDetailPage).toBeDefined();
    expect(agentTeachingPublic.AgentTeachingProvider).toBeDefined();
  });
});
