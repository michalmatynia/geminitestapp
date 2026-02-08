'use client';

import { BookTemplate } from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui';

import { getTemplatesByCategory, type SectionTemplate } from './section-templates';
import { usePageBuilder } from '../../hooks/usePageBuilderContext';

import type { PageZone } from '../../types/page-builder';

interface SectionTemplatePickerProps {
  zone: PageZone;
  disabled?: boolean;
}

export function SectionTemplatePicker({ zone, disabled }: SectionTemplatePickerProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const { dispatch } = usePageBuilder();
  const grouped = getTemplatesByCategory(zone);

  const handleInsert = useCallback(
    (template: SectionTemplate) => {
      const section = template.create();
      section.zone = zone;
      dispatch({ type: 'INSERT_TEMPLATE_SECTION', section });
      setIsOpen(false);
    },
    [zone, dispatch]
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size='sm'
          variant='outline'
          className='h-7 gap-1.5 text-xs'
          disabled={disabled}
        >
          <BookTemplate className='size-3.5' />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-lg max-h-[70vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Section Templates</DialogTitle>
        </DialogHeader>
        <div className='space-y-5 pt-2'>
          {Object.entries(grouped).map(([category, templates]: [string, SectionTemplate[]]) => (
            <div key={category}>
              <h3 className='mb-2 text-xs font-medium uppercase tracking-wide text-gray-400'>
                {category}
              </h3>
              <div className='space-y-2'>
                {templates.map((template: SectionTemplate) => (
                  <button
                    key={template.name}
                    type='button'
                    onClick={() => handleInsert(template)}
                    className='flex w-full flex-col gap-0.5 rounded-md border border-border/50 p-3 text-left transition hover:bg-foreground/5'
                  >
                    <span className='text-sm font-medium text-gray-200'>{template.name}</span>
                    <span className='text-xs text-gray-500'>{template.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
