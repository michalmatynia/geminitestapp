import { describe, expect, it } from 'vitest';

import {
  buildCmsMasterNodes,
  decodeCmsMasterNodeId,
  fromCmsSectionNodeId,
  fromCmsZoneFooterNodeId,
  fromCmsZoneNodeId,
  toCmsSectionNodeId,
  toCmsZoneFooterNodeId,
  toCmsZoneNodeId,
} from '@/features/cms/components/page-builder/utils/cms-master-tree';
import type { SectionInstance } from '@/shared/contracts/cms';

const createSection = (overrides: Partial<SectionInstance>): SectionInstance =>
  ({
    id: 'section-default',
    type: 'Hero',
    zone: 'template',
    parentSectionId: null,
    settings: {},
    blocks: [],
    ...overrides,
  }) as SectionInstance;

describe('cms master tree ids', () => {
  it('encodes and decodes zone and section ids', () => {
    const zoneNodeId = toCmsZoneNodeId('header');
    const sectionNodeId = toCmsSectionNodeId('section-1');

    expect(fromCmsZoneNodeId(zoneNodeId)).toBe('header');
    expect(fromCmsSectionNodeId(sectionNodeId)).toBe('section-1');
    expect(decodeCmsMasterNodeId(zoneNodeId)).toEqual({
      entity: 'zone',
      id: 'header',
      nodeId: zoneNodeId,
    });
    expect(decodeCmsMasterNodeId(sectionNodeId)).toEqual({
      entity: 'section',
      id: 'section-1',
      nodeId: sectionNodeId,
    });
  });

  it('rejects unknown ids and footer nodes for adapter decode', () => {
    expect(decodeCmsMasterNodeId('unknown:1')).toBeNull();
    expect(decodeCmsMasterNodeId(toCmsZoneFooterNodeId('template'))).toBeNull();
    expect(fromCmsZoneFooterNodeId(toCmsZoneFooterNodeId('template'))).toBe('template');
  });
});

describe('buildCmsMasterNodes', () => {
  it('builds zone, section and zone-footer nodes with stable ordering', () => {
    const nodes = buildCmsMasterNodes([
      createSection({
        id: 'header-1',
        type: 'Hero',
        zone: 'header',
        settings: { label: '  Top Hero  ' },
      }),
      createSection({
        id: 'template-1',
        type: 'Gallery',
        zone: 'template',
      }),
      createSection({
        id: 'header-child-1',
        type: 'TextElement',
        zone: 'template',
        parentSectionId: 'header-1',
      }),
    ]);

    expect(nodes.find((node) => node.id === toCmsZoneNodeId('header'))).toMatchObject({
      type: 'folder',
      kind: 'zone',
      parentId: null,
      sortOrder: 0,
      name: 'Header',
    });
    expect(nodes.find((node) => node.id === toCmsSectionNodeId('header-1'))).toMatchObject({
      type: 'folder',
      kind: 'section',
      parentId: toCmsZoneNodeId('header'),
      sortOrder: 0,
      name: 'Top Hero',
    });
    expect(nodes.find((node) => node.id === toCmsSectionNodeId('header-child-1'))).toMatchObject({
      type: 'folder',
      kind: 'section',
      parentId: toCmsSectionNodeId('header-1'),
      sortOrder: 0,
    });
    expect(nodes.find((node) => node.id === toCmsZoneFooterNodeId('header'))).toMatchObject({
      kind: 'zone_footer',
      parentId: toCmsZoneNodeId('header'),
      sortOrder: 1,
    });
  });
});
