import { useMemo } from 'react';

import type {
  BlockInstance,
  PageZone,
  SectionDefinition,
  SectionInstance,
} from '@/features/cms/types/page-builder';

import { cloneGridTemplateSection, type GridTemplateRecord } from '../grid-templates';
import { usePageBuilderPolicy } from '../PageBuilderPolicyContext';
import { getSectionTypesForZone } from '../section-registry';
import { cloneSectionTemplateSection, type SectionTemplateRecord } from '../section-template-store';
import { getTemplatesByCategory, type SectionTemplate } from '../section-templates';

const sectionContainsOnlyAllowedTypes = (
  section: SectionInstance,
  isSectionTypeAvailable: (sectionType: string) => boolean,
  isBlockTypeAvailable: (blockType: string) => boolean
): boolean => {
  if (!isSectionTypeAvailable(section.type)) {
    return false;
  }

  const traverseBlocks = (blocks: BlockInstance[]): boolean =>
    blocks.every(
      (block: BlockInstance) =>
        isBlockTypeAvailable(block.type) &&
        (!block.blocks || block.blocks.length === 0 || traverseBlocks(block.blocks))
    );

  return traverseBlocks(section.blocks);
};

export function useGroupedTemplates(
  zone: PageZone,
  savedGridTemplates: GridTemplateRecord[],
  savedSectionTemplates: SectionTemplateRecord[]
) {
  const policy = usePageBuilderPolicy();
  const sectionTypes = useMemo(
    () => policy.filterSectionDefinitions(getSectionTypesForZone(zone), { zone }),
    [policy, zone]
  );
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
    const allowTemplateSection = (section: SectionInstance): boolean =>
      sectionContainsOnlyAllowedTypes(
        section,
        policy.isSectionTypeAvailable,
        policy.isBlockTypeAvailable
      );
    const allowedGridTemplates = savedGridTemplates.filter((record: GridTemplateRecord) =>
      allowTemplateSection(record.section)
    );
    const allowedSectionTemplates = savedSectionTemplates.filter((record: SectionTemplateRecord) =>
      allowTemplateSection(record.section)
    );

    if (gridAllowed && allowedGridTemplates.length > 0) {
      const savedGrids: SectionTemplate[] = allowedGridTemplates.map(
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

    if (allowedSectionTemplates.length > 0) {
      for (const record of allowedSectionTemplates) {
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
  }, [gridAllowed, policy, savedGridTemplates, savedSectionTemplates, zone]);

  return {
    sectionTypes,
    primitives,
    elements,
    templates,
    groupedTemplates,
  };
}
