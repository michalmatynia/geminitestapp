'use client';

import { useLocale } from 'next-intl';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DragStateProvider,
  PageBuilderPageSkeleton,
  PageBuilderPolicyProvider,
  PageBuilderProvider,
  ThemeSettingsProvider,
  type LeftPanelMode,
  usePageBuilder,
} from '@/features/cms/public';
import type { SectionInstance } from '@/shared/contracts/cms';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useAdminLayoutActions } from '@/shared/providers/AdminLayoutProvider';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { Button, useToast } from '@/features/kangur/shared/ui';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';

import {
  getKangurThemeSettingsKeyForAppearanceMode,
  KANGUR_DEFAULT_DAILY_THEME,
  KANGUR_DEFAULT_DAWN_THEME,
  KANGUR_DEFAULT_SUNSET_THEME,
  KANGUR_DEFAULT_THEME,
  type KangurThemeMode,
} from '@/features/kangur/appearance/theme-settings';
import { KangurCmsBuilderLeftPanel } from './KangurCmsBuilderLeftPanel';
import { KangurCmsBuilderRightPanel } from './KangurCmsBuilderRightPanel';
import { KangurCmsBuilderStatusSidebar } from './KangurCmsBuilderStatusSidebar';
import { KangurCmsBuilderRuntimeProvider } from './KangurCmsBuilderRuntimeContext';
import { KangurCmsPreviewPanel } from './KangurCmsPreviewPanel';
import {
  buildKangurPageBuilderPolicy,
  sanitizeKangurScreenComponents,
} from './kangur-page-builder-policy';
import {
  KANGUR_CMS_PROJECT_SETTING_KEY,
  buildKangurCmsBuilderState,
  parseKangurCmsProject,
  serializeKangurCmsSections,
  type KangurCmsProject,
  type KangurCmsScreenKey,
} from './project';

const commitScreenSections = (
  project: KangurCmsProject,
  screenKey: KangurCmsScreenKey,
  sections: SectionInstance[]
): KangurCmsProject => ({
  ...project,
  screens: {
    ...project.screens,
    [screenKey]: {
      ...project.screens[screenKey],
      components: sanitizeKangurScreenComponents(screenKey, serializeKangurCmsSections(sections)),
    },
  },
});

const resolveThemePreviewFallback = (mode: KangurThemeMode): ThemeSettings => {
  if (mode === 'dawn') return KANGUR_DEFAULT_DAWN_THEME;
  if (mode === 'sunset') return KANGUR_DEFAULT_SUNSET_THEME;
  if (mode === 'nightly') return KANGUR_DEFAULT_THEME;
  return KANGUR_DEFAULT_DAILY_THEME;
};

const resolveThemePreviewStorageKey = (mode: KangurThemeMode): string => {
  if (mode === 'dawn') {
    return getKangurThemeSettingsKeyForAppearanceMode('dawn');
  }
  if (mode === 'sunset') {
    return getKangurThemeSettingsKeyForAppearanceMode('sunset');
  }
  if (mode === 'nightly') {
    return getKangurThemeSettingsKeyForAppearanceMode('dark');
  }
  return getKangurThemeSettingsKeyForAppearanceMode('default');
};

const renderBuilderThemeSettingsProvider = (
  mode: KangurThemeMode,
  children: React.ReactNode
): React.ReactElement => (
  <ThemeSettingsProvider
    storageKey={resolveThemePreviewStorageKey(mode)}
    defaultTheme={resolveThemePreviewFallback(mode)}
  >
    {children}
  </ThemeSettingsProvider>
);

function KangurCmsBuilderInner({
  themePreviewMode,
  onThemeModeChange,
}: {
  themePreviewMode: KangurThemeMode;
  onThemeModeChange: (mode: KangurThemeMode) => void;
}): React.JSX.Element {
  const { state, dispatch } = usePageBuilder();
  const { setIsProgrammaticallyCollapsed } = useAdminLayoutActions();
  const isViewing = state.leftPanelCollapsed && state.rightPanelCollapsed;
  const autoCollapsedRightRef = React.useRef(false);
  const wasNarrowRef = React.useRef<boolean | null>(null);
  const [statusSidebarOpen, setStatusSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return withKangurClientErrorSync(
      {
        source: 'kangur.cms-builder',
        action: 'read-status-sidebar',
        description: 'Reads the persisted CMS builder status sidebar state.',
      },
      () => {
        const stored = window.localStorage.getItem('kangur_cms_builder_status_sidebar');
        return stored !== '0';
      },
      { fallback: true }
    );
  });
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('structure');
  const [themePreviewSection, setThemePreviewSection] = useState<string | null>(null);
  const [themePreviewTheme, setThemePreviewTheme] = useState<ThemeSettings | null>(null);

  const handleThemeModeChange = useCallback((mode: KangurThemeMode): void => {
    setThemePreviewTheme(null);
    onThemeModeChange(mode);
  }, [onThemeModeChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    withKangurClientErrorSync(
      {
        source: 'kangur.cms-builder',
        action: 'persist-status-sidebar',
        description: 'Persists the CMS builder status sidebar state.',
        context: { statusSidebarOpen },
      },
      () => {
        window.localStorage.setItem(
          'kangur_cms_builder_status_sidebar',
          statusSidebarOpen ? '1' : '0'
        );
      },
      { fallback: undefined }
    );
  }, [statusSidebarOpen]);

  useEffect((): (() => void) => {
    setIsProgrammaticallyCollapsed(true);
    return (): void => setIsProgrammaticallyCollapsed(false);
  }, [setIsProgrammaticallyCollapsed]);

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return undefined;
    const breakpoint = 1200;
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const applyBreakpoint = (isNarrow: boolean): void => {
      if (wasNarrowRef.current === isNarrow) return;
      wasNarrowRef.current = isNarrow;

      if (isNarrow) {
        if (!state.rightPanelCollapsed) {
          dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
          autoCollapsedRightRef.current = true;
        }
      } else if (autoCollapsedRightRef.current) {
        if (state.rightPanelCollapsed) {
          dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
        }
        autoCollapsedRightRef.current = false;
      }
    };

    applyBreakpoint(media.matches);
    const handler = (event: MediaQueryListEvent): void => {
      applyBreakpoint(event.matches);
    };

    media.addEventListener('change', handler);
    return (): void => {
      media.removeEventListener('change', handler);
    };
  }, [dispatch, state.rightPanelCollapsed]);

  return (
    <div className='flex h-[calc(100vh-64px)] flex-col bg-background text-white'>
      <div className='relative flex flex-1 overflow-hidden'>
        {state.leftPanelCollapsed && !isViewing ? (
          <Button
            onClick={() => dispatch({ type: 'TOGGLE_LEFT_PANEL' })}
            size='sm'
            variant='outline'
            className='absolute left-1 top-1 z-10 h-8 w-8 border p-0 text-gray-300 hover:bg-muted/50'
            aria-label='Show left panel'
            title={'Show left panel'}>
            <PanelLeftClose className='size-4' />
          </Button>
        ) : null}

        <KangurCmsBuilderLeftPanel
          onModeChange={setLeftPanelMode}
          onThemeSectionChange={setThemePreviewSection}
          onThemeChange={setThemePreviewTheme}
          onThemeModeChange={handleThemeModeChange}
        />

        <KangurCmsPreviewPanel
          statusSidebarOpen={statusSidebarOpen}
          onToggleStatusSidebar={() => setStatusSidebarOpen((prev) => !prev)}
        />

        {state.rightPanelCollapsed && !isViewing ? (
          <Button
            onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
            size='sm'
            variant='outline'
            className='absolute right-1 top-1 z-10 h-8 w-8 border p-0 text-gray-300 hover:bg-muted/50'
            aria-label='Show right panel'
            title={'Show right panel'}>
            <PanelRightClose className='size-4' />
          </Button>
        ) : null}

        <KangurCmsBuilderRightPanel
          showThemePreview={leftPanelMode === 'theme'}
          themePreviewSection={themePreviewSection}
          themePreviewTheme={themePreviewTheme ?? resolveThemePreviewFallback(themePreviewMode)}
          themePreviewMode={themePreviewMode}
        />
        <KangurCmsBuilderStatusSidebar visible={statusSidebarOpen} />
      </div>
    </div>
  );
}

export function KangurCmsBuilderWorkspace(): React.JSX.Element {
  const locale = useLocale();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const settingsReady = !settingsStore.isLoading;
  const rawProject = settingsStore.get(KANGUR_CMS_PROJECT_SETTING_KEY);
  const persistedProject = useMemo(
    () =>
      (settingsReady
        ? parseKangurCmsProject(rawProject, { fallbackToDefault: true, locale })
        : null),
    [locale, rawProject, settingsReady]
  );
  const [savedProject, setSavedProject] = useState<KangurCmsProject | null>(null);
  const [draftProject, setDraftProject] = useState<KangurCmsProject | null>(null);
  const [activeScreenKey, setActiveScreenKey] = useState<KangurCmsScreenKey>('Game');
  const [isSaving, setIsSaving] = useState(false);
  const [themePreviewMode, setThemePreviewMode] = useState<KangurThemeMode>('daily');

  useEffect((): void => {
    if (!persistedProject) return;
    if (savedProject || draftProject) return;
    setSavedProject(persistedProject);
    setDraftProject(persistedProject);
  }, [draftProject, persistedProject, savedProject]);

  const handleSwitchScreen = useCallback(
    (nextScreenKey: KangurCmsScreenKey, sections: SectionInstance[]): void => {
      if (nextScreenKey === activeScreenKey) {
        return;
      }

      setDraftProject((current: KangurCmsProject | null) => {
        if (!current) return current;
        return commitScreenSections(current, activeScreenKey, sections);
      });
      setActiveScreenKey(nextScreenKey);
    },
    [activeScreenKey]
  );

  const handleSave = useCallback(
    async (sections: SectionInstance[]): Promise<void> => {
      if (!draftProject) return;

      const nextDraftProject = commitScreenSections(draftProject, activeScreenKey, sections);
      setDraftProject(nextDraftProject);
      setIsSaving(true);
      const didSave = await withKangurClientError(
        {
          source: 'kangur.cms-builder',
          action: 'save-project',
          description: 'Saves the Kangur CMS project to settings storage.',
          context: { screenKey: activeScreenKey },
        },
        async () => {
          await updateSetting.mutateAsync({
            key: KANGUR_CMS_PROJECT_SETTING_KEY,
            value: serializeSetting(nextDraftProject),
          });
          return true;
        },
        {
          fallback: false,
          onError: (error) => {
            toast(error instanceof Error ? error.message : 'Failed to save Kangur CMS project.', {
              variant: 'error',
            });
          },
        }
      );
      if (didSave) {
        setSavedProject(nextDraftProject);
        toast('Kangur CMS project saved.', { variant: 'success' });
      }
      setIsSaving(false);
    },
    [activeScreenKey, draftProject, toast, updateSetting]
  );

  const initialState = useMemo(() => {
    if (!draftProject) return null;
    return buildKangurCmsBuilderState(draftProject, activeScreenKey, locale);
  }, [activeScreenKey, draftProject, locale]);
  const pageBuilderPolicy = useMemo(
    () => buildKangurPageBuilderPolicy(activeScreenKey),
    [activeScreenKey]
  );

  if (!settingsReady || !draftProject || !savedProject || !initialState) {
    return <PageBuilderPageSkeleton />;
  }

  return (
    <PageBuilderPolicyProvider value={pageBuilderPolicy}>
      <PageBuilderProvider key={activeScreenKey} initialState={initialState}>
        <DragStateProvider>
          {renderBuilderThemeSettingsProvider(
            themePreviewMode,
            <KangurCmsBuilderRuntimeProvider
              draftProject={draftProject}
              savedProject={savedProject}
              activeScreenKey={activeScreenKey}
              onSwitchScreen={handleSwitchScreen}
              onSave={handleSave}
              isSaving={isSaving}
            >
              <KangurCmsBuilderInner
                themePreviewMode={themePreviewMode}
                onThemeModeChange={setThemePreviewMode}
              />
            </KangurCmsBuilderRuntimeProvider>
          )}
        </DragStateProvider>
      </PageBuilderProvider>
    </PageBuilderPolicyProvider>
  );
}
