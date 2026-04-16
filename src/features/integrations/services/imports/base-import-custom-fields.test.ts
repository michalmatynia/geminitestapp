import { describe, expect, it, vi } from 'vitest';

import {
  ensureBaseMarketplaceExclusionCustomField,
  ensureBaseTextCustomFields,
} from './base-import-custom-fields';

import type { CustomFieldRepository } from '@/shared/contracts/products/drafts';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import { BASE_MARKETPLACE_CHECKBOX_OPTIONS } from '@/shared/lib/integrations/base-marketplace-checkboxes';

const buildRepository = (): CustomFieldRepository => ({
  listCustomFields: vi.fn(),
  getCustomFieldById: vi.fn(),
  createCustomField: vi.fn(),
  updateCustomField: vi.fn(),
  deleteCustomField: vi.fn(),
  findByName: vi.fn(),
});

const buildDefinition = (
  overrides: Partial<ProductCustomFieldDefinition> = {}
): ProductCustomFieldDefinition => ({
  id: 'field-1',
  name: 'Market Exclusion',
  type: 'checkbox_set',
  options: [],
  createdAt: '2026-04-08T00:00:00.000Z',
  updatedAt: '2026-04-08T00:00:00.000Z',
  ...overrides,
});

describe('ensureBaseTextCustomFields', () => {
  it('creates missing text custom fields from direct Base text fields and skips reserved buckets', async () => {
    const repository = buildRepository();
    vi.mocked(repository.createCustomField).mockImplementation(async (data) =>
      buildDefinition({
        id: `${data.name.toLowerCase().replace(/\s+/g, '-')}-id`,
        name: data.name,
        type: data.type,
        options: data.options ?? [],
      })
    );

    const definitions = await ensureBaseTextCustomFields({
      repository,
      existingDefinitions: [],
      records: [
        {
          text_fields: {
            name: 'Product title',
            description: 'Product description',
            custom_note: 'Handle with care',
            'shipping_notes|pl': 'Ostroznie',
            Tradera: '1',
            features: {
              Material: 'Cotton',
            },
          },
        },
      ],
    });

    expect(repository.createCustomField).toHaveBeenNthCalledWith(1, {
      name: 'Custom Note',
      type: 'text',
      options: [],
    });
    expect(repository.createCustomField).toHaveBeenNthCalledWith(2, {
      name: 'Shipping Notes',
      type: 'text',
      options: [],
    });
    expect(definitions).toEqual([
      expect.objectContaining({
        id: 'custom-note-id',
        name: 'Custom Note',
        type: 'text',
      }),
      expect.objectContaining({
        id: 'shipping-notes-id',
        name: 'Shipping Notes',
        type: 'text',
      }),
    ]);
  });

  it('simulates text custom fields during dry runs without persisting settings', async () => {
    const repository = buildRepository();

    const definitions = await ensureBaseTextCustomFields({
      repository,
      existingDefinitions: [],
      records: [{ text_fields: { custom_note: 'Handle with care' } }],
      persist: false,
    });

    expect(repository.createCustomField).not.toHaveBeenCalled();
    expect(definitions).toEqual([
      expect.objectContaining({
        id: 'base-text-custom-field-customnote',
        name: 'Custom Note',
        type: 'text',
      }),
    ]);
  });

  it('reuses existing definitions matched by normalized name', async () => {
    const repository = buildRepository();
    const existingDefinition = buildDefinition({
      id: 'shipping-notes',
      name: 'Shipping Notes',
      type: 'text',
      options: [],
    });

    const definitions = await ensureBaseTextCustomFields({
      repository,
      existingDefinitions: [existingDefinition],
      records: [{ text_fields: { 'shipping_notes|en': 'Keep flat' } }],
    });

    expect(repository.createCustomField).not.toHaveBeenCalled();
    expect(definitions).toEqual([existingDefinition]);
  });

  it('creates missing text custom fields from feature buckets when enabled', async () => {
    const repository = buildRepository();
    vi.mocked(repository.createCustomField).mockImplementation(async (data) =>
      buildDefinition({
        id: `${data.name.toLowerCase().replace(/\s+/g, '-')}-id`,
        name: data.name,
        type: data.type,
        options: data.options ?? [],
      })
    );

    const definitions = await ensureBaseTextCustomFields({
      repository,
      existingDefinitions: [],
      records: [
        {
          text_fields: {
            features: {
              Material: 'Cotton',
              'Care Notes': 'Dry clean only',
            },
          },
        },
      ],
      includeFeatureBuckets: true,
    });

    expect(repository.createCustomField).toHaveBeenNthCalledWith(1, {
      name: 'Care Notes',
      type: 'text',
      options: [],
    });
    expect(repository.createCustomField).toHaveBeenNthCalledWith(2, {
      name: 'Material',
      type: 'text',
      options: [],
    });
    expect(definitions).toEqual([
      expect.objectContaining({
        id: 'care-notes-id',
        name: 'Care Notes',
        type: 'text',
      }),
      expect.objectContaining({
        id: 'material-id',
        name: 'Material',
        type: 'text',
      }),
    ]);
  });

  it('creates missing text custom fields from localized feature buckets when enabled', async () => {
    const repository = buildRepository();
    vi.mocked(repository.createCustomField).mockImplementation(async (data) =>
      buildDefinition({
        id: `${data.name.toLowerCase().replace(/\s+/g, '-')}-id`,
        name: data.name,
        type: data.type,
        options: data.options ?? [],
      })
    );

    const definitions = await ensureBaseTextCustomFields({
      repository,
      existingDefinitions: [],
      records: [
        {
          text_fields: {
            'features|pl': {
              Material: 'Cotton',
            },
          },
        },
      ],
      includeFeatureBuckets: true,
    });

    expect(repository.createCustomField).toHaveBeenCalledWith({
      name: 'Material',
      type: 'text',
      options: [],
    });
    expect(definitions).toEqual([
      expect.objectContaining({
        id: 'material-id',
        name: 'Material',
        type: 'text',
      }),
    ]);
  });

  it('skips feature bucket names that already exist as product parameters', async () => {
    const repository = buildRepository();
    vi.mocked(repository.createCustomField).mockImplementation(async (data) =>
      buildDefinition({
        id: `${data.name.toLowerCase().replace(/\s+/g, '-')}-id`,
        name: data.name,
        type: data.type,
        options: data.options ?? [],
      })
    );

    const definitions = await ensureBaseTextCustomFields({
      repository,
      existingDefinitions: [],
      existingParameters: [
        {
          id: 'parameter-material',
          catalogId: 'catalog-1',
          name_en: 'Material',
          name_pl: null,
          name_de: null,
          selectorType: 'text',
          optionLabels: [],
          createdAt: '2026-04-08T00:00:00.000Z',
          updatedAt: '2026-04-08T00:00:00.000Z',
        },
      ],
      records: [
        {
          text_fields: {
            features: {
              Material: 'Cotton',
              Finish: 'Matte',
            },
          },
        },
      ],
      includeFeatureBuckets: true,
    });

    expect(repository.createCustomField).toHaveBeenCalledTimes(1);
    expect(repository.createCustomField).toHaveBeenCalledWith({
      name: 'Finish',
      type: 'text',
      options: [],
    });
    expect(definitions).toEqual([
      expect.objectContaining({
        name: 'Finish',
        type: 'text',
      }),
    ]);
  });

  it('does not create text custom fields for "X Yes" marketplace checkbox keys', async () => {
    const repository = buildRepository();
    vi.mocked(repository.createCustomField).mockImplementation(async (data) =>
      buildDefinition({
        id: `${data.name.toLowerCase().replace(/\s+/g, '-')}-id`,
        name: data.name,
        type: data.type,
        options: data.options ?? [],
      })
    );

    const definitions = await ensureBaseTextCustomFields({
      repository,
      existingDefinitions: [],
      records: [
        {
          text_fields: {
            'Tradera Yes': '1',
            'Willhaben Yes': '1',
            'Depop Yes': '0',
            'Grailed Yes': '0',
            'Schpock Yes': '0',
            'Vinted Yes': '1',
            custom_note: 'Handle with care',
          },
        },
      ],
    });

    // Only the non-marketplace key should produce a custom field
    expect(repository.createCustomField).toHaveBeenCalledTimes(1);
    expect(repository.createCustomField).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Custom Note', type: 'text' })
    );
    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toMatchObject({ name: 'Custom Note' });
  });

  it('skips generic extra fields that carry Market Exclusion checkbox selections', async () => {
    const repository = buildRepository();
    vi.mocked(repository.createCustomField).mockImplementation(async (data) =>
      buildDefinition({
        id: `${data.name.toLowerCase().replace(/\s+/g, '-')}-id`,
        name: data.name,
        type: data.type,
        options: data.options ?? [],
      })
    );

    const definitions = await ensureBaseTextCustomFields({
      repository,
      existingDefinitions: [
        buildDefinition({
          id: 'market-exclusion',
          options: [
            { id: 'allegro', label: 'Allegro' },
            { id: 'amazon-pl', label: 'Amazon.pl' },
            { id: 'tradera', label: 'Tradera' },
            { id: 'vinted', label: 'Vinted' },
          ],
        }),
      ],
      records: [
        {
          text_fields: {
            'Extra Field 6302': [
              { label: 'Allegro', checked: true },
              { label: 'Amazon.pl', checked: false },
              { label: 'Tradera', selected: true },
            ],
            'Extra Field 18808': 'Yes',
          },
        },
      ],
    });

    expect(repository.createCustomField).toHaveBeenCalledTimes(1);
    expect(repository.createCustomField).toHaveBeenCalledWith({
      name: 'Extra Field 18808',
      type: 'text',
      options: [],
    });
    expect(definitions).toEqual([
      expect.objectContaining({ id: 'market-exclusion', name: 'Market Exclusion' }),
      expect.objectContaining({ name: 'Extra Field 18808', type: 'text' }),
    ]);
  });
});

describe('ensureBaseMarketplaceExclusionCustomField', () => {
  it('creates the checkbox set when Base records include marketplace exclusion signals', async () => {
    const repository = buildRepository();
    vi.mocked(repository.createCustomField).mockImplementation(async (data) =>
      buildDefinition({
        id: 'field-created',
        name: data.name,
        type: data.type,
        options: (data.options ?? []).map((option, index) => ({
          id: option.id ?? `generated-${index + 1}`,
          label: option.label,
        })),
      })
    );

    const definitions = await ensureBaseMarketplaceExclusionCustomField({
      repository,
      existingDefinitions: [],
      records: [{ text_fields: { Tradera: '1' } }],
    });

    expect(repository.createCustomField).toHaveBeenCalledWith({
      name: 'Market Exclusion',
      type: 'checkbox_set',
      options: BASE_MARKETPLACE_CHECKBOX_OPTIONS.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    });
    expect(definitions).toEqual([
      expect.objectContaining({
        id: 'field-created',
        name: 'Market Exclusion',
        type: 'checkbox_set',
      }),
    ]);
  });

  it('simulates the checkbox set during dry runs without persisting settings changes', async () => {
    const repository = buildRepository();

    const definitions = await ensureBaseMarketplaceExclusionCustomField({
      repository,
      existingDefinitions: [],
      records: [{ text_fields: { Vinted: '1' } }],
      persist: false,
    });

    expect(repository.createCustomField).not.toHaveBeenCalled();
    expect(repository.updateCustomField).not.toHaveBeenCalled();
    expect(definitions).toEqual([
      expect.objectContaining({
        id: 'base-market-exclusion',
        name: 'Market Exclusion',
        type: 'checkbox_set',
        options: expect.arrayContaining(
          BASE_MARKETPLACE_CHECKBOX_OPTIONS.map((option) => ({
            id: option.id,
            label: option.label,
          }))
        ),
      }),
    ]);
  });

  it('appends missing marketplace options and preserves existing aliases and custom options', async () => {
    const repository = buildRepository();
    const existingDefinition = buildDefinition({
      options: [
        { id: 'existing-tradera', label: 'Tradera' },
        { id: 'existing-shpock', label: 'Shpock' },
        { id: 'custom-option', label: 'Custom Market' },
      ],
    });
    vi.mocked(repository.updateCustomField).mockImplementation(async (id, data) =>
      buildDefinition({
        id,
        options: data.options ?? [],
      })
    );

    const definitions = await ensureBaseMarketplaceExclusionCustomField({
      repository,
      existingDefinitions: [existingDefinition],
      records: [{ text_fields: { Schpock: '1' } }],
    });

    expect(repository.updateCustomField).toHaveBeenCalledWith('field-1', {
      options: expect.arrayContaining([
        { id: 'existing-tradera', label: 'Tradera' },
        { id: 'existing-shpock', label: 'Shpock' },
        { id: 'custom-option', label: 'Custom Market' },
        { id: 'market-exclusion-allegro', label: 'Allegro' },
        { id: 'market-exclusion-amazon-co-uk', label: 'Amazon.co.uk' },
        { id: 'market-exclusion-amazon-pl', label: 'Amazon.pl' },
        { id: 'market-exclusion-etsy-sparksofsindri', label: 'Etsy - SparksOfSindri' },
        { id: 'market-exclusion-etsy-keyrealmz', label: 'Etsy - KeyRealmz' },
        { id: 'market-exclusion-etsy-good-old-times', label: 'Etsy - Good Old Times' },
        { id: 'market-exclusion-ebay-pl', label: 'eBay.pl' },
        { id: 'market-exclusion-olx', label: 'Olx' },
        { id: 'market-exclusion-taniey', label: 'Taniey' },
        { id: 'market-exclusion-empik', label: 'Empik' },
        { id: 'market-exclusion-arena-pl', label: 'Arena.pl' },
        { id: 'market-exclusion-erli-pl', label: 'Erli.pl' },
        { id: 'market-exclusion-velomarket', label: 'Velomarket' },
        { id: 'market-exclusion-willhaben', label: 'Willhaben' },
        { id: 'market-exclusion-depop', label: 'Depop' },
        { id: 'market-exclusion-grailed', label: 'Grailed' },
        { id: 'market-exclusion-vinted', label: 'Vinted' },
      ]),
    });
    expect(definitions[0]?.options).toEqual(
      expect.arrayContaining([
        { id: 'existing-tradera', label: 'Tradera' },
        { id: 'existing-shpock', label: 'Shpock' },
        { id: 'custom-option', label: 'Custom Market' },
        { id: 'market-exclusion-allegro', label: 'Allegro' },
        { id: 'market-exclusion-amazon-co-uk', label: 'Amazon.co.uk' },
        { id: 'market-exclusion-amazon-pl', label: 'Amazon.pl' },
        { id: 'market-exclusion-etsy-sparksofsindri', label: 'Etsy - SparksOfSindri' },
        { id: 'market-exclusion-etsy-keyrealmz', label: 'Etsy - KeyRealmz' },
        { id: 'market-exclusion-etsy-good-old-times', label: 'Etsy - Good Old Times' },
        { id: 'market-exclusion-ebay-pl', label: 'eBay.pl' },
        { id: 'market-exclusion-olx', label: 'Olx' },
        { id: 'market-exclusion-taniey', label: 'Taniey' },
        { id: 'market-exclusion-empik', label: 'Empik' },
        { id: 'market-exclusion-arena-pl', label: 'Arena.pl' },
        { id: 'market-exclusion-erli-pl', label: 'Erli.pl' },
        { id: 'market-exclusion-velomarket', label: 'Velomarket' },
        { id: 'market-exclusion-willhaben', label: 'Willhaben' },
        { id: 'market-exclusion-depop', label: 'Depop' },
        { id: 'market-exclusion-grailed', label: 'Grailed' },
        { id: 'market-exclusion-vinted', label: 'Vinted' },
      ])
    );
  });

  it('does not modify an existing field when it is not a checkbox set', async () => {
    const repository = buildRepository();
    const existingDefinition = buildDefinition({
      type: 'text',
      options: [],
    });

    const definitions = await ensureBaseMarketplaceExclusionCustomField({
      repository,
      existingDefinitions: [existingDefinition],
      records: [{ Tradera: true }],
    });

    expect(repository.createCustomField).not.toHaveBeenCalled();
    expect(repository.updateCustomField).not.toHaveBeenCalled();
    expect(definitions).toEqual([existingDefinition]);
  });

  it('skips creation when incoming records do not include marketplace exclusion signals', async () => {
    const repository = buildRepository();

    const definitions = await ensureBaseMarketplaceExclusionCustomField({
      repository,
      existingDefinitions: [],
      records: [{ title: 'Regular product' }],
    });

    expect(repository.createCustomField).not.toHaveBeenCalled();
    expect(repository.updateCustomField).not.toHaveBeenCalled();
    expect(definitions).toEqual([]);
  });
});
