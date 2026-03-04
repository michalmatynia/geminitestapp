import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { buildHierarchyIndexes } from '@/features/cms/hooks/page-builder/section-hierarchy';

import type { PageZone, SectionInstance } from '../../../types/page-builder';

const CMS_ZONE_NODE_PREFIX = 'cms-zone:';
const CMS_SECTION_NODE_PREFIX = 'cms-section:';
const CMS_ZONE_FOOTER_NODE_PREFIX = 'cms-zone-footer:';

export const CMS_ZONE_LABELS: Record<PageZone, string> = {
  header: 'Header',
  template: 'Template',
  footer: 'Footer',
};

export const CMS_ZONE_ORDER: PageZone[] = ['header', 'template', 'footer'];

export type CmsMasterNodeRef =
  | {
      entity: 'zone';
      id: PageZone;
      nodeId: string;
    }
  | {
      entity: 'section';
      id: string;
      nodeId: string;
    };

export const toCmsZoneNodeId = (zone: PageZone): string => `${CMS_ZONE_NODE_PREFIX}${zone}`;

export const toCmsSectionNodeId = (sectionId: string): string =>
  `${CMS_SECTION_NODE_PREFIX}${sectionId}`;

export const toCmsZoneFooterNodeId = (zone: PageZone): string =>
  `${CMS_ZONE_FOOTER_NODE_PREFIX}${zone}`;

export const fromCmsSectionNodeId = (value: string): string | null =>
  value.startsWith(CMS_SECTION_NODE_PREFIX) ? value.slice(CMS_SECTION_NODE_PREFIX.length) : null;

export const fromCmsZoneNodeId = (value: string): PageZone | null => {
  if (!value.startsWith(CMS_ZONE_NODE_PREFIX)) return null;
  const zone = value.slice(CMS_ZONE_NODE_PREFIX.length);
  return CMS_ZONE_ORDER.includes(zone as PageZone) ? (zone as PageZone) : null;
};

export const fromCmsZoneFooterNodeId = (value: string): PageZone | null => {
  if (!value.startsWith(CMS_ZONE_FOOTER_NODE_PREFIX)) return null;
  const zone = value.slice(CMS_ZONE_FOOTER_NODE_PREFIX.length);
  return CMS_ZONE_ORDER.includes(zone as PageZone) ? (zone as PageZone) : null;
};

export const decodeCmsMasterNodeId = (value: string): CmsMasterNodeRef | null => {
  const zone = fromCmsZoneNodeId(value);
  if (zone) {
    return {
      entity: 'zone',
      id: zone,
      nodeId: value,
    };
  }

  const sectionId = fromCmsSectionNodeId(value);
  if (sectionId) {
    return {
      entity: 'section',
      id: sectionId,
      nodeId: value,
    };
  }

  return null;
};

const getSectionNodeLabel = (section: SectionInstance): string => {
  const settings =
    section.settings && typeof section.settings === 'object' ? section.settings : null;
  const customLabel = settings?.['label'];
  if (typeof customLabel === 'string' && customLabel.trim().length > 0) {
    return customLabel.trim();
  }
  return section.type;
};

export const buildCmsMasterNodes = (sections: SectionInstance[]): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];
  const hierarchy = buildHierarchyIndexes(sections);

  CMS_ZONE_ORDER.forEach((zone: PageZone, zoneIndex: number) => {
    const zoneNodeId = toCmsZoneNodeId(zone);
    const zoneLabel = CMS_ZONE_LABELS[zone];
    const rootSectionIds = (hierarchy.childrenByParent.get(null) ?? []).filter(
      (sectionId: string) => {
        const section = hierarchy.nodeById.get(sectionId);
        return section?.zone === zone;
      }
    );

    nodes.push({
      id: zoneNodeId,
      type: 'folder',
      kind: 'zone',
      parentId: null,
      name: zoneLabel,
      path: zone,
      sortOrder: zoneIndex,
      metadata: { entity: 'zone', zone },
    });

    const pushSectionNode = (
      sectionId: string,
      parentNodeId: string,
      parentPath: string,
      sortOrder: number
    ): void => {
      const section = hierarchy.nodeById.get(sectionId);
      if (!section) return;
      const sectionNodeId = toCmsSectionNodeId(section.id);

      nodes.push({
        id: sectionNodeId,
        type: 'folder',
        kind: 'section',
        parentId: parentNodeId,
        name: getSectionNodeLabel(section),
        path: `${parentPath}/${section.id}`,
        sortOrder,
        metadata: {
          entity: 'section',
          zone: section.zone,
          sectionId: section.id,
          parentSectionId: section.parentSectionId ?? null,
        },
      });

      const childIds = hierarchy.childrenByParent.get(section.id) ?? [];
      childIds.forEach((childId: string, childIndex: number) => {
        pushSectionNode(childId, sectionNodeId, `${parentPath}/${section.id}`, childIndex);
      });
    };

    rootSectionIds.forEach((sectionId: string, sectionIndex: number) => {
      pushSectionNode(sectionId, zoneNodeId, zone, sectionIndex);
    });

    nodes.push({
      id: toCmsZoneFooterNodeId(zone),
      type: 'file',
      kind: 'zone_footer',
      parentId: zoneNodeId,
      name: `${zoneLabel} controls`,
      path: `${zone}/controls`,
      sortOrder: rootSectionIds.length,
      metadata: { entity: 'zone_footer', zone },
    });
  });

  return nodes;
};
