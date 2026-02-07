import { AgentRunsPage, AgentRunProvider } from '@/features/ai/agentcreator';

export default function AgentRunsRoute(): React.JSX.Element {
  return (
    <AgentRunProvider>
      <AgentRunsPage />
    </AgentRunProvider>
  );
}
