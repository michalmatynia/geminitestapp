'use client';

import React from 'react';

import { AgentPersonaSettingsForm } from '@/features/ai/agentcreator/components/AgentPersonaSettingsForm';
import {
  useAgentPersonas,
  useSaveAgentPersonasMutation,
} from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import {
  buildDefaultAgentPersonaMoods,
  buildAgentPersonaSettings,
  createAgentPersonaId,
  normalizeAgentPersonas,
} from '@/features/ai/agentcreator/utils/personas';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  DEFAULT_AGENT_PERSONA_MOOD_ID,
  type AgentPersona,
} from '@/shared/contracts/agents';
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
    const nextPersona = normalizeAgentPersonas([
      {
        ...existing,
        ...draft,
        id: existing?.id ?? createAgentPersonaId(),
        name,
        description: draft.description?.trim() || null,
        settings: buildAgentPersonaSettings(draft.settings),
        defaultMoodId: DEFAULT_AGENT_PERSONA_MOOD_ID,
        moods: draft.moods ?? existing?.moods ?? buildDefaultAgentPersonaMoods(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      },
    ])[0] as AgentPersona;

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
      description='Manage visible tutor personas, SVG mood avatars, and AI Brain-backed persona routing.'
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
        defaultMoodId: DEFAULT_AGENT_PERSONA_MOOD_ID,
        moods: buildDefaultAgentPersonaMoods(),
        settings: buildAgentPersonaSettings(),
      })}
      renderItemTags={() => ['Routing: AI Brain']}
      renderExtraFields={(item, onChange) => (
        <AgentPersonaSettingsForm item={item} onChange={onChange} />
      )}
    />
  );
}
