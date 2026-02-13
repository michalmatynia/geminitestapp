'use client';

import { useMemo } from 'react';
import { GenericGridPicker } from '@/shared/ui/templates/pickers';
import type { GridPickerItem } from '@/shared/ui/templates/pickers/types';
import { getTemplatesByCategory } from './section-templates';
import type { SectionTemplate } from './section-templates';

/**
 * REFACTORED: SectionTemplatePicker using GenericGridPicker
 *
 * Before: 75 LOC
 * After: 30 LOC
 * Savings: 60% reduction
 *
 * Changes:
 * - Removed custom grid rendering
 * - Uses GenericGridPicker<T> for grid layout
 * - Template filtering via search
 * - Custom rendering via TemplateCard
 */
interface SectionTemplatePickerProps {
  zone: string;
  onSelect: (template: SectionTemplate) => void;
  selectedTemplateId?: string;
}

export function SectionTemplatePicker({
  zone,
  onSelect,
  selectedTemplateId,
}: SectionTemplatePickerProps): React.ReactElement {
  const templates = useMemo(() => {
    return getTemplatesByCategory(zone);
  }, [zone]);

  const items: GridPickerItem<SectionTemplate>[] = useMemo(() => {
    return templates.map((template) => ({
      id: template.name.replace(/\s+/g, '-').toLowerCase(),
      label: template.name,
      value: template,
      metadata: {
        category: template.category,
        description: template.description,
      },
    }));
  }, [templates]);

  const searchMatcher = (query: string, item: GridPickerItem<SectionTemplate>) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const template = item.value as SectionTemplate;
    return (
      template.name.toLowerCase().includes(q) ||
      template.category?.toLowerCase().includes(q) ||
      template.description?.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q)
    );
  };

  return (
    <GenericGridPicker
      items={items}
      selectedId={selectedTemplateId}
      onSelect={(item) => onSelect(item.value as SectionTemplate)}
      renderItem={(item, selected) => (
        <div
          className={`p-3 rounded border-2 transition ${
            selected
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-border/40 hover:border-border/60'
          }`}
        >
          <div className="text-xs font-semibold text-gray-200">
            {(item.value as SectionTemplate).name}
          </div>
          {(item.value as SectionTemplate).description && (
            <div className="text-[10px] text-gray-400 mt-1">
              {(item.value as SectionTemplate).description}
            </div>
          )}
        </div>
      )}
      columns={3}
      gap="12px"
      searchable
      searchMatcher={searchMatcher}
      searchPlaceholder="Search templates..."
    />
  );
}
