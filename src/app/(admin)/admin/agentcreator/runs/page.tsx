import { AgentRunProvider } from '@/features/ai/agentcreator/context/AgentRunContext';
import AgentRunsPage from '@/features/ai/agentcreator/pages/AgentRunsPage';

export default function AgentRunsRoute(): React.JSX.Element {
  return (
    <AgentRunProvider>
      <AgentRunsPage />
    </AgentRunProvider>
  );
}
