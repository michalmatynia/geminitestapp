import { AgentRunsPage, AgentRunProvider } from '@/features/ai/public';

export default function AgentRunsRoute(): React.JSX.Element {
  return (
    <AgentRunProvider>
      <AgentRunsPage />
    </AgentRunProvider>
  );
}
