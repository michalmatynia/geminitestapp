'use client';

import { Plus, Trash2 } from 'lucide-react';
import React, { useMemo, useState, useCallback } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { AppModal, Button } from '@/shared/ui';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import {
  GRID_TEMPLATE_SETTINGS_KEY,
  normalizeGridTemplates,
  cloneGridTemplateSection,
  type GridTemplateRecord,
} from './grid-templates';
import { getSectionTypesForZone } from './section-registry';
import {
  SECTION_TEMPLATE_SETTINGS_KEY,
  normalizeSectionTemplates,
  cloneSectionTemplateSection,
  type SectionTemplateRecord,
} from './section-template-store';
import { getTemplatesByCategory, type SectionTemplate } from './section-templates';
import { usePageBuilder } from '../../hooks/usePageBuilderContext';

import type { BlockInstance, PageZone, SectionDefinition } from '../../types/page-builder';

interface SectionPickerProps {
  disabled?: boolean;
  zone: PageZone;
  onSelect: (sectionType: string) => void;
}

type TemplateWithMeta = {
  template: SectionTemplate;
  blockTypes: string[];
  sectionType: string;
  templateRecordId?: string;
};

/**
 * Manages saved section/grid templates with create/read/delete operations.
 */
function useTemplateManagement() {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();

  const savedGridTemplates = useMemo<GridTemplateRecord[]>(() => {
    const raw = settingsStore.get(GRID_TEMPLATE_SETTINGS_KEY);
    const stored = parseJsonSetting<unknown>(raw, []);
    return normalizeGridTemplates(stored);
  }, [settingsStore]);

  const savedSectionTemplates = useMemo<SectionTemplateRecord[]>(() => {
    const raw = settingsStore.get(SECTION_TEMPLATE_SETTINGS_KEY);
    const stored = parseJsonSetting<unknown>(raw, []);
    return normalizeSectionTemplates(stored);
  }, [settingsStore]);

  const deleteTemplate = useCallback(
    (templateId: string): void => {
      const filtered = savedSectionTemplates.filter((r) => r.id !== templateId);
      void updateSetting.mutateAsync({
        key: SECTION_TEMPLATE_SETTINGS_KEY,
        value: serializeSetting(filtered),
      });
    },
    [savedSectionTemplates, updateSetting]
  );

  return { savedGridTemplates, savedSectionTemplates, deleteTemplate };
}

/**
 * Groups section types and templates by category.
 */
function useGroupedItems(
  zone: PageZone,
  gridAllowed: boolean,
  savedGridTemplates: GridTemplateRecord[],
  savedSectionTemplates: SectionTemplateRecord[]
) {
  const primitiveTypes = useMemo(() => new Set(['Grid', 'Block']), []);
  const elementTypes = useMemo(() => new Set(['TextElement', 'TextAtom', 'ImageElement', 'Model3DElement', 'ButtonElement']), []);
  const sectionTypes = useMemo(() => getSectionTypesForZone(zone), [zone]);

  const primitives = useMemo(
    () => sectionTypes.filter((d: SectionDefinition) => primitiveTypes.has(d.type)),
    [sectionTypes, primitiveTypes]
  );

  const elements = useMemo(
    () => sectionTypes.filter((d: SectionDefinition) => elementTypes.has(d.type)),
    [sectionTypes, elementTypes]
  );

  const templates = useMemo(
    () => sectionTypes.filter((d: SectionDefinition) => !primitiveTypes.has(d.type) && !elementTypes.has(d.type)),
    [sectionTypes, primitiveTypes, elementTypes]
  );

  const baseTemplates = useMemo(() => getTemplatesByCategory(zone), [zone]);

  const groupedTemplates = useMemo(() => {
    const result: Record<string, SectionTemplate[]> = { ...baseTemplates };

    if (gridAllowed && savedGridTemplates.length > 0) {
      result['Saved grids'] = savedGridTemplates.map((r: GridTemplateRecord) => ({
        name: r.name,
        description: r.description || 'Saved grid template',
        category: 'Saved grids',
        create: () => cloneGridTemplateSection(r.section),
      }));
    }

    if (savedSectionTemplates.length > 0) {
      for (const r of savedSectionTemplates) {
        const cat = r.category || 'Saved sections';
        if (!result[cat]) result[cat] = [];
        result[cat].push({
          name: r.name,
          description: r.description || `Saved ${r.sectionType} template`,
          category: cat,
          create: () => cloneSectionTemplateSection(r.section),
        });
      }
    }

    return result;
  }, [baseTemplates, gridAllowed, savedGridTemplates, savedSectionTemplates]);

  return { primitives, elements, templates, groupedTemplates };
}

export function SectionPicker({ disabled, zone, onSelect }: SectionPickerProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const { dispatch } = usePageBuilder();
  const { savedGridTemplates, savedSectionTemplates, deleteTemplate } = useTemplateManagement();
  const gridAllowed = useMemo(
    () => getSectionTypesForZone(zone).some((d: SectionDefinition) => d.type === 'Grid'),
    [zone]
  );
  const { primitives, elements, templates, groupedTemplates } = useGroupedItems(
    zone,
    gridAllowed,
    savedGridTemplates,
    savedSectionTemplates
  );

  const sectionTemplateIdByName = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    for (const r of savedSectionTemplates) {
      map.set(`${r.category}::${r.name}`, r.id);
    }
    return map;
  }, [savedSectionTemplates]);

  const templatePreviewGroups = useMemo(() => {
    if (!isOpen) return [];
    return Object.entries(groupedTemplates).map(([category, items]: [string, SectionTemplate[]]) => ({
      category,
      templates: items.map((t: SectionTemplate) => {
        const section = t.create();
        const blockTypes = section.blocks?.map((b: BlockInstance) => b.type) ?? [];
        const templateRecordId = sectionTemplateIdByName.get(`${category}::${t.name}`);
        return { template: t, blockTypes, sectionType: section.type, templateRecordId };
      }),
    }));
  }, [groupedTemplates, isOpen, sectionTemplateIdByName]);

  const handleSelect = useCallback(
    (type: string) => {
      onSelect(type);
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleInsertTemplate = useCallback(
    (template: SectionTemplate) => {
      const section = template.create();
      section.zone = zone;
      dispatch({ type: 'INSERT_TEMPLATE_SECTION', section });
      setIsOpen(false);
    },
    [dispatch, zone]
  );

  const renderPreview = (blockTypes: string[]): React.ReactNode => {
    const items = blockTypes.slice(0, 4);
    const cols = Math.max(1, Math.min(items.length, 4));
    return (
      <div
        className='grid gap-1 rounded-md border border-border/40 bg-gray-900/60 p-2'
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {items.length === 0 ? (
          <div className='col-span-full h-6 rounded bg-gray-800/60' />
        ) : (
          items.map((type: string, i: number) => (
            <div
              key={`${type}-${i}`}
              className='flex h-6 items-center justify-center rounded bg-gray-800/60 text-[9px] uppercase tracking-wide text-gray-400'
            >
              {type}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <Button
        size='sm'
        variant='outline'
        className='h-7 gap-1.5 border-border/60 bg-card/40 text-xs text-gray-300 hover:bg-foreground/5 hover:text-gray-100'
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        <Plus className='size-3.5' />
        Add section
      </Button>
      <AppModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title='Add a section'
        size='lg'
        bodyClassName='h-[70vh]'
        header={
          <div className='flex items-center justify-between'>
            <h2 className='text-2xl font-bold text-white'>Add a section</h2>
            <Button
              type='button'
              onClick={() => setIsOpen(false)}
              className='min-w-[100px] border border-white/20 hover:border-white/40'
            >
              Close
            </Button>
          </div>
        }
      >
        <div className='space-y-6'>
          {primitives.length > 0 && (
            <Section title='Primitives' items={primitives} renderPreview={renderPreview} onSelect={handleSelect} />
          )}

          {elements.length > 0 && (
            <Section title='Elements' items={elements} renderPreview={renderPreview} onSelect={handleSelect} />
          )}

          {templates.length > 0 && (
            <Section title='Templates' items={templates} renderPreview={renderPreview} onSelect={handleSelect} />
          )}

          {templatePreviewGroups.length > 0 && (
            <div>
              <div className='mb-2 text-xs font-medium uppercase tracking-wide text-gray-400'>
                Saved Templates
              </div>
              <div className='space-y-4'>
                {templatePreviewGroups.map((group) => (
                  <div key={group.category}>
                    <div className='mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500'>
                      {group.category}
                    </div>
                    <div className='grid gap-3 md:grid-cols-2'>
                      {group.templates.map(
                        ({ template, blockTypes, sectionType, templateRecordId }: TemplateWithMeta) => (
                          <div key={template.name} className='relative'>
                            <button
                              type='button'
                              onClick={() => handleInsertTemplate(template)}
                              className='flex w-full flex-col gap-2 rounded-md border border-border/50 bg-card/60 p-3 text-left transition hover:bg-foreground/5'
                            >
                              <div className='flex items-center justify-between'>
                                <span className='text-sm font-medium text-gray-200'>{template.name}</span>
                                <span className='text-[10px] uppercase tracking-wide text-gray-500'>
                                  {sectionType}
                                </span>
                              </div>
                              <span className='text-xs text-gray-500'>{template.description}</span>
                              {renderPreview(blockTypes)}
                            </button>
                            {templateRecordId && (
                              <button
                                type='button'
                                onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                                  e.stopPropagation();
                                  deleteTemplate(templateRecordId);
                                }}
                                className='absolute right-1.5 top-1.5 rounded p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition'
                                title='Delete saved template'
                                aria-label='Delete saved template'
                              >
                                <Trash2 className='size-3.5' />
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AppModal>
    </>
  );
}

/**
 * Reusable section renderer for primitives/elements/templates.
 */
function Section({
  title,
  items,
  renderPreview,
  onSelect,
}: {
  title: string;
  items: SectionDefinition[];
  renderPreview: (blockTypes: string[]) => React.ReactNode;
  onSelect: (type: string) => void;
}): React.ReactNode {
  return (
    <div>
      <div className='mb-2 text-xs font-medium uppercase tracking-wide text-gray-400'>
        {title}
      </div>
      <div className='grid gap-3 md:grid-cols-2'>
        {items.map((def: SectionDefinition) => (
          <button
            key={def.type}
            type='button'
            onClick={() => onSelect(def.type)}
            className='flex w-full flex-col gap-2 rounded-md border border-border/50 bg-card/60 p-3 text-left transition hover:bg-foreground/5'
          >
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium text-gray-200'>{def.label}</span>
              <span className='text-[10px] uppercase tracking-wide text-gray-500'>
                {def.type}
              </span>
            </div>
            {renderPreview(def.allowedBlockTypes)}
            <span className='text-xs text-gray-500'>
              {def.allowedBlockTypes.length > 0
                ? `Blocks: ${def.allowedBlockTypes.join(', ')}`
                : 'No blocks'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
