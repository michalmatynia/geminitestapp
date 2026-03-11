'use client';

import React from 'react';

import { AgentPersonaSettingsForm } from '@/features/ai/agentcreator/components/AgentPersonaSettingsForm';
import {
  useAgentPersonas,
  useSaveAgentPersonasMutation,
} from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import {
  deletePersonaAvatar,
  deletePersonaAvatarThumbnail,
} from '@/features/ai/agentcreator/utils/avatar-input';
import {
  buildDefaultAgentPersonaMoods,
  buildAgentPersonaSettings,
  collectAgentPersonaAvatarFileIds,
  collectAgentPersonaAvatarThumbnailRefs,
  createAgentPersonaId,
  diffRemovedAgentPersonaAvatarFileIds,
  diffRemovedAgentPersonaAvatarThumbnailRefs,
  normalizeAgentPersonas,
} from '@/features/ai/agentcreator/utils/personas';
import {
  DEFAULT_AGENT_PERSONA_MOOD_ID,
  type AgentPersona,
} from '@/shared/contracts/agents';
import { AdminAgentCreatorBreadcrumbs, ItemLibrary, useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export function AgentPersonasPage(): React.JSX.Element {
  const { toast } = useToast();

  const { data: personas = [], isLoading: loading } = useAgentPersonas();
  const { mutateAsync: savePersonas, isPending: saving } = useSaveAgentPersonasMutation();

  const deleteAvatarFiles = async (fileIds: string[]): Promise<void> => {
    const uniqueFileIds = Array.from(new Set(fileIds.map((fileId) => fileId.trim()).filter(Boolean)));
    if (uniqueFileIds.length === 0) {
      return;
    }

    const results = await Promise.allSettled(uniqueFileIds.map((fileId) => deletePersonaAvatar(fileId)));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logClientError(result.reason, {
          context: {
            source: 'AgentPersonasPage',
            action: 'deleteAvatarFile',
            fileId: uniqueFileIds[index],
          },
        });
      }
    });
  };

  const deleteAvatarThumbnails = async (thumbnailRefs: string[]): Promise<void> => {
    const uniqueRefs = Array.from(
      new Set(thumbnailRefs.map((thumbnailRef) => thumbnailRef.trim()).filter(Boolean))
    );
    if (uniqueRefs.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      uniqueRefs.map((thumbnailRef) => deletePersonaAvatarThumbnail(thumbnailRef))
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logClientError(result.reason, {
          context: {
            source: 'AgentPersonasPage',
            action: 'deleteAvatarThumbnail',
            thumbnailRef: uniqueRefs[index],
          },
        });
      }
    });
  };

  const handleSavePersona = async (draft: Partial<AgentPersona>): Promise<void> => {
    const name = draft.name?.trim();
    if (!name) {
      toast('Persona name is required.', { variant: 'error' });
      throw new Error('Persona name is required.');
    }

    const now = new Date().toISOString();
    const existing = personas.find((p) => p.id === draft.id);
    const nextPersona = normalizeAgentPersonas([
      {
        ...existing,
        ...draft,
        id:
          existing?.id ??
          (typeof draft.id === 'string' && draft.id.trim() ? draft.id.trim() : createAgentPersonaId()),
        name,
        description: draft.description?.trim() || null,
        settings: buildAgentPersonaSettings(draft.settings ?? existing?.settings),
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
      await Promise.all([
        deleteAvatarFiles(diffRemovedAgentPersonaAvatarFileIds(existing, nextPersona)),
        deleteAvatarThumbnails(diffRemovedAgentPersonaAvatarThumbnailRefs(existing, nextPersona)),
      ]);
      toast(existing ? 'Persona updated.' : 'Persona created.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AgentPersonasPage', action: 'savePersona', personaId: draft.id },
      });
      toast(error instanceof Error ? error.message : 'Failed to save personas.', {
        variant: 'error',
      });
      throw (error instanceof Error ? error : new Error('Failed to save personas.'));
    }
  };

  const handleDeletePersona = async (persona: AgentPersona): Promise<void> => {
    const next = personas.filter((p) => p.id !== persona.id);
    try {
      await savePersonas({ personas: next });
      await Promise.all([
        deleteAvatarFiles(collectAgentPersonaAvatarFileIds(persona)),
        deleteAvatarThumbnails(collectAgentPersonaAvatarThumbnailRefs(persona)),
      ]);
      toast('Persona deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'AgentPersonasPage', action: 'deletePersona', personaId: persona.id },
      });
      toast(error instanceof Error ? error.message : 'Failed to delete persona.', {
        variant: 'error',
      });
      throw (error instanceof Error ? error : new Error('Failed to delete persona.'));
    }
  };

  return (
    <ItemLibrary<AgentPersona & { description: string | null }>
      title='Agent Personas'
      description='Manage tutor personas, memory-bank behavior, mood avatars, and AI Brain-backed routing.'
      entityName='Persona'
      items={personas as (AgentPersona & { description: string | null })[]}
      isLoading={loading}
      isSaving={saving}
      onSave={handleSavePersona}
      onDelete={handleDeletePersona}
      backLink={<AdminAgentCreatorBreadcrumbs current='Personas' className='mb-2' />}
      buildDefaultItem={() => ({
        id: createAgentPersonaId(),
        name: '',
        description: '',
        defaultMoodId: DEFAULT_AGENT_PERSONA_MOOD_ID,
        moods: buildDefaultAgentPersonaMoods(),
        settings: buildAgentPersonaSettings(),
      })}
      onEditorClose={({ draft, originalItem, saved }) => {
        if (saved) {
          return;
        }
        return Promise.all([
          deleteAvatarFiles(diffRemovedAgentPersonaAvatarFileIds(draft, originalItem)),
          deleteAvatarThumbnails(diffRemovedAgentPersonaAvatarThumbnailRefs(draft, originalItem)),
        ]).then(() => undefined);
      }}
      renderItemTags={() => ['Routing: AI Brain']}
      renderExtraFields={(item, onChange, { originalItem }) => (
        <AgentPersonaSettingsForm item={item} originalItem={originalItem} onChange={onChange} />
      )}
    />
  );
}
