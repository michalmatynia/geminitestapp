import { AgentRunProvider, AgentRunsPage } from '@/features/ai/agents.public';

export default function AgentRunsRoute(): React.JSX.Element {
  return (
    <AgentRunProvider>
      <AgentRunsPage />
    </AgentRunProvider>
  );
}
