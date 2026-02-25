'use client';

import React, { useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Input, useToast } from '@/shared/ui';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';
import { logClientError } from '@/features/observability';

import { SettingsFormProvider } from './SettingsFormContext';
import { prependManagementFields, groupSettingsFields, renderFieldGroups } from './field-group-helpers';
import { getSectionDefinition } from '../section-registry';
import { SECTION_TEMPLATE_SETTINGS_KEY, normalizeSectionTemplates, type SectionTemplateRecord } from '../section-template-store';
import { GRID_TEMPLATE_SETTINGS_KEY, normalizeGridTemplates } from '../grid-templates';
import { usePageBuilderSelection, usePageBuilderDispatch } from '../../hooks/usePageBuilderContext';
import { useComponentSettingsContext } from '../context/ComponentSettingsContext';

export function SectionSettingsTab(): React.JSX.Element | null {
  const dispatch = usePageBuilderDispatch();
  const { selectedSection } = usePageBuilderSelection();
  const { handleSectionSettingChange } = useComponentSettingsContext();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const [sectionTemplateName, setSectionTemplateName] = useState<string>('');
  const [sectionTemplateCategory, setSectionTemplateCategory] = useState<string>('');

  const handleSectionSettingChangeWithGridColumns = useCallback((key: string, value: unknown): void => {
    if (!selectedSection) return;
    if (key === 'columns' && selectedSection.type === 'Grid') dispatch({ type: 'SET_GRID_COLUMNS', sectionId: selectedSection.id, columnCount: value as number });
    else if (key === 'rows' && selectedSection.type === 'Grid') dispatch({ type: 'SET_GRID_ROWS', sectionId: selectedSection.id, rowCount: value as number });
    else handleSectionSettingChange(key, value);
  }, [selectedSection, dispatch, handleSectionSettingChange]);

  const handleRemoveSection = useCallback(() => selectedSection && dispatch({ type: 'REMOVE_SECTION', sectionId: selectedSection.id }), [selectedSection, dispatch]);
  const handleCopySection = useCallback(() => selectedSection && dispatch({ type: 'COPY_SECTION', sectionId: selectedSection.id }), [selectedSection, dispatch]);
  const handleDuplicateSection = useCallback(() => selectedSection && dispatch({ type: 'DUPLICATE_SECTION', sectionId: selectedSection.id }), [selectedSection, dispatch]);

  const handleSaveSectionTemplate = useCallback(async (): Promise<void> => {
    if (!selectedSection) return;
    const sectionTemplates = normalizeSectionTemplates(parseJsonSetting(settingsStore.get(SECTION_TEMPLATE_SETTINGS_KEY), []));
    const gridTemplates = normalizeGridTemplates(parseJsonSetting(settingsStore.get(GRID_TEMPLATE_SETTINGS_KEY), []));
    const name = sectionTemplateName.trim() || `${selectedSection.type} template ${sectionTemplates.length + 1}`;
    const category = sectionTemplateCategory.trim() || 'Saved sections';
    const sectionClone = structuredClone({ ...selectedSection, zone: 'template' as const });
    const nextRecord: SectionTemplateRecord = { id: `section-${Date.now()}`, name, description: '', category, sectionType: selectedSection.type, createdAt: new Date().toISOString(), section: sectionClone };
    try {
      const promises = [updateSetting.mutateAsync({ key: SECTION_TEMPLATE_SETTINGS_KEY, value: serializeSetting([...sectionTemplates, nextRecord]) })];
      if (selectedSection.type === 'Grid') promises.push(updateSetting.mutateAsync({ key: GRID_TEMPLATE_SETTINGS_KEY, value: serializeSetting([...gridTemplates, { id: `grid-${Date.now()}`, name, description: '', createdAt: new Date().toISOString(), section: sectionClone }]) }));
      await Promise.all(promises);
      setSectionTemplateName(''); setSectionTemplateCategory('');
      toast('Section saved as template.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'SectionSettingsTab', action: 'saveSectionTemplate' } });
      toast('Failed to save section template.', { variant: 'error' });
    }
  }, [selectedSection, sectionTemplateName, sectionTemplateCategory, settingsStore, updateSetting, toast]);

  if (!selectedSection) return null;
  const sectionDef = getSectionDefinition(selectedSection.type);
  if (!sectionDef) return null;

  return (
    <SettingsFormProvider values={selectedSection.settings} onChange={handleSectionSettingChangeWithGridColumns}>
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-2'>
          <Button onClick={handleCopySection} variant='outline' size='sm' className='text-xs'>Copy</Button>
          <Button onClick={handleDuplicateSection} variant='outline' size='sm' className='text-xs'>Duplicate</Button>
        </div>
        {renderFieldGroups(groupSettingsFields(selectedSection.type === 'Grid' ? prependManagementFields(sectionDef.settingsSchema) : sectionDef.settingsSchema))}
        <div className='rounded border border-border/40 bg-gray-900/40 p-3'>
          <div className='flex gap-2'>
            <Input value={sectionTemplateName} onChange={(e) => setSectionTemplateName(e.target.value)} placeholder='Name' className='h-8 text-xs' />
            <Input value={sectionTemplateCategory} onChange={(e) => setSectionTemplateCategory(e.target.value)} placeholder='Cat' className='h-8 text-xs' />
          </div>
          <Button onClick={() => void handleSaveSectionTemplate()} size='sm' className='mt-2 w-full h-8' disabled={updateSetting.isPending}>Save Template</Button>
        </div>
        <Button onClick={handleRemoveSection} variant='destructive' size='sm' className='w-full'><Trash2 className='mr-2 size-4' />Remove Section</Button>
      </div>
    </SettingsFormProvider>
  );
}
