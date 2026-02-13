'use client';

import { Plus, Trash2 } from 'lucide-react';
import React, { createContext, useCallback, useContext, useState } from 'react';

import { AppModal, Button } from '@/shared/ui';

import { useGroupedTemplates } from './hooks/useGroupedTemplates';
import { useTemplateManagement } from './hooks/useTemplateManagement';

import type { PageZone, SectionDefinition } from '../../types/page-builder';

interface SectionPickerProps {
  disabled?: boolean;
  zone: PageZone;
  onSelect: (sectionType: string) => void;
}

type SectionPickerSelectionContextValue = {
  onSelect: (sectionType: string) => void;
};

const SectionPickerSelectionContext =
  createContext<SectionPickerSelectionContextValue | null>(null);

const useSectionPickerSelectionContext = (): SectionPickerSelectionContextValue => {
  const context = useContext(SectionPickerSelectionContext);
  if (!context) {
    throw new Error('useSectionPickerSelectionContext must be used within SectionPicker');
  }
  return context;
};

const renderBlockTypes = (blockTypes: string[]): React.ReactNode => {
  const items = blockTypes.slice(0, 4);
  const columns = Math.max(1, Math.min(items.length, 4));
  return (
    <div className='grid gap-1 rounded-md border border-border/40 bg-gray-900/60 p-2' style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.length === 0 ? (
        <div className='col-span-full h-6 rounded bg-gray-800/60' />
      ) : (
        items.map((type: string, idx: number) => (
          <div key={`${type}-${idx}`} className='flex h-6 items-center justify-center rounded bg-gray-800/60 text-[9px] uppercase tracking-wide text-gray-400'>
            {type}
          </div>
        ))
      )}
    </div>
  );
};

const SectionCard = ({ def }: { def: SectionDefinition }): React.ReactNode => {
  const { onSelect } = useSectionPickerSelectionContext();
  return (
    <button
      type='button'
      onClick={() => onSelect(def.type)}
      className='flex w-full flex-col gap-2 rounded-md border border-border/50 bg-card/60 p-3 text-left transition hover:bg-foreground/5'
    >
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-gray-200'>{def.label}</span>
        <span className='text-[10px] uppercase tracking-wide text-gray-500'>{def.type}</span>
      </div>
      {renderBlockTypes(def.allowedBlockTypes)}
      <span className='text-xs text-gray-500'>{def.allowedBlockTypes.length > 0 ? `Blocks: ${def.allowedBlockTypes.join(', ')}` : 'No blocks'}</span>
    </button>
  );
};

interface CategorySectionProps {
  title: string;
  items: SectionDefinition[];
}

const CategorySection = ({ title, items }: CategorySectionProps): React.ReactNode =>
  items.length > 0 ? (
    <div>
      <div className='mb-2 text-xs font-medium uppercase tracking-wide text-gray-400'>{title}</div>
      <div className='grid gap-3 md:grid-cols-2'>
        {items.map((def: SectionDefinition) => (
          <SectionCard key={def.type} def={def} />
        ))}
      </div>
    </div>
  ) : null;

export function SectionPicker({ disabled, zone, onSelect }: SectionPickerProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const { savedGridTemplates, savedSectionTemplates, handleDeleteSectionTemplate } = useTemplateManagement();
  const { primitives, elements, templates, groupedTemplates } = useGroupedTemplates(zone, savedGridTemplates, savedSectionTemplates);

  const handleSelect = useCallback(
    (type: string) => {
      onSelect(type);
      setIsOpen(false);
    },
    [onSelect]
  );

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
      <AppModal open={isOpen} onClose={() => setIsOpen(false)} title='Add a section' size='lg' bodyClassName='h-[70vh]' header={
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold text-white'>Add a section</h2>
          <Button type='button' onClick={() => setIsOpen(false)} className='min-w-[100px] border border-white/20 hover:border-white/40'>
            Close
          </Button>
        </div>
      }>
        <SectionPickerSelectionContext.Provider value={{ onSelect: handleSelect }}>
          <div className='space-y-6'>
            <CategorySection title='Primitives' items={primitives} />
            <CategorySection title='Elements' items={elements} />
            <CategorySection title='Templates' items={templates} />

            {Object.entries(groupedTemplates).length > 0 && (
              <div>
                <div className='mb-2 text-xs font-medium uppercase tracking-wide text-gray-400'>Saved templates</div>
                <div className='space-y-3'>
                  {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                    <div key={category}>
                      {categoryTemplates.length > 0 && (
                        <div className='space-y-2'>
                          <div className='text-xs font-medium text-gray-300'>{category}</div>
                          <div className='grid gap-3 md:grid-cols-2'>
                            {categoryTemplates.map((template) => (
                              <div key={template.name} className='flex items-center justify-between rounded-md border border-border/50 bg-card/60 p-3'>
                                <button
                                  type='button'
                                  onClick={() => {
                                    template.create?.();
                                    handleSelect(template.name);
                                  }}
                                  className='flex-1 text-left transition hover:text-gray-100'
                                >
                                  <span className='text-sm font-medium text-gray-200'>{template.name}</span>
                                  <span className='block text-xs text-gray-500'>{template.description}</span>
                                </button>
                                <button type='button' onClick={() => handleDeleteSectionTemplate(template.name)} className='ml-2 text-gray-400 hover:text-red-400'>
                                  <Trash2 className='size-4' />
                                </button>
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
      </AppModal>
    </>
  );
}
