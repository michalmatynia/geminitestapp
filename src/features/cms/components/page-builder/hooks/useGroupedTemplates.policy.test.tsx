/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageBuilderPolicyProvider } from '../PageBuilderPolicyContext';
import { useGroupedTemplates } from './useGroupedTemplates';

import type { GridTemplateRecord } from '../grid-templates';
import type { SectionTemplateRecord } from '../section-template-store';
import type { SectionInstance } from '@/features/cms/types/page-builder';

const createGridSection = (blocks: SectionInstance['blocks']): SectionInstance => ({
  id: 'grid-section',
  type: 'Grid',
  zone: 'template',
  parentSectionId: null,
  settings: { rows: 1, columns: 1 },
  blocks,
});

const allowedGridTemplate: GridTemplateRecord = {
  id: 'grid-allowed',
  name: 'Allowed Grid',
  description: '',
  createdAt: new Date('2026-03-26').toISOString(),
  section: createGridSection([
    {
      id: 'row-1',
      type: 'Row',
      settings: {},
      blocks: [
        {
          id: 'column-1',
          type: 'Column',
          settings: {},
          blocks: [
            {
              id: 'heading-1',
              type: 'Heading',
              settings: { headingText: 'Allowed' },
            },
          ],
        },
      ],
    },
  ]),
};

const blockedGridTemplate: GridTemplateRecord = {
  id: 'grid-blocked',
  name: 'Blocked Grid',
  description: '',
  createdAt: new Date('2026-03-26').toISOString(),
  section: createGridSection([
    {
      id: 'row-2',
      type: 'Row',
      settings: {},
      blocks: [
        {
          id: 'column-2',
          type: 'Column',
          settings: {},
          blocks: [
            {
              id: 'model-3d-1',
              type: 'Model3D',
              settings: { assetId: 'asset-1' },
            },
          ],
        },
      ],
    },
  ]),
};

const allowedSectionTemplate: SectionTemplateRecord = {
  id: 'section-allowed',
  name: 'Allowed Section',
  description: '',
  category: 'Saved sections',
  sectionType: 'Block',
  createdAt: new Date('2026-03-26').toISOString(),
  section: {
    id: 'allowed-section',
    type: 'Block',
    zone: 'template',
    parentSectionId: null,
    settings: {},
    blocks: [
      {
        id: 'text-1',
        type: 'Text',
        settings: { textContent: 'Allowed' },
      },
    ],
  },
};

const blockedSectionTemplate: SectionTemplateRecord = {
  id: 'section-blocked',
  name: 'Blocked Section',
  description: '',
  category: 'Saved sections',
  sectionType: 'Block',
  createdAt: new Date('2026-03-26').toISOString(),
  section: {
    id: 'blocked-section',
    type: 'Block',
    zone: 'template',
    parentSectionId: null,
    settings: {},
    blocks: [
      {
        id: 'model-3d-2',
        type: 'Model3D',
        settings: { assetId: 'asset-2' },
      },
    ],
  },
};

describe('useGroupedTemplates policy filtering', () => {
  it('removes saved templates that depend on hidden 3D blocks', () => {
    const { result } = renderHook(
      () =>
        useGroupedTemplates('template', [allowedGridTemplate, blockedGridTemplate], [
          allowedSectionTemplate,
          blockedSectionTemplate,
        ]),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <PageBuilderPolicyProvider value={{ hiddenBlockTypes: ['Model3D', 'Model3DElement'] }}>
            {children}
          </PageBuilderPolicyProvider>
        ),
      }
    );

    expect(result.current.groupedTemplates['Saved grids']?.map((template) => template.name)).toEqual([
      'Allowed Grid',
    ]);
    expect(
      result.current.groupedTemplates['Saved sections']?.map((template) => template.name)
    ).toEqual(['Allowed Section']);
  });
});
