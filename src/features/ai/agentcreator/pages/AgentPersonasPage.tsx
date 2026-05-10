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
import { AdminAgentCreatorBreadcrumbs } from '@/shared/ui/admin.public';
import { ItemLibrary } from '@/shared/ui/data-display.public';
import { useToast } from '@/shared/ui/primitives.public';
import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

type SavePersonas = ReturnType<typeof useSaveAgentPersonasMutation>['mutateAsync'];
type Toast = ReturnType<typeof useToast>['toast'];
type LibraryAgentPersona = AgentPersona & { description: string | null };

const collectUniqueNonEmptyStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));

const logRejectedCleanupResults = (
  results: PromiseSettledResult<unknown>[],
  values: string[],
  action: string,
  key: string
): void => {
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logClientError(result.reason, {
        context: {
          source: 'AgentPersonasPage',
          action,
          [key]: values[index],
        },
      });
    }
  });
};

const deleteAvatarFiles = async (fileIds: string[]): Promise<void> => {
  const uniqueFileIds = collectUniqueNonEmptyStrings(fileIds);
  if (uniqueFileIds.length === 0) {
    return;
  }
  const results = await Promise.allSettled(uniqueFileIds.map(deletePersonaAvatar));
  logRejectedCleanupResults(results, uniqueFileIds, 'deleteAvatarFile', 'fileId');
};

const deleteAvatarThumbnails = async (thumbnailRefs: string[]): Promise<void> => {
  const uniqueRefs = collectUniqueNonEmptyStrings(thumbnailRefs);
  if (uniqueRefs.length === 0) {
    return;
  }
  const results = await Promise.allSettled(uniqueRefs.map(deletePersonaAvatarThumbnail));
  logRejectedCleanupResults(results, uniqueRefs, 'deleteAvatarThumbnail', 'thumbnailRef');
};

const readRequiredPersonaName = (draft: Partial<AgentPersona>, toast: Toast): string => {
  const name = draft.name?.trim() ?? '';
  if (name.length === 0) {
    toast('Persona name is required.', { variant: 'error' });
    throw new Error('Persona name is required.');
  }
  return name;
};

const resolvePersonaId = (
  draft: Partial<AgentPersona>,
  existing: AgentPersona | undefined
): string => {
  if (existing !== undefined) {
    return existing.id;
  }
  const draftId = typeof draft.id === 'string' ? draft.id.trim() : '';
  return draftId.length > 0 ? draftId : createAgentPersonaId();
};

const resolveNullableTrimmedString = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSinglePersona = (draft: Partial<AgentPersona>): AgentPersona => {
  const normalized = normalizeAgentPersonas([draft]);
  const persona = normalized[0];
  if (persona === undefined) {
    throw new Error('Failed to normalize persona.');
  }
  return persona;
};

const buildNextPersona = (
  draft: Partial<AgentPersona>,
  existing: AgentPersona | undefined,
  name: string
): AgentPersona => {
  const now = new Date().toISOString();
  return normalizeSinglePersona({
    ...existing,
    ...draft,
    id: resolvePersonaId(draft, existing),
    name,
    description: resolveNullableTrimmedString(draft.description),
    settings: buildAgentPersonaSettings(draft.settings ?? existing?.settings),
    defaultMoodId: DEFAULT_AGENT_PERSONA_MOOD_ID,
    moods: draft.moods ?? existing?.moods ?? buildDefaultAgentPersonaMoods(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
};

const upsertPersona = (
  personas: AgentPersona[],
  existing: AgentPersona | undefined,
  nextPersona: AgentPersona
): AgentPersona[] => {
  if (existing === undefined) {
    return [...personas, nextPersona];
  }
  return personas.map((persona) => (persona.id === existing.id ? nextPersona : persona));
};

const handlePersonaMutationError = ({
  error,
  toast,
  action,
  personaId,
  fallbackMessage,
}: {
  error: unknown;
  toast: Toast;
  action: string;
  personaId: string | undefined;
  fallbackMessage: string;
}): never => {
  logClientCatch(error, {
    source: 'AgentPersonasPage',
    action,
    personaId,
  });
  toast(error instanceof Error ? error.message : fallbackMessage, { variant: 'error' });
  throw error instanceof Error ? error : new Error(fallbackMessage);
};

const savePersonaDraft = async ({
  draft,
  personas,
  savePersonas,
  toast,
}: {
  draft: Partial<AgentPersona>;
  personas: AgentPersona[];
  savePersonas: SavePersonas;
  toast: Toast;
}): Promise<void> => {
  const name = readRequiredPersonaName(draft, toast);
  const existing = personas.find((persona) => persona.id === draft.id);
  const nextPersona = buildNextPersona(draft, existing, name);
  const next = upsertPersona(personas, existing, nextPersona);

  try {
    await savePersonas({ personas: next });
    await Promise.all([
      deleteAvatarFiles(diffRemovedAgentPersonaAvatarFileIds(existing, nextPersona)),
      deleteAvatarThumbnails(diffRemovedAgentPersonaAvatarThumbnailRefs(existing, nextPersona)),
    ]);
    toast(existing === undefined ? 'Persona created.' : 'Persona updated.', { variant: 'success' });
  } catch (error) {
    handlePersonaMutationError({
      error,
      toast,
      action: 'savePersona',
      personaId: draft.id,
      fallbackMessage: 'Failed to save personas.',
    });
  }
};

const deletePersona = async ({
  persona,
  personas,
  savePersonas,
  toast,
}: {
  persona: AgentPersona;
  personas: AgentPersona[];
  savePersonas: SavePersonas;
  toast: Toast;
}): Promise<void> => {
  try {
    await savePersonas({ personas: personas.filter((candidate) => candidate.id !== persona.id) });
    await Promise.all([
      deleteAvatarFiles(collectAgentPersonaAvatarFileIds(persona)),
      deleteAvatarThumbnails(collectAgentPersonaAvatarThumbnailRefs(persona)),
    ]);
    toast('Persona deleted.', { variant: 'success' });
  } catch (error) {
    handlePersonaMutationError({
      error,
      toast,
      action: 'deletePersona',
      personaId: persona.id,
      fallbackMessage: 'Failed to delete persona.',
    });
  }
};

const cleanupUnsavedPersona = async ({
  draft,
  originalItem,
  saved,
}: {
  draft: Partial<AgentPersona>;
  originalItem?: Partial<AgentPersona> | null;
  saved: boolean;
}): Promise<void> | undefined => {
  if (saved) {
    return undefined;
  }
  return Promise.all([
    deleteAvatarFiles(diffRemovedAgentPersonaAvatarFileIds(draft, originalItem)),
    deleteAvatarThumbnails(diffRemovedAgentPersonaAvatarThumbnailRefs(draft, originalItem)),
  ]).then(() => undefined);
};

export function AgentPersonasPage(): React.JSX.Element {
  const { toast } = useToast();
  const { data: personas = [], isLoading: loading } = useAgentPersonas();
  const { mutateAsync: savePersonas, isPending: saving } = useSaveAgentPersonasMutation();
  const libraryItems = personas as LibraryAgentPersona[];

  return (
    <ItemLibrary<LibraryAgentPersona>
      title='Agent Personas'
      description='Manage tutor personas, memory-bank behavior, mood avatars, and AI Brain-backed routing.'
      entityName='Persona'
      items={libraryItems}
      isLoading={loading}
      isSaving={saving}
      onSave={(draft) => savePersonaDraft({ draft, personas, savePersonas, toast })}
      onDelete={(persona) => deletePersona({ persona, personas, savePersonas, toast })}
      backLink={<AdminAgentCreatorBreadcrumbs current='Personas' className='mb-2' />}
      buildDefaultItem={() => ({
        id: createAgentPersonaId(),
        name: '',
        description: '',
        defaultMoodId: DEFAULT_AGENT_PERSONA_MOOD_ID,
        moods: buildDefaultAgentPersonaMoods(),
        settings: buildAgentPersonaSettings(),
      })}
      onEditorClose={cleanupUnsavedPersona}
      renderItemTags={() => ['Routing: AI Brain']}
      renderExtraFields={(item, onChange, { originalItem }) => (
        <AgentPersonaSettingsForm item={item} originalItem={originalItem} onChange={onChange} />
      )}
    />
  );
}
