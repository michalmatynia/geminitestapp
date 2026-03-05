'use client';

import { Plus } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import { Button } from '@/shared/ui';

import { useGroupedTemplates } from './hooks/useGroupedTemplates';
import { useTemplateManagement } from './hooks/useTemplateManagement';
import { SectionPickerModal } from './SectionPickerModal';

import type { PageZone } from '../../types/page-builder';

interface SectionPickerProps {
  disabled?: boolean;
  zone: PageZone;
  onSelect: (sectionType: string) => void;
}

export function SectionPicker({ disabled, zone, onSelect }: SectionPickerProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const { savedGridTemplates, savedSectionTemplates, handleDeleteSectionTemplate } =
    useTemplateManagement();
  const { primitives, elements, templates, groupedTemplates } = useGroupedTemplates(
    zone,
    savedGridTemplates,
    savedSectionTemplates
  );

  const handleSelect = useCallback(
    (type: string) => {
      onSelect(type);
      setIsOpen(false);
    },
    [onSelect]
  );
  const addSectionDisabled = Boolean(disabled);

  return (
    <>
      <Button
        size='sm'
        variant='outline'
        className='h-7 gap-1.5 border-border/60 bg-card/40 text-xs text-gray-300 hover:bg-foreground/5 hover:text-gray-100'
        disabled={addSectionDisabled}
        onClick={() => setIsOpen(true)}
      >
        <Plus className='size-3.5' />
        Add section
      </Button>
      <SectionPickerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {}}
        primitives={primitives}
        elements={elements}
        templates={templates}
        groupedTemplates={groupedTemplates}
        onSelect={handleSelect}
        onDeleteTemplate={handleDeleteSectionTemplate}
      />
    </>
  );
}
