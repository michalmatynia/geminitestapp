'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { useAdminMenuSettings } from '../../context/AdminMenuSettingsContext';
import { FormSection, FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { ADMIN_MENU_COLORS } from '@/features/admin/components/menu/admin-menu-constants';
import type { IdLabelOptionDto, LabeledOptionDto } from '@/shared/contracts/base';

type ColorOption = (typeof ADMIN_MENU_COLORS)[number];
const SECTION_COLOR_OPTIONS: Array<LabeledOptionDto<string>> = [
  { value: 'none', label: 'None' },
  ...ADMIN_MENU_COLORS.map((option: ColorOption) => ({
    value: option.value,
    label: option.label,
  })),
];

export function SectionColorsSection(): React.JSX.Element {
  const {
    sections,
    sectionColors,
    updateSectionColor,
  } = useAdminMenuSettings();

  return (
    <FormSection
      title='Section Colors'
      description='Customize highlighting for top-level menu groups.'
      actions={<Menu className='size-4 text-sky-400' />}
      className='p-6'
      variant='subtle'
    >
      <div className='grid gap-4 sm:grid-cols-2'>
        {sections.map((section: IdLabelOptionDto) => (
          <FormField key={section.id} label={section.label}>
            <SelectSimple
              value={sectionColors[section.id] ?? 'none'}
              onValueChange={(val: string) => updateSectionColor(section.id, val)}
              options={SECTION_COLOR_OPTIONS}
              className='h-8 bg-gray-900/40 text-xs'
            />
          </FormField>
        ))}
      </div>
    </FormSection>
  );
}
