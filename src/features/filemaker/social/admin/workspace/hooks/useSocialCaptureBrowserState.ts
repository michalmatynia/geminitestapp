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

export function useSocialCaptureBrowserState() {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const queryClient = useQueryClient();
  const updateSetting = useUpdateSetting();

  // ─── Data ──────────────────────────────────────────────────────────────────
  const lessonsQuery = useKangurLessons();
  const sectionsQuery = useKangurLessonSections();
  const lessons = lessonsQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];
  const isLoadingTree = lessonsQuery.isLoading || sectionsQuery.isLoading;

  // ─── Persisted config ──────────────────────────────────────────────────────
  const rawSettings = settingsStore.get(SOCIAL_PUBLISHING_SETTINGS_KEY);
  const persistedConfig = useMemo(
    () => parseSocialPublishingSettings(rawSettings).captureContentConfig,
    [rawSettings]
  );

  // Slide map: slideKey → { sections, disabled }
  const slideMap = useMemo(() => {
    const map = new Map<string, { sections: SocialPublishingCapturePageSection[]; disabled?: boolean }>();
    for (const slide of persistedConfig.slides) {
      map.set(buildSlideKey(slide.componentId, slide.sectionId, slide.subsectionId), {
        sections: slide.sections,
        disabled: slide.disabled,
      });
    }
    return map;
  }, [persistedConfig]);

  // ─── Tree ──────────────────────────────────────────────────────────────────
  const nodes = useMemo(
    () => buildSocialCaptureMasterNodes(sections, lessons),
    [sections, lessons]
  );

  // ─── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const tree = useMasterFolderTreeViewModel({
    instance: TREE_INSTANCE,
    nodes,
    searchQuery,
  });
  const { searchState: search } = tree;

  // ─── Selected slide ────────────────────────────────────────────────────────
  const selectedNodeId = tree.controller.selectedNodeId;
  const selectedSlide = useMemo(
    () => (selectedNodeId ? parseSocialCaptureSlideNodeId(selectedNodeId) : null),
    [selectedNodeId]
  );

  const selectedSlideKey = selectedSlide
    ? buildSlideKey(selectedSlide.componentId, selectedSlide.sectionId, selectedSlide.subsectionId)
    : null;

  const selectedSlideSections: SocialPublishingCapturePageSection[] = selectedSlideKey
    ? (slideMap.get(selectedSlideKey)?.sections ?? DEFAULT_CAPTURE_SECTIONS)
    : DEFAULT_CAPTURE_SECTIONS;

  const selectedSlideDisabled: boolean = selectedSlideKey
    ? (slideMap.get(selectedSlideKey)?.disabled ?? false)
    : false;

  // ─── Stable ref ────────────────────────────────────────────────────────────
  const settingsStoreRef = useRef(settingsStore);
  settingsStoreRef.current = settingsStore;

  // ─── Persistence ───────────────────────────────────────────────────────────
  const persistConfig = useCallback(
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

  // ─── Slide mutations ───────────────────────────────────────────────────────
  const updateSlide = useCallback(
    (
      slideKey: string,
      updater: (prev: {
        sections: SocialPublishingCapturePageSection[];
        disabled?: boolean;
      }) => { sections: SocialPublishingCapturePageSection[]; disabled?: boolean }
    ): void => {
      const currentSettings = parseSocialPublishingSettings(
        settingsStoreRef.current.get(SOCIAL_PUBLISHING_SETTINGS_KEY)
      );
      const { captureContentConfig } = currentSettings;
      const existingSlide = captureContentConfig.slides.find(
        (s) => buildSlideKey(s.componentId, s.sectionId, s.subsectionId) === slideKey
      );
      const parsed = parseSocialCaptureSlideNodeId(`social-capture-slide:${slideKey}`);
      if (!parsed) return;

      const prev = existingSlide
        ? { sections: existingSlide.sections, disabled: existingSlide.disabled }
        : { sections: DEFAULT_CAPTURE_SECTIONS };

      const next = updater(prev);

      const withoutSlide = captureContentConfig.slides.filter(
        (s) => buildSlideKey(s.componentId, s.sectionId, s.subsectionId) !== slideKey
      );
      const nextSlides = [
        ...withoutSlide,
        {
          componentId: parsed.componentId,
          sectionId: parsed.sectionId,
          subsectionId: parsed.subsectionId,
          sections: next.sections,
          ...(next.disabled ? { disabled: true as const } : {}),
        },
      ];

      void persistConfig({ slides: nextSlides });
    },
    [persistConfig]
  );

  const toggleSection = useCallback(
    (section: SocialPublishingCapturePageSection): void => {
      if (!selectedSlideKey) return;
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
    if (!selectedSlideKey) return;
    updateSlide(selectedSlideKey, (prev) => ({
      sections: prev.sections,
      disabled: !prev.disabled,
    }));
  }, [selectedSlideKey, updateSlide]);

  return {
    tree,
    search,
    searchQuery,
    setSearchQuery,
    selectedSlideKey,
    selectedSlideSections,
    selectedSlideDisabled,
    slideMap,
    toggleSection,
    toggleSlideDisabled,
    isSaving: updateSetting.isPending,
    isLoadingTree,
  };
}

export type SocialCaptureBrowserState = ReturnType<typeof useSocialCaptureBrowserState>;
