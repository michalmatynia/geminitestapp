import { describe, expect, it } from 'vitest';

import type { ImportExportTemplateMappingDto } from '@/shared/contracts/integrations/import-export';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { resolveBaseExporterTemplateMappings } from './base-exporter-template-mappings';

const createProduct = (overrides: Record<string, unknown> = {}): ProductWithImages =>
  ({
    parameters: [],
    tags: [],
    images: [],
    ...overrides,
  }) as unknown as ProductWithImages;

const createMapping = (
  sourceKey: string,
  targetField: string
): ImportExportTemplateMappingDto =>
  ({
    sourceKey,
    targetField,
  }) as ImportExportTemplateMappingDto;

describe('resolveBaseExporterTemplateMappings', () => {
  it('maps producer and tag targets through lookup-backed id and name helpers', () => {
    const product = createProduct({
      producers: [{ producerId: 'producer-1', producerName: 'Acme' }],
      tags: [{ tagId: 'tag-1', tagName: 'Featured' }],
    });

    const result = resolveBaseExporterTemplateMappings(
      product,
      [
        createMapping('producer', 'producer_id'),
        createMapping('producer_name', 'producer_names'),
        createMapping('tag', 'tag_id'),
        createMapping('tag_name', 'tag_names'),
      ],
      {
        producerNameById: { 'producer-1': 'Acme' },
        producerExternalIdByInternalId: { 'producer-1': 'ext-producer-1' },
        tagNameById: { 'tag-1': 'Featured' },
        tagExternalIdByInternalId: { 'tag-1': 'ext-tag-1' },
      }
    );

    expect(result).toEqual({
      producer_id: 'ext-producer-1',
      producer_names: ['Acme'],
      tag_id: 'ext-tag-1',
      tag_names: ['Featured'],
    });
  });

  it('preserves empty parameter exports for strings while nulling numeric targets', () => {
    const product = createProduct({
      parameters: [
        {
          parameterId: 'weight',
          value: ' ',
        },
        {
          parameterId: 'description',
          value: ' ',
        },
      ],
    });

    const result = resolveBaseExporterTemplateMappings(product, [
      createMapping('parameter:weight', 'weight'),
      createMapping('parameter:description', 'description'),
    ]);

    expect(result).toEqual({
      weight: null,
      description: '',
    });
  });
});
