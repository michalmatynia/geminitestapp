'use client';

import React from 'react';

import { AgentPersonaSettingsForm } from '@/features/ai/agentcreator/components/AgentPersonaSettingsForm';
import {
  useAgentPersonas,
  useSaveAgentPersonasMutation,
} from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import {
  buildAgentPersonaSettings,
  createAgentPersonaId,
} from '@/features/ai/agentcreator/utils/personas';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { AgentPersonaDto as AgentPersona } from '@/shared/contracts/agents';
import { ItemLibrary, useToast, Button } from '@/shared/ui';

export function AgentPersonasPage(): React.JSX.Element {
  const { toast } = useToast();

  const { data: personas = [], isLoading: loading } = useAgentPersonas();
  const { mutateAsync: savePersonas, isPending: saving } = useSaveAgentPersonasMutation();

  const handleSavePersona = async (draft: Partial<AgentPersona>): Promise<void> => {
    const name = draft.name?.trim();
    if (!name) {
      toast('Persona name is required.', { variant: 'error' });
      return;
    }

    const now = new Date().toISOString();
    const existing = personas.find((p) => p.id === draft.id);
    const nextPersona: AgentPersona = {
      id: existing?.id ?? createAgentPersonaId(),
      name,
      description: draft.description?.trim() || undefined,
      settings: buildAgentPersonaSettings(draft.settings),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const next = existing
      ? personas.map((p) => (p.id === existing.id ? nextPersona : p))
      : [...personas, nextPersona];

    try {
      await savePersonas({ personas: next });
      toast(existing ? 'Persona updated.' : 'Persona created.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AgentPersonasPage', action: 'savePersona', personaId: draft.id },
      });
      toast(error instanceof Error ? error.message : 'Failed to save personas.', {
        variant: 'error',
      });
    }
  };

  const handleDeletePersona = async (persona: AgentPersona): Promise<void> => {
    const next = personas.filter((p) => p.id !== persona.id);
    try {
      await savePersonas({ personas: next });
      toast('Persona deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AgentPersonasPage', action: 'deletePersona', personaId: persona.id },
      });
      toast(error instanceof Error ? error.message : 'Failed to delete persona.', {
        variant: 'error',
      });
    }
  };

  return (
    <ItemLibrary<AgentPersona & { description: string | null }>
      title='Agent Personas'
      description='Assign models to each reasoning stage for autonomous agents and AI Paths.'
      entityName='Persona'
      items={personas as (AgentPersona & { description: string | null })[]}
      isLoading={loading}
      isSaving={saving}
      onSave={handleSavePersona}
      onDelete={handleDeletePersona}
      headerActions={
        <Button
          variant='outline'
          size='sm'
          onClick={() => window.location.assign('/admin/agentcreator')}
        >
          ← Back to agent creator
        </Button>
      }
      buildDefaultItem={() => ({
        name: '',
        description: '',
        settings: buildAgentPersonaSettings(),
      })}
      renderItemTags={() => ['Routing: AI Brain']}
      renderExtraFields={() => (
        <AgentPersonaSettingsForm />
      )}
    />
  );
}
