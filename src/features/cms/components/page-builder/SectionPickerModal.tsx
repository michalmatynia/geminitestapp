'use client';

import { Trash2 } from 'lucide-react';
import React, { createContext, useContext, useMemo } from 'react';

import type { SectionDefinition } from '@/shared/contracts/cms';
import type { ModalStateProps } from '@/shared/contracts/ui';
import type { GridPickerItem } from '@/shared/contracts/ui';
import { DetailModal } from '@/shared/ui/templates/modals';
import { GenericGridPicker } from '@/shared/ui/templates/pickers';
import { Button } from '@/shared/ui';

interface SectionTemplate {
  name: string;
  description?: string;
  create?: () => void;
}

interface SectionPickerModalProps extends ModalStateProps {
  primitives: SectionDefinition[];
  elements: SectionDefinition[];
  templates: SectionDefinition[];
  groupedTemplates: Record<string, SectionTemplate[]>;
  onSelect: (type: string) => void;
  onDeleteTemplate: (name: string) => void;
}

type SectionPickerSelectionContextValue = {
  onSelect: (sectionType: string) => void;
};

const SectionPickerSelectionContext = createContext<SectionPickerSelectionContextValue | null>(
  null
);

const useSectionPickerSelectionContext = (): SectionPickerSelectionContextValue => {
  const context = useContext(SectionPickerSelectionContext);
  if (!context) {
    throw new Error('useSectionPickerSelectionContext must be used within SectionPickerModal');
  }
  return context;
};

const renderBlockTypes = (blockTypes: string[]): React.ReactNode => {
  const items = blockTypes.slice(0, 4);
  const columns = Math.max(1, Math.min(items.length, 4));
  return (
    <div
      className='grid gap-1 rounded-md border border-border/40 bg-gray-900/60 p-2'
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.length === 0 ? (
        <div className='col-span-full h-6 rounded bg-gray-800/60' />
      ) : (
        items.map((type: string, idx: number) => (
          <div
            key={`${type}-${idx}`}
            className='flex h-6 items-center justify-center rounded bg-gray-800/60 text-[9px] uppercase tracking-wide text-gray-400'
          >
            {type}
          </div>
        ))
      )}
    </div>
  );
};

interface CategorySectionProps {
  title: string;
  items: SectionDefinition[];
}

const CategorySection = ({ title, items }: CategorySectionProps): React.ReactNode => {
  const { onSelect } = useSectionPickerSelectionContext();

  const pickerItems: GridPickerItem<SectionDefinition>[] = useMemo(
    () =>
      items.map((def) => ({
        id: def.type,
        label: def.label,
        value: def,
      })),
    [items]
  );

  if (items.length === 0) return null;

  return (
    <div>
      <div className='mb-2 text-xs font-medium uppercase tracking-wide text-gray-400'>{title}</div>
      <GenericGridPicker
        items={pickerItems}
        onSelect={(item) => {
          if (item.value) onSelect(item.value.type);
        }}
        renderItem={(item) => {
          const def = item.value;
          if (!def) return null;
          return (
            <div className='flex w-full flex-col gap-2 p-3 text-left'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-gray-200'>{def.label}</span>
                <span className='text-[10px] uppercase tracking-wide text-gray-500'>
                  {def.type}
                </span>
              </div>
              {renderBlockTypes(def.allowedBlockTypes)}
              <span className='text-xs text-gray-500'>
                {def.allowedBlockTypes.length > 0
                  ? `Blocks: ${def.allowedBlockTypes.join(', ')}`
                  : 'No blocks'}
              </span>
            </div>
          );
        }}
        columns={2}
        gap='12px'
      />
    </div>
  );
};

export function SectionPickerModal(props: SectionPickerModalProps): React.JSX.Element | null {
  const {
    isOpen,
    onClose,
    primitives,
    elements,
    templates,
    groupedTemplates,
    onSelect,
    onDeleteTemplate,
  } = props;

  return (
    <DetailModal isOpen={isOpen} onClose={onClose} title='Add a section' size='lg' footer={null}>
      <SectionPickerSelectionContext.Provider value={{ onSelect }}>
        <div className='space-y-6'>
          <CategorySection title='Primitives' items={primitives} />
          <CategorySection title='Elements' items={elements} />
          <CategorySection title='Templates' items={templates} />

          {Object.entries(groupedTemplates).length > 0 && (
            <div>
              <div className='mb-2 text-xs font-medium uppercase tracking-wide text-gray-400'>
                Saved templates
              </div>
              <div className='space-y-3'>
                {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                  <div key={category}>
                    {categoryTemplates.length > 0 && (
                      <div className='space-y-2'>
                        <div className='text-xs font-medium text-gray-300'>{category}</div>
                        <div className='grid gap-3 md:grid-cols-2'>
                          {categoryTemplates.map((template) => (
                            <div
                              key={template.name}
                              className='flex items-center justify-between rounded-md border border-border/50 bg-card/60 p-3'
                            >
                              <Button
                                variant='ghost'
                                onClick={() => {
                                  template.create?.();
                                  onSelect(template.name);
                                }}
                                className='flex-1 justify-start h-auto p-0 font-normal hover:bg-transparent transition text-left group'
                              >
                                <div>
                                  <span className='text-sm font-medium text-gray-200 group-hover:text-white transition'>
                                    {template.name}
                                  </span>
                                  <span className='block text-xs text-gray-500'>
                                    {template.description}
                                  </span>
                                </div>
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => onDeleteTemplate(template.name)}
                                className='ml-2 size-8 p-0 text-gray-400 hover:text-red-400'
                              >
                                <Trash2 className='size-4' />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionPickerSelectionContext.Provider>
    </DetailModal>
  );
}
