import { AgentRunProvider, AgentRunsPage } from '@/features/ai/agentcreator/public';

export default function AgentRunsRoute(): React.JSX.Element {
  return (
    <AgentRunProvider>
      <AgentRunsPage />
    </AgentRunProvider>
  );
}
