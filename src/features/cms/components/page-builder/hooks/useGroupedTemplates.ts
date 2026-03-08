import { useMemo } from 'react';

import { cloneGridTemplateSection, type GridTemplateRecord } from '../grid-templates';
import { getSectionTypesForZone } from '../section-registry';
import { cloneSectionTemplateSection, type SectionTemplateRecord } from '../section-template-store';
import { getTemplatesByCategory, type SectionTemplate } from '../section-templates';

import type { PageZone, SectionDefinition } from '@/features/cms/types/page-builder';

export function useGroupedTemplates(
  zone: PageZone,
  savedGridTemplates: GridTemplateRecord[],
  savedSectionTemplates: SectionTemplateRecord[]
) {
  const sectionTypes = useMemo(() => getSectionTypesForZone(zone), [zone]);
  const primitiveTypes = useMemo(() => new Set(['Grid', 'Block']), []);
  const elementTypes = useMemo(
    () => new Set(['TextElement', 'TextAtom', 'ImageElement', 'Model3DElement', 'ButtonElement']),
    []
  );
  const gridAllowed = useMemo(
    () => sectionTypes.some((def: SectionDefinition) => def.type === 'Grid'),
    [sectionTypes]
  );

  const primitives = useMemo(
    () => sectionTypes.filter((def: SectionDefinition) => primitiveTypes.has(def.type)),
    [sectionTypes, primitiveTypes]
  );

  const elements = useMemo(
    () => sectionTypes.filter((def: SectionDefinition) => elementTypes.has(def.type)),
    [sectionTypes, elementTypes]
  );

  const templates = useMemo(
    () =>
      sectionTypes.filter(
        (def: SectionDefinition) => !primitiveTypes.has(def.type) && !elementTypes.has(def.type)
      ),
    [sectionTypes, primitiveTypes, elementTypes]
  );

  const groupedTemplates = useMemo(() => {
    const base = getTemplatesByCategory(zone);
    const result: Record<string, SectionTemplate[]> = {};

    if (gridAllowed && savedGridTemplates.length > 0) {
      const savedGrids: SectionTemplate[] = savedGridTemplates.map(
        (record: GridTemplateRecord) => ({
          name: record.name,
          description:
            record.description && record.description.length > 0
              ? record.description
              : 'Saved grid template',
          category: 'Saved grids',
          create: () => cloneGridTemplateSection(record.section),
        })
      );
      result['Saved grids'] = savedGrids;
    }

    if (savedSectionTemplates.length > 0) {
      for (const record of savedSectionTemplates) {
        const category = record.category || 'Saved sections';
        if (!result[category]) {
          result[category] = [];
        }
        result[category].push({
          name: record.name,
          description:
            record.description && record.description.length > 0
              ? record.description
              : `Saved ${record.sectionType} template`,
          category,
          create: () => cloneSectionTemplateSection(record.section),
        });
      }
    }

    return { ...base, ...result };
  }, [zone, gridAllowed, savedGridTemplates, savedSectionTemplates]);

  return {
    sectionTypes,
    primitives,
    elements,
    templates,
    groupedTemplates,
  };
}
