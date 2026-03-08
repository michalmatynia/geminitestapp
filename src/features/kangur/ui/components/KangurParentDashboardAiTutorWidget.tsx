'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit } from 'lucide-react';

import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
  type KangurAiTutorLearnerStoredSettings,
  type KangurAiTutorTestAccessMode,
  type KangurAiTutorUiMode,
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
} from '@/features/kangur/ui/design/primitives';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import { kangurKeys } from '@/shared/lib/query-key-exports';
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
        disabled
          ? 'cursor-not-allowed border-slate-100 bg-slate-50/60 opacity-70'
          : checked
            ? 'cursor-pointer border-amber-200 bg-amber-50/65'
            : 'cursor-pointer border-slate-200 bg-white/70'
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
          className={`h-5 w-10 rounded-full transition-all ${
            checked
              ? 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_8px_18px_-14px_rgba(249,115,22,0.72)]'
              : 'bg-slate-300'
          }`}
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
  const rawAppSettings = settingsStore.get(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const settingsStoreMap = useMemo(
    () => parseKangurAiTutorSettings(rawSettings),
    [rawSettings]
  );
  const appSettings = useMemo(
    () => resolveKangurAiTutorAppSettings(rawAppSettings, settingsStoreMap),
    [rawAppSettings, settingsStoreMap]
  );
  const currentSettings = useMemo(
    () =>
      activeLearnerId
        ? getKangurAiTutorSettingsForLearner(settingsStoreMap, activeLearnerId, appSettings)
        : null,
    [appSettings, settingsStoreMap, activeLearnerId]
  );
  const shouldLoadUsage = canAccessDashboard && Boolean(activeLearnerId) && currentSettings?.enabled;

  const [enabled, setEnabled] = useState(currentSettings?.enabled ?? false);
  const [uiMode, setUiMode] = useState<KangurAiTutorUiMode>(
    currentSettings?.uiMode ?? 'anchored'
  );
  const [allowCrossPagePersistence, setAllowCrossPagePersistence] = useState(
    currentSettings?.allowCrossPagePersistence ?? true
  );
  const [allowLessons, setAllowLessons] = useState(currentSettings?.allowLessons ?? true);
  const [testAccessMode, setTestAccessMode] = useState<KangurAiTutorTestAccessMode>(
    currentSettings?.testAccessMode ?? 'guided'
  );
  const [showSources, setShowSources] = useState(currentSettings?.showSources ?? true);
  const [allowSelectedTextSupport, setAllowSelectedTextSupport] = useState(
    currentSettings?.allowSelectedTextSupport ?? true
  );

  useEffect(() => {
    setEnabled(currentSettings?.enabled ?? false);
    setUiMode(currentSettings?.uiMode ?? 'anchored');
    setAllowCrossPagePersistence(currentSettings?.allowCrossPagePersistence ?? true);
    setAllowLessons(currentSettings?.allowLessons ?? true);
    setTestAccessMode(currentSettings?.testAccessMode ?? 'guided');
    setShowSources(currentSettings?.showSources ?? true);
    setAllowSelectedTextSupport(currentSettings?.allowSelectedTextSupport ?? true);
  }, [activeLearner?.id, currentSettings]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const uiModeFieldId = useId();
  const testAccessModeFieldId = useId();
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

    const next: KangurAiTutorLearnerStoredSettings = {
      enabled,
      uiMode,
      allowCrossPagePersistence,
      allowLessons,
      testAccessMode,
      showSources,
      allowSelectedTextSupport,
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
    uiMode,
    allowCrossPagePersistence,
    allowLessons,
    testAccessMode,
    showSources,
    allowSelectedTextSupport,
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
      accent='amber'
      padding='lg'
      className='w-full flex flex-col gap-5'
    >
      <div className='flex items-center gap-3'>
        <BrainCircuit className='h-5 w-5 text-orange-500' />
        <div>
          <div className='text-sm font-bold text-slate-800'>AI Tutor dla {activeLearner.displayName}</div>
          <div className='text-xs text-slate-500'>
            Ustaw dostępność i guardrails pomocy AI dla tego ucznia
          </div>
        </div>
      </div>

      {currentSettings?.enabled ? (
        <div className='rounded-2xl border border-amber-100 bg-amber-50/75 px-4 py-3'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <div className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
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
              <div className='shrink-0 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-amber-700'>
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

      <div className='rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 text-xs leading-relaxed text-slate-500'>
        Globalna persona tutora, agent nauczający, dzienny limit wiadomości i preset urządzenia są
        zarządzane w <span className='font-semibold text-slate-700'>Kangur Settings</span>.
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
            className={`w-10 h-5 rounded-full transition-all ${
              enabled
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_8px_18px_-14px_rgba(249,115,22,0.72)]'
                : 'bg-slate-300'
            }`}
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
            accent='amber'
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
        <TutorToggleField
          checked={allowCrossPagePersistence}
          disabled={!enabled}
          label='Zachowuj rozmowę po zmianie miejsca'
          description='Tutor może pozostać otwarty i wrócić do poprzedniego wątku po przejściu między lekcjami, testami i podsumowaniami.'
          onChange={setAllowCrossPagePersistence}
        />
      </div>

      <div className='flex flex-col gap-1'>
        <label
          htmlFor={uiModeFieldId}
          className='text-xs font-semibold text-slate-600 uppercase tracking-wide'
        >
          Tryb interfejsu tutora
        </label>
        <KangurSelectField
          id={uiModeFieldId}
          value={uiMode}
          onChange={(event) => setUiMode(event.target.value as KangurAiTutorUiMode)}
          accent='amber'
          size='md'
          disabled={!enabled}
        >
          <option value='anchored'>Ruchomy i zakotwiczony przy treści</option>
          <option value='static'>Statyczny w rogu ekranu</option>
        </KangurSelectField>
        <p className='text-xs leading-relaxed text-slate-500'>
          Tryb ruchomy podąża za zaznaczeniem i aktywnym zadaniem. Tryb statyczny zachowuje chat w
          stałym miejscu, ale nadal używa bieżącego kontekstu lekcji lub testu.
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
