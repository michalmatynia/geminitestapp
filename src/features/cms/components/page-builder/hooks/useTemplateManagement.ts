import { useCallback, useMemo } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import {
  GRID_TEMPLATE_SETTINGS_KEY,
  normalizeGridTemplates,
  type GridTemplateRecord,
} from '../grid-templates';
import {
  SECTION_TEMPLATE_SETTINGS_KEY,
  normalizeSectionTemplates,
  type SectionTemplateRecord,
} from '../section-template-store';

export function useTemplateManagement() {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();

  const gridTemplatesRaw = settingsStore.get(GRID_TEMPLATE_SETTINGS_KEY);
  const savedGridTemplates = useMemo<GridTemplateRecord[]>(() => {
    const stored = parseJsonSetting<unknown>(gridTemplatesRaw, []);
    return normalizeGridTemplates(stored);
  }, [gridTemplatesRaw]);

  const sectionTemplatesRaw = settingsStore.get(SECTION_TEMPLATE_SETTINGS_KEY);
  const savedSectionTemplates = useMemo<SectionTemplateRecord[]>(() => {
    const stored = parseJsonSetting<unknown>(sectionTemplatesRaw, []);
    return normalizeSectionTemplates(stored);
  }, [sectionTemplatesRaw]);

  const handleDeleteSectionTemplate = useCallback(
    (templateId: string): void => {
      const filtered = savedSectionTemplates.filter((record: SectionTemplateRecord) => record.id !== templateId);
      void updateSetting.mutateAsync({
        key: SECTION_TEMPLATE_SETTINGS_KEY,
        value: serializeSetting(filtered),
      });
    },
    [savedSectionTemplates, updateSetting]
  );

  return {
    savedGridTemplates,
    savedSectionTemplates,
    handleDeleteSectionTemplate,
  };
}
