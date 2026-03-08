import { AgentPersonaMemoryPage } from '@/features/ai/agentcreator/pages/AgentPersonaMemoryPage';

export default async function AgentCreatorPersonaMemoryRoute({
  params,
}: {
  params: Promise<{ personaId: string }>;
}): Promise<React.JSX.Element> {
  const { personaId } = await params;
  return <AgentPersonaMemoryPage personaId={personaId} />;
}
