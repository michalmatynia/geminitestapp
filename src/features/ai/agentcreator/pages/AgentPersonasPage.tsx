'use client';

import Link from 'next/link';

import { AgentPersonaSettingsForm } from '@/features/ai/agentcreator/components/AgentPersonaSettingsForm';
import { useAgentPersonas, useSaveAgentPersonasMutation } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import type { AgentPersona } from '@/features/ai/agentcreator/types';
import { buildAgentPersonaSettings, createAgentPersonaId } from '@/features/ai/agentcreator/utils/personas';
import { ItemLibrary, useToast } from '@/shared/ui';

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
    const existing = personas.find((persona: AgentPersona) => persona.id === draft.id);
    const nextPersona: AgentPersona = {
      id: existing?.id ?? createAgentPersonaId(),
      name,
      description: draft.description?.trim() || null,
      settings: buildAgentPersonaSettings(draft.settings),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const next = existing
      ? personas.map((persona: AgentPersona) =>
        persona.id === existing.id ? nextPersona : persona
      )
      : [...personas, nextPersona];

    try {
      await savePersonas({ personas: next });
      toast(existing ? 'Persona updated.' : 'Persona created.', { variant: 'success' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save personas.';
      toast(errorMessage, { variant: 'error' });
    }
  };

  const handleDeletePersona = async (persona: AgentPersona): Promise<void> => {
    const next = personas.filter((item: AgentPersona) => item.id !== persona.id);
    try {
      await savePersonas({ personas: next });
      toast('Persona deleted.', { variant: 'success' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete persona.';
      toast(errorMessage, { variant: 'error' });
    }
  };

  return (
    <ItemLibrary<AgentPersona>
      title="Agent Personas"
      description="Assign models to each reasoning stage for autonomous agents and AI Paths."
      entityName="Persona"
      items={personas}
      isLoading={loading}
      isSaving={saving}
      onSave={handleSavePersona}
      onDelete={handleDeletePersona}
      backLink={(
        <Link href="/admin/agentcreator" className="text-blue-300 hover:text-blue-200">
          ← Back to agent creator
        </Link>
      )}
      buildDefaultItem={() => ({
        name: '',
        description: '',
        settings: buildAgentPersonaSettings(),
      })}
      renderItemTags={(persona: AgentPersona) => {
        const settings = persona.settings;
        const labels: Array<[string, string | null | undefined]> = [
          ['Executor', settings.executorModel],
          ['Planner', settings.plannerModel],
          ['Self-check', settings.selfCheckModel],
          ['Extraction', settings.extractionValidationModel],
          ['Tool router', settings.toolRouterModel],
          ['Memory val.', settings.memoryValidationModel],
          ['Memory sum.', settings.memorySummarizationModel],
          ['Loop guard', settings.loopGuardModel],
          ['Approval', settings.approvalGateModel],
          ['Selector', settings.selectorInferenceModel],
          ['Normalize', settings.outputNormalizationModel],
        ];

        return labels.map(([label, value]: [string, string | null | undefined]) => `${label}: ${value?.trim() || 'default'}`);
      }}
      renderExtraFields={(draft: Partial<AgentPersona>, onChange: (updates: Partial<AgentPersona>) => void) => (
        <AgentPersonaSettingsForm
          settings={draft.settings || buildAgentPersonaSettings()}
          onChange={(settings: AgentPersona['settings']) => onChange({ settings })}
        />
      )}
    />
  );
}
