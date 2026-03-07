'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit } from 'lucide-react';

import { useAgentPersonas } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import { getTeachingAgents } from '@/features/ai/agentcreator/teaching/api';
import {
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  type KangurAiTutorTestAccessMode,
  type KangurAiTutorLearnerSettings,
} from '@/features/kangur/settings-ai-tutor';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import type { KangurAiTutorUsageResponse } from '@/shared/contracts/kangur-ai-tutor';
import {
  KangurButton,
  KangurGlassPanel,
  KangurSelectField,
  KangurSurfacePanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import { agentTeachingKeys, kangurKeys } from '@/shared/lib/query-key-exports';
import { invalidateAllSettings } from '@/shared/lib/query-invalidation';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { serializeSetting } from '@/shared/utils/settings-json';

function TutorToggleField({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): React.JSX.Element {
  const controlId = useId();

  return (
    <label
      htmlFor={controlId}
      aria-label={label}
      className={`flex items-start gap-3 rounded-2xl border px-3 py-3 transition-colors ${
        disabled ? 'cursor-not-allowed border-slate-100 bg-slate-50/60 opacity-70' : 'cursor-pointer border-slate-200 bg-white/70'
      }`}
    >
      <div className='relative mt-0.5'>
        <input
          id={controlId}
          type='checkbox'
          className='sr-only'
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <div
          className={`h-5 w-10 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-300'}`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      <div className='min-w-0'>
        <div className='text-sm font-medium text-slate-700'>{label}</div>
        <div className='mt-1 text-xs leading-relaxed text-slate-500'>{description}</div>
      </div>
    </label>
  );
}

function AiTutorConfigPanel(): React.JSX.Element {
  const { activeLearner, canAccessDashboard } = useKangurParentDashboardRuntime();
  const settingsStore = useSettingsStore();
  const queryClient = useQueryClient();
  const activeLearnerId = activeLearner?.id ?? null;

  const rawSettings = settingsStore.get(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStoreMap = useMemo(
    () => parseKangurAiTutorSettings(rawSettings),
    [rawSettings]
  );
  const currentSettings = useMemo(
    () =>
      activeLearnerId ? getKangurAiTutorSettingsForLearner(settingsStoreMap, activeLearnerId) : null,
    [settingsStoreMap, activeLearnerId]
  );
  const shouldLoadUsage = canAccessDashboard && Boolean(activeLearnerId) && currentSettings?.enabled;

  const [enabled, setEnabled] = useState(currentSettings?.enabled ?? false);
  const [teachingAgentId, setTeachingAgentId] = useState<string>(
    currentSettings?.teachingAgentId ?? ''
  );
  const [agentPersonaId, setAgentPersonaId] = useState<string>(
    currentSettings?.agentPersonaId ?? ''
  );
  const [motionPresetId, setMotionPresetId] = useState<string>(
    currentSettings?.motionPresetId ?? ''
  );
  const [allowLessons, setAllowLessons] = useState(currentSettings?.allowLessons ?? true);
  const [testAccessMode, setTestAccessMode] = useState<KangurAiTutorTestAccessMode>(
    currentSettings?.testAccessMode ?? 'guided'
  );
  const [showSources, setShowSources] = useState(currentSettings?.showSources ?? true);
  const [allowSelectedTextSupport, setAllowSelectedTextSupport] = useState(
    currentSettings?.allowSelectedTextSupport ?? true
  );
  const [dailyMessageLimitInput, setDailyMessageLimitInput] = useState(
    currentSettings?.dailyMessageLimit ? String(currentSettings.dailyMessageLimit) : ''
  );

  useEffect(() => {
    setEnabled(currentSettings?.enabled ?? false);
    setTeachingAgentId(currentSettings?.teachingAgentId ?? '');
    setAgentPersonaId(currentSettings?.agentPersonaId ?? '');
    setMotionPresetId(currentSettings?.motionPresetId ?? '');
    setAllowLessons(currentSettings?.allowLessons ?? true);
    setTestAccessMode(currentSettings?.testAccessMode ?? 'guided');
    setShowSources(currentSettings?.showSources ?? true);
    setAllowSelectedTextSupport(currentSettings?.allowSelectedTextSupport ?? true);
    setDailyMessageLimitInput(
      currentSettings?.dailyMessageLimit ? String(currentSettings.dailyMessageLimit) : ''
    );
  }, [activeLearner?.id, currentSettings]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const teachingAgentFieldId = useId();
  const agentPersonaFieldId = useId();
  const motionPresetFieldId = useId();
  const testAccessModeFieldId = useId();
  const dailyMessageLimitFieldId = useId();

  const { data: agentPersonas = [] } = useAgentPersonas();
  const { data: playwrightPersonas = [] } = usePlaywrightPersonas();
  const { data: teachingAgents = [] } = useQuery({
    queryKey: agentTeachingKeys.agents(),
    queryFn: getTeachingAgents,
    staleTime: 120_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const {
    data: tutorUsageResponse,
    isLoading: isUsageLoading,
    isError: hasUsageError,
  } = useQuery({
    queryKey: kangurKeys.aiTutor.usage(activeLearnerId),
    queryFn: async () => {
      if (!activeLearnerId) {
        throw new Error('Missing active learner.');
      }

      return api.get<KangurAiTutorUsageResponse>('/api/kangur/ai-tutor/usage', {
        headers: {
          'x-kangur-learner-id': activeLearnerId,
        },
      });
    },
    enabled: shouldLoadUsage,
    staleTime: 10_000,
    refetchInterval: shouldLoadUsage ? 30_000 : false,
    refetchOnWindowFocus: true,
  });
  const usageSummary = tutorUsageResponse?.usage ?? null;

  const handleSave = useCallback(async (): Promise<void> => {
    if (!activeLearner || !canAccessDashboard) return;

    setIsSaving(true);
    setFeedback(null);

    const parsedDailyMessageLimit = Number.parseInt(dailyMessageLimitInput, 10);
    const next: KangurAiTutorLearnerSettings = {
      enabled,
      teachingAgentId: teachingAgentId || null,
      agentPersonaId: agentPersonaId || null,
      motionPresetId: motionPresetId || null,
      allowLessons,
      testAccessMode,
      showSources,
      allowSelectedTextSupport,
      dailyMessageLimit:
        Number.isFinite(parsedDailyMessageLimit) && parsedDailyMessageLimit > 0
          ? Math.min(parsedDailyMessageLimit, 200)
          : null,
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
      if (next.enabled) {
        await queryClient.invalidateQueries({
          queryKey: kangurKeys.aiTutor.usage(activeLearner.id),
        });
      }
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
    motionPresetId,
    allowLessons,
    testAccessMode,
    showSources,
    allowSelectedTextSupport,
    dailyMessageLimitInput,
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
            Ustaw dostępność, ograniczenia i sposób działania pomocy AI dla tego ucznia
          </div>
        </div>
      </div>

      {currentSettings?.enabled ? (
        <div className='rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <div className='text-xs font-semibold uppercase tracking-wide text-indigo-700'>
                Wykorzystanie dzisiaj
              </div>
              <div className='mt-1 text-sm font-semibold text-slate-800'>
                {isUsageLoading
                  ? 'Sprawdzam dzisiejsze wiadomości…'
                  : hasUsageError || !usageSummary
                    ? 'Nie udało się odczytać bieżącego użycia.'
                    : usageSummary.dailyMessageLimit === null
                      ? `Wysłano ${usageSummary.messageCount} wiadomości.`
                      : `Zużyto ${usageSummary.messageCount} z ${usageSummary.dailyMessageLimit} wiadomości.`}
              </div>
            </div>
            {!isUsageLoading && !hasUsageError && usageSummary ? (
              <div className='shrink-0 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-indigo-700'>
                {usageSummary.dailyMessageLimit === null
                  ? 'Bez limitu'
                  : usageSummary.remainingMessages === 0
                    ? 'Limit wyczerpany'
                    : `Pozostało ${usageSummary.remainingMessages}`}
              </div>
            ) : null}
          </div>
          <p className='mt-2 text-xs leading-relaxed text-slate-500'>
            Widok odświeża się automatycznie, więc rodzic widzi bieżące użycie aktywnego ucznia.
          </p>
        </div>
      ) : null}

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

      <div className='space-y-3'>
        <div className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
          Guardrails rodzica
        </div>
        <TutorToggleField
          checked={allowLessons}
          disabled={!enabled}
          label='Pokazuj tutora w lekcjach'
          description='Tutor może pomagać podczas otwartych lekcji i samodzielnych powtórek.'
          onChange={setAllowLessons}
        />
        <div className='flex flex-col gap-1'>
          <label
            htmlFor={testAccessModeFieldId}
            className='text-xs font-semibold text-slate-600 uppercase tracking-wide'
          >
            Tryb pomocy w testach
          </label>
          <KangurSelectField
            id={testAccessModeFieldId}
            value={testAccessMode}
            onChange={(event) => setTestAccessMode(event.target.value as KangurAiTutorTestAccessMode)}
            accent='indigo'
            size='md'
            disabled={!enabled}
          >
            <option value='disabled'>Wyłącz tutora w testach</option>
            <option value='guided'>Pozwól tylko na wskazówki bez odpowiedzi</option>
            <option value='review_after_answer'>Pozwól dopiero po pokazaniu odpowiedzi</option>
          </KangurSelectField>
          <p className='text-xs leading-relaxed text-slate-500'>
            To ograniczenie działa także w API, więc aktywny test nie obejdzie go ręcznym
            żądaniem.
          </p>
        </div>
        <TutorToggleField
          checked={showSources}
          disabled={!enabled}
          label='Pokazuj źródła odpowiedzi'
          description='Po odpowiedzi tutor może pokazać fragmenty materiałów, z których korzystał.'
          onChange={setShowSources}
        />
        <TutorToggleField
          checked={allowSelectedTextSupport}
          disabled={!enabled}
          label='Pozwól pytać o zaznaczony fragment'
          description='Udostępnia akcję "Zapytaj o to" i tryb pracy na wskazanym fragmencie.'
          onChange={setAllowSelectedTextSupport}
        />
        <div className='flex flex-col gap-1'>
          <label
            htmlFor={dailyMessageLimitFieldId}
            className='text-xs font-semibold text-slate-600 uppercase tracking-wide'
          >
            Dzienny limit wiadomości
          </label>
          <KangurTextField
            id={dailyMessageLimitFieldId}
            type='number'
            min={1}
            max={200}
            inputMode='numeric'
            value={dailyMessageLimitInput}
            onChange={(event) => setDailyMessageLimitInput(event.target.value)}
            accent='indigo'
            size='md'
            disabled={!enabled}
            placeholder='Puste = bez limitu'
          />
          <p className='text-xs leading-relaxed text-slate-500'>
            Każda wysłana wiadomość do tutora zużywa 1 punkt limitu. Puste pole oznacza brak limitu.
          </p>
        </div>
      </div>

      {/* Teaching agent */}
      <div className='flex flex-col gap-1'>
        <label
          htmlFor={teachingAgentFieldId}
          className='text-xs font-semibold text-slate-600 uppercase tracking-wide'
        >
          Agent nauczający (z bazą wiedzy)
        </label>
        <KangurSelectField
          id={teachingAgentFieldId}
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
        <label
          htmlFor={agentPersonaFieldId}
          className='text-xs font-semibold text-slate-600 uppercase tracking-wide'
        >
          Persona (charakter tutora)
        </label>
        <KangurSelectField
          id={agentPersonaFieldId}
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

      {/* Motion preset */}
      <div className='flex flex-col gap-1'>
        <label
          htmlFor={motionPresetFieldId}
          className='text-xs font-semibold text-slate-600 uppercase tracking-wide'
        >
          Preset ruchu i zakotwiczenia
        </label>
        <KangurSelectField
          id={motionPresetFieldId}
          value={motionPresetId}
          onChange={(e) => setMotionPresetId(e.target.value)}
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
        <p className='text-xs leading-relaxed text-slate-500'>
          Opcjonalny preset wizualny dla ruchu avatara i sposobu zakotwiczenia dymku. Dane
          pochodzą z katalogu presetów Playwright, ale nie uruchamiają automatyzacji przeglądarki.
        </p>
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
