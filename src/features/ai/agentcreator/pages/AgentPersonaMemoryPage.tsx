'use client';

import type React from 'react';

import type { PersonaMemoryRecord } from '@/shared/contracts/persona-memory';
import { AdminAgentCreatorPageLayout } from '@/shared/ui/admin.public';
import { Button } from '@/shared/ui/primitives.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';

import { AgentPersonaMemoryFilters } from './agent-persona-memory/AgentPersonaMemoryFilters';
import { AgentPersonaMemoryRowDetails } from './agent-persona-memory/AgentPersonaMemoryRowDetails';
import { AgentPersonaMemorySummaryCards } from './agent-persona-memory/AgentPersonaMemorySummaryCards';
import { useAgentPersonaMemoryColumns } from './agent-persona-memory/agent-persona-memory-columns';
import { useAgentPersonaMemoryPageModel } from './agent-persona-memory/use-agent-persona-memory-page-model';

type AgentPersonaMemoryPageProps = {
  personaId: string;
};

export function AgentPersonaMemoryPage({ personaId }: AgentPersonaMemoryPageProps): React.JSX.Element {
  const model = useAgentPersonaMemoryPageModel(personaId);
  const columns = useAgentPersonaMemoryColumns(model.expanded, model.toggleExpanded);
  const title =
    model.persona !== null ? `${model.persona.name} Memory Bank` : 'Persona Memory Bank';

  return (
    <AdminAgentCreatorPageLayout
      title={title}
      current='Memory'
      parent={{ label: 'Personas', href: '/admin/agentcreator/personas' }}
      description='Search durable persona memories and the chat history stored in the same bank.'
      headerActions={
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            model.refetchMemory().catch(() => undefined);
          }}
          loading={model.memoryQuery.isFetching}
        >
          Refresh
        </Button>
      }
    >
      <AgentPersonaMemorySummaryCards summary={model.summary} />
      <StandardDataTablePanel
        variant='flat'
        alerts={
          model.memoryQuery.error !== null ? (
            <p className='text-sm text-rose-400'>
              {model.memoryQuery.error instanceof Error
                ? model.memoryQuery.error.message
                : String(model.memoryQuery.error)}
            </p>
          ) : null
        }
        filters={<AgentPersonaMemoryFilters filters={model.filters} />}
        columns={columns}
        data={model.items}
        isLoading={model.memoryQuery.isLoading}
        renderRowDetails={({ row }: { row: { original: PersonaMemoryRecord } }) => (
          <AgentPersonaMemoryRowDetails row={row} />
        )}
        expanded={model.expanded}
      />
    </AdminAgentCreatorPageLayout>
  );
}
