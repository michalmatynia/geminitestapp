'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurLessonSections } from '@/features/kangur/ui/hooks/useKangurLessonSections';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { serializeSetting } from '@/shared/utils/settings-json';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import {
  isRecoverableSocialPublishingClientFetchError,
  logSocialPublishingClientError,
} from '@/features/filemaker/social/client-observability';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';
import {
  SOCIAL_PUBLISHING_SETTINGS_KEY,
  parseSocialPublishingSettings,
} from '@/features/filemaker/social/settings';
import {
  buildSlideKey,
  DEFAULT_CAPTURE_SECTIONS,
  type SocialPublishingCapturePageSection,
  type SocialPublishingCaptureContentConfig,
} from '@/features/filemaker/social/shared/social-capture-content-config';
import {
  buildSocialCaptureMasterNodes,
  parseSocialCaptureSlideNodeId,
} from '@/features/filemaker/social/shared/social-capture-master-tree';

const TREE_INSTANCE = 'social_publishing_capture_browser' as const;

type SlideConfig = {
  disabled?: boolean;
  sections: SocialPublishingCapturePageSection[];
};

type UseCaptureBrowserPersistenceParams = {
  queryClient: ReturnType<typeof useQueryClient>;
  settingsStoreRef: React.MutableRefObject<ReturnType<typeof useSettingsStore>>;
  toast: ReturnType<typeof useToast>['toast'];
  updateSetting: ReturnType<typeof useUpdateSetting>;
};

type SlideUpdater = (prev: SlideConfig) => SlideConfig;

type UseCaptureBrowserSlideMutationsParams = {
  persistConfig: (nextConfig: SocialPublishingCaptureContentConfig) => Promise<void>;
  selectedSlideKey: string | null;
  settingsStoreRef: React.MutableRefObject<ReturnType<typeof useSettingsStore>>;
};

type UseCaptureBrowserSlideMutationsResult = {
  toggleSection: (section: SocialPublishingCapturePageSection) => void;
  toggleSlideDisabled: () => void;
};

type SocialCaptureBrowserStateResult = {
  isLoadingTree: boolean;
  isSaving: boolean;
  search: ReturnType<typeof useMasterFolderTreeViewModel>['searchState'];
  searchQuery: string;
  selectedSlideDisabled: boolean;
  selectedSlideKey: string | null;
  selectedSlideSections: SocialPublishingCapturePageSection[];
  setSearchQuery: (value: string) => void;
  slideMap: Map<string, SlideConfig>;
  toggleSection: (section: SocialPublishingCapturePageSection) => void;
  toggleSlideDisabled: () => void;
  tree: ReturnType<typeof useMasterFolderTreeViewModel>;
};

const buildUpdatedCaptureSlides = ({
  slideKey,
  slides,
  updater,
}: {
  slideKey: string;
  slides: SocialPublishingCaptureContentConfig['slides'];
  updater: SlideUpdater;
}): SocialPublishingCaptureContentConfig['slides'] | null => {
  const parsed = parseSocialCaptureSlideNodeId(`social-capture-slide:${slideKey}`);
  if (parsed === null) {
    return null;
  }

  const existingSlide = slides.find(
    (slide) => buildSlideKey(slide.componentId, slide.sectionId, slide.subsectionId) === slideKey
  );
  const prev = existingSlide !== undefined
    ? { sections: existingSlide.sections, disabled: existingSlide.disabled }
    : { sections: DEFAULT_CAPTURE_SECTIONS };
  const next = updater(prev);
  const withoutSlide = slides.filter(
    (slide) => buildSlideKey(slide.componentId, slide.sectionId, slide.subsectionId) !== slideKey
  );

  return [
    ...withoutSlide,
    {
      componentId: parsed.componentId,
      sectionId: parsed.sectionId,
      subsectionId: parsed.subsectionId,
      sections: next.sections,
      ...(next.disabled === true ? { disabled: true as const } : {}),
    },
  ];
};

const buildPersistedSlideMap = (
  persistedConfig: SocialPublishingCaptureContentConfig
): Map<string, SlideConfig> => {
  const map = new Map<string, SlideConfig>();
  for (const slide of persistedConfig.slides) {
    map.set(buildSlideKey(slide.componentId, slide.sectionId, slide.subsectionId), {
      sections: slide.sections,
      disabled: slide.disabled,
    });
  }
  return map;
};

const resolveSelectedSlideKey = (
  selectedNodeId: string | null | undefined
): string | null => {
  if (selectedNodeId === null || selectedNodeId === undefined || selectedNodeId.length === 0) {
    return null;
  }
  const selectedSlide = parseSocialCaptureSlideNodeId(selectedNodeId);
  if (selectedSlide === null) {
    return null;
  }
  return buildSlideKey(
    selectedSlide.componentId,
    selectedSlide.sectionId,
    selectedSlide.subsectionId
  );
};

const resolveSelectedSlideConfig = ({
  selectedSlideKey,
  slideMap,
}: {
  selectedSlideKey: string | null;
  slideMap: Map<string, SlideConfig>;
}): SlideConfig => {
  if (selectedSlideKey === null) {
    return { sections: DEFAULT_CAPTURE_SECTIONS, disabled: false };
  }
  return slideMap.get(selectedSlideKey) ?? {
    sections: DEFAULT_CAPTURE_SECTIONS,
    disabled: false,
  };
};

const useCaptureBrowserPersistence = ({
  queryClient,
  settingsStoreRef,
  toast,
  updateSetting,
}: UseCaptureBrowserPersistenceParams): ((
  nextConfig: SocialPublishingCaptureContentConfig
) => Promise<void>) =>
  useCallback(
    async (nextConfig: SocialPublishingCaptureContentConfig): Promise<void> => {
      try {
        const currentSettings = parseSocialPublishingSettings(
          settingsStoreRef.current.get(SOCIAL_PUBLISHING_SETTINGS_KEY)
        );
        const payload = { ...currentSettings, captureContentConfig: nextConfig };
        const serialized = serializeSetting(payload);
        await updateSetting.mutateAsync({ key: SOCIAL_PUBLISHING_SETTINGS_KEY, value: serialized });
        queryClient.setQueryData<Map<string, string>>(
          QUERY_KEYS.settings.scope('light'),
          (current) => {
            const next = new Map(current ?? []);
            next.set(SOCIAL_PUBLISHING_SETTINGS_KEY, serialized);
            return next;
          }
        );
        settingsStoreRef.current.refetch();
      } catch (error) {
        const isRecoverable = isRecoverableSocialPublishingClientFetchError(error);
        if (!isRecoverable) {
          void ErrorSystem.captureException(error);
          logSocialPublishingClientError(error, {
            source: 'useSocialCaptureBrowserState',
            action: 'persistConfig',
          });
        }
        toast(
          isRecoverable
            ? 'Failed to save capture config. Check your connection and try again.'
            : 'Failed to save capture config.',
          { variant: 'error' }
        );
      }
    },
    [queryClient, toast, updateSetting]
  );

const useCaptureBrowserSlideMutations = ({
  persistConfig,
  selectedSlideKey,
  settingsStoreRef,
}: UseCaptureBrowserSlideMutationsParams): UseCaptureBrowserSlideMutationsResult => {
  const updateSlide = useCallback(
    (slideKey: string, updater: SlideUpdater): void => {
      const currentSettings = parseSocialPublishingSettings(
        settingsStoreRef.current.get(SOCIAL_PUBLISHING_SETTINGS_KEY)
      );
      const { captureContentConfig } = currentSettings;
      const nextSlides = buildUpdatedCaptureSlides({
        slideKey,
        slides: captureContentConfig.slides,
        updater,
      });

      if (nextSlides !== null) {
        void persistConfig({ slides: nextSlides });
      }
    },
    [persistConfig]
  );

  const toggleSection = useCallback(
    (section: SocialPublishingCapturePageSection): void => {
      if (selectedSlideKey === null) return;
      updateSlide(selectedSlideKey, (prev) => {
        const has = prev.sections.includes(section);
        const nextSections = has
          ? prev.sections.filter((s) => s !== section)
          : [...prev.sections, section];
        return {
          sections: nextSections.length > 0 ? nextSections : DEFAULT_CAPTURE_SECTIONS,
          disabled: prev.disabled,
        };
      });
    },
    [selectedSlideKey, updateSlide]
  );

  const toggleSlideDisabled = useCallback((): void => {
    if (selectedSlideKey === null) return;
    updateSlide(selectedSlideKey, (prev) => ({
      sections: prev.sections,
      disabled: prev.disabled !== true,
    }));
  }, [selectedSlideKey, updateSlide]);

  return { toggleSection, toggleSlideDisabled };
};

export function useSocialCaptureBrowserState(): SocialCaptureBrowserStateResult {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const queryClient = useQueryClient();
  const updateSetting = useUpdateSetting();
  const lessonsQuery = useKangurLessons();
  const sectionsQuery = useKangurLessonSections();
  const lessons = lessonsQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];
  const rawSettings = settingsStore.get(SOCIAL_PUBLISHING_SETTINGS_KEY);
  const persistedConfig = useMemo(
    () => parseSocialPublishingSettings(rawSettings).captureContentConfig,
    [rawSettings]
  );
  const slideMap = useMemo(() => buildPersistedSlideMap(persistedConfig), [persistedConfig]);
  const nodes = useMemo(() => buildSocialCaptureMasterNodes(sections, lessons), [sections, lessons]);
  const [searchQuery, setSearchQuery] = useState('');
  const tree = useMasterFolderTreeViewModel({ instance: TREE_INSTANCE, nodes, searchQuery });
  const selectedSlideKey = resolveSelectedSlideKey(tree.controller.selectedNodeId);
  const selectedSlideConfig = resolveSelectedSlideConfig({ selectedSlideKey, slideMap });
  const settingsStoreRef = useRef(settingsStore);
  settingsStoreRef.current = settingsStore;
  const persistConfig = useCaptureBrowserPersistence({
    queryClient,
    settingsStoreRef,
    toast,
    updateSetting,
  });
  const { toggleSection, toggleSlideDisabled } = useCaptureBrowserSlideMutations({
    persistConfig,
    selectedSlideKey,
    settingsStoreRef,
  });

  return {
    tree,
    search: tree.searchState,
    searchQuery,
    setSearchQuery,
    selectedSlideKey,
    selectedSlideSections: selectedSlideConfig.sections,
    selectedSlideDisabled: selectedSlideConfig.disabled === true,
    slideMap,
    toggleSection,
    toggleSlideDisabled,
    isSaving: updateSetting.isPending,
    isLoadingTree: lessonsQuery.isLoading || sectionsQuery.isLoading,
  };
}

export type SocialCaptureBrowserState = ReturnType<typeof useSocialCaptureBrowserState>;
