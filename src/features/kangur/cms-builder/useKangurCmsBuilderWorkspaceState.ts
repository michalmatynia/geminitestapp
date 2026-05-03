'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SectionInstance } from '@/shared/contracts/cms';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { useToast } from '@/features/kangur/shared/ui';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  resolveKangurStoredThemeSnapshot,
  type KangurThemeMode,
} from '@/features/kangur/appearance/theme-settings';

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
import { resolveWorkspaceHydratedProject } from './workspace-hydration';
import { resolveThemePreviewStorageKey } from './workspace-theme-preview';

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

const usePersistedWorkspaceProject = (): {
  locale: string;
  persistedProject: KangurCmsProject | null;
  settingsReady: boolean;
  themePreviewFallbacks: ReturnType<typeof resolveKangurStoredThemeSnapshot>;
} => {
  const locale = useLocale();
  const settingsStore = useSettingsStore();
  const settingsReady = !settingsStore.isLoading;
  const rawProject = settingsStore.get(KANGUR_CMS_PROJECT_SETTING_KEY);
  const persistedProject = useMemo(
    () =>
      settingsReady
        ? parseKangurCmsProject(rawProject, { fallbackToDefault: true, locale })
        : null,
    [locale, rawProject, settingsReady]
  );
  const dailyThemeRaw = settingsStore.get(resolveThemePreviewStorageKey('daily'));
  const dawnThemeRaw = settingsStore.get(resolveThemePreviewStorageKey('dawn'));
  const sunsetThemeRaw = settingsStore.get(resolveThemePreviewStorageKey('sunset'));
  const nightlyThemeRaw = settingsStore.get(resolveThemePreviewStorageKey('nightly'));
  const themePreviewFallbacks = useMemo(
    () =>
      resolveKangurStoredThemeSnapshot({
        dailyThemeRaw,
        dawnThemeRaw,
        sunsetThemeRaw,
        nightlyThemeRaw,
      }),
    [dailyThemeRaw, dawnThemeRaw, nightlyThemeRaw, sunsetThemeRaw]
  );

  return { locale, persistedProject, settingsReady, themePreviewFallbacks };
};

const useWorkspaceHydratedProject = (persistedProject: KangurCmsProject | null): {
  draftProject: KangurCmsProject | null;
  savedProject: KangurCmsProject | null;
  setDraftProject: React.Dispatch<React.SetStateAction<KangurCmsProject | null>>;
  setSavedProject: React.Dispatch<React.SetStateAction<KangurCmsProject | null>>;
} => {
  const [savedProject, setSavedProject] = useState<KangurCmsProject | null>(null);
  const [draftProject, setDraftProject] = useState<KangurCmsProject | null>(null);

  useEffect((): void => {
    const nextHydratedProject = resolveWorkspaceHydratedProject({
      draftProject,
      persistedProject,
      savedProject,
    });
    if (!nextHydratedProject) return;
    setSavedProject(nextHydratedProject);
    setDraftProject(nextHydratedProject);
  }, [draftProject, persistedProject, savedProject]);

  return { draftProject, savedProject, setDraftProject, setSavedProject };
};

const useWorkspaceSaveAction = ({
  activeScreenKey,
  draftProject,
  setDraftProject,
  setSavedProject,
}: {
  activeScreenKey: KangurCmsScreenKey;
  draftProject: KangurCmsProject | null;
  setDraftProject: React.Dispatch<React.SetStateAction<KangurCmsProject | null>>;
  setSavedProject: React.Dispatch<React.SetStateAction<KangurCmsProject | null>>;
}): {
  handleSave: (sections: SectionInstance[]) => Promise<void>;
  isSaving: boolean;
} => {
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

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
    [activeScreenKey, draftProject, setDraftProject, setSavedProject, toast, updateSetting]
  );

  return { handleSave, isSaving };
};

export const useKangurCmsBuilderWorkspaceState = (): {
  activeScreenKey: KangurCmsScreenKey;
  draftProject: KangurCmsProject | null;
  handleSave: (sections: SectionInstance[]) => Promise<void>;
  handleSwitchScreen: (nextScreenKey: KangurCmsScreenKey, sections: SectionInstance[]) => void;
  initialState: ReturnType<typeof buildKangurCmsBuilderState> | null;
  isSaving: boolean;
  pageBuilderPolicy: ReturnType<typeof buildKangurPageBuilderPolicy>;
  savedProject: KangurCmsProject | null;
  setThemePreviewMode: React.Dispatch<React.SetStateAction<KangurThemeMode>>;
  settingsReady: boolean;
  themePreviewFallbacks: ReturnType<typeof resolveKangurStoredThemeSnapshot>;
  themePreviewMode: KangurThemeMode;
} => {
  const { locale, persistedProject, settingsReady, themePreviewFallbacks } =
    usePersistedWorkspaceProject();
  const { draftProject, savedProject, setDraftProject, setSavedProject } =
    useWorkspaceHydratedProject(persistedProject);
  const [activeScreenKey, setActiveScreenKey] = useState<KangurCmsScreenKey>('Game');
  const [themePreviewMode, setThemePreviewMode] = useState<KangurThemeMode>('daily');
  const handleSwitchScreen = useCallback(
    (nextScreenKey: KangurCmsScreenKey, sections: SectionInstance[]): void => {
      if (nextScreenKey === activeScreenKey) return;
      setDraftProject((current: KangurCmsProject | null) =>
        current ? commitScreenSections(current, activeScreenKey, sections) : current
      );
      setActiveScreenKey(nextScreenKey);
    },
    [activeScreenKey, setDraftProject]
  );
  const { handleSave, isSaving } = useWorkspaceSaveAction({
    activeScreenKey,
    draftProject,
    setDraftProject,
    setSavedProject,
  });
  const initialState = useMemo(
    () => (draftProject ? buildKangurCmsBuilderState(draftProject, activeScreenKey, locale) : null),
    [activeScreenKey, draftProject, locale]
  );
  const pageBuilderPolicy = useMemo(
    () => buildKangurPageBuilderPolicy(activeScreenKey),
    [activeScreenKey]
  );

  return {
    activeScreenKey,
    draftProject,
    handleSave,
    handleSwitchScreen,
    initialState,
    isSaving,
    pageBuilderPolicy,
    savedProject,
    setThemePreviewMode,
    settingsReady,
    themePreviewFallbacks,
    themePreviewMode,
  };
};
