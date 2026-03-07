'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit } from 'lucide-react';

import { useAgentPersonas } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import { getTeachingAgents } from '@/features/ai/agentcreator/teaching/api';
import {
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  type KangurAiTutorLearnerSettings,
} from '@/features/kangur/settings-ai-tutor';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurSelectField,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import { invalidateAllSettings } from '@/shared/lib/query-invalidation';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { serializeSetting } from '@/shared/utils/settings-json';

function AiTutorConfigPanel(): React.JSX.Element {
  const { activeLearner, canAccessDashboard } = useKangurParentDashboardRuntime();
  const settingsStore = useSettingsStore();
  const queryClient = useQueryClient();

  const rawSettings = settingsStore.get(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStoreMap = useMemo(
    () => parseKangurAiTutorSettings(rawSettings),
    [rawSettings]
  );
  const currentSettings = useMemo(
    () =>
      activeLearner ? getKangurAiTutorSettingsForLearner(settingsStoreMap, activeLearner.id) : null,
    [settingsStoreMap, activeLearner]
  );

  const [enabled, setEnabled] = useState(currentSettings?.enabled ?? false);
  const [teachingAgentId, setTeachingAgentId] = useState<string>(
    currentSettings?.teachingAgentId ?? ''
  );
  const [agentPersonaId, setAgentPersonaId] = useState<string>(
    currentSettings?.agentPersonaId ?? ''
  );
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string>(
    currentSettings?.playwrightPersonaId ?? ''
  );

  useEffect(() => {
    setEnabled(currentSettings?.enabled ?? false);
    setTeachingAgentId(currentSettings?.teachingAgentId ?? '');
    setAgentPersonaId(currentSettings?.agentPersonaId ?? '');
    setPlaywrightPersonaId(currentSettings?.playwrightPersonaId ?? '');
  }, [activeLearner?.id, currentSettings]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: agentPersonas = [] } = useAgentPersonas();
  const { data: playwrightPersonas = [] } = usePlaywrightPersonas();
  const { data: teachingAgents = [] } = useQuery({
    queryKey: ['agentcreator', 'teaching', 'agents'],
    queryFn: getTeachingAgents,
    staleTime: 120_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const handleSave = useCallback(async (): Promise<void> => {
    if (!activeLearner || !canAccessDashboard) return;

    setIsSaving(true);
    setFeedback(null);

    const next: KangurAiTutorLearnerSettings = {
      enabled,
      teachingAgentId: teachingAgentId || null,
      agentPersonaId: agentPersonaId || null,
      playwrightPersonaId: playwrightPersonaId || null,
    };

    const nextStore = {
      ...settingsStoreMap,
      [activeLearner.id]: next,
    };

    try {
      await api.post('/api/settings', {
        key: KANGUR_AI_TUTOR_SETTINGS_KEY,
        value: serializeSetting(nextStore),
      });
      invalidateSettingsCache();
      await invalidateAllSettings(queryClient);
      setFeedback('Ustawienia AI Tutora zapisane.');
    } catch {
      setFeedback('Nie udało się zapisać ustawień.');
    } finally {
      setIsSaving(false);
    }
  }, [
    activeLearner,
    canAccessDashboard,
    enabled,
    teachingAgentId,
    agentPersonaId,
    playwrightPersonaId,
    settingsStoreMap,
    queryClient,
  ]);

  if (!activeLearner) {
    return (
      <KangurGlassPanel padding='lg' surface='solid' variant='soft' className='w-full text-center'>
        <p className='text-sm text-slate-500'>Wybierz ucznia, aby skonfigurować AI Tutora.</p>
      </KangurGlassPanel>
    );
  }

  return (
    <KangurSurfacePanel
      accent='indigo'
      padding='lg'
      className='w-full flex flex-col gap-5'
    >
      <div className='flex items-center gap-3'>
        <BrainCircuit className='h-5 w-5 text-indigo-500' />
        <div>
          <div className='text-sm font-bold text-slate-800'>AI Tutor dla {activeLearner.displayName}</div>
          <div className='text-xs text-slate-500'>
            Pomocnik AI pojawi się jako ikona podczas lekcji i testów
          </div>
        </div>
      </div>

      {/* Enable toggle */}
      <label className='flex items-center gap-3 cursor-pointer select-none'>
        <div className='relative'>
          <input
            type='checkbox'
            className='sr-only'
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <div
            className={`w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
          />
          <div
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </div>
        <span className='text-sm font-medium text-slate-700'>
          {enabled ? 'AI Tutor włączony' : 'AI Tutor wyłączony'}
        </span>
      </label>

      {/* Teaching agent */}
      <div className='flex flex-col gap-1'>
        <label className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>
          Agent nauczający (z bazą wiedzy)
        </label>
        <KangurSelectField
          value={teachingAgentId}
          onChange={(e) => setTeachingAgentId(e.target.value)}
          accent='indigo'
          size='md'
          disabled={!enabled}
        >
          <option value=''>— Bez agenta (tylko Brain) —</option>
          {teachingAgents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </KangurSelectField>
      </div>

      {/* Agent persona */}
      <div className='flex flex-col gap-1'>
        <label className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>
          Persona (charakter tutora)
        </label>
        <KangurSelectField
          value={agentPersonaId}
          onChange={(e) => setAgentPersonaId(e.target.value)}
          accent='indigo'
          size='md'
          disabled={!enabled}
        >
          <option value=''>— Domyślna persona —</option>
          {agentPersonas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name}{persona.role ? ` · ${persona.role}` : ''}
            </option>
          ))}
        </KangurSelectField>
      </div>

      {/* Playwright persona */}
      <div className='flex flex-col gap-1'>
        <label className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>
          Persona Playwright (ustawienia urządzenia)
        </label>
        <KangurSelectField
          value={playwrightPersonaId}
          onChange={(e) => setPlaywrightPersonaId(e.target.value)}
          accent='indigo'
          size='md'
          disabled={!enabled}
        >
          <option value=''>— Brak —</option>
          {playwrightPersonas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name}
              {persona.settings.emulateDevice && persona.settings.deviceName
                ? ` (${persona.settings.deviceName})`
                : ''}
            </option>
          ))}
        </KangurSelectField>
      </div>

      {/* Save */}
      <KangurButton
        type='button'
        variant='primary'
        size='sm'
        onClick={() => void handleSave()}
        disabled={isSaving}
        fullWidth
      >
        {isSaving ? 'Zapisywanie…' : 'Zapisz ustawienia AI Tutora'}
      </KangurButton>

      {feedback && (
        <p className='text-xs text-center text-slate-600'>{feedback}</p>
      )}
    </KangurSurfacePanel>
  );
}

export function KangurParentDashboardAiTutorWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeTab, canAccessDashboard } = useKangurParentDashboardRuntime();

  if (!canAccessDashboard) return null;
  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'ai-tutor')) return null;

  return <AiTutorConfigPanel />;
}
