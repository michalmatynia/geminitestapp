import { describe, expect, it, vi } from 'vitest';

import { ensureBaseMarketplaceExclusionCustomField } from './base-import-custom-fields';

import type { CustomFieldRepository } from '@/shared/contracts/products/drafts';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';

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
      options: [
        { id: 'market-exclusion-tradera', label: 'Tradera' },
        { id: 'market-exclusion-willhaben', label: 'Willhaben' },
        { id: 'market-exclusion-depop', label: 'Depop' },
        { id: 'market-exclusion-grailed', label: 'Grailed' },
        { id: 'market-exclusion-shpock', label: 'Schpock' },
        { id: 'market-exclusion-vinted', label: 'Vinted' },
      ],
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
        options: expect.arrayContaining([
          { id: 'market-exclusion-vinted', label: 'Vinted' },
        ]),
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
      options: [
        { id: 'existing-tradera', label: 'Tradera' },
        { id: 'existing-shpock', label: 'Shpock' },
        { id: 'custom-option', label: 'Custom Market' },
        { id: 'market-exclusion-willhaben', label: 'Willhaben' },
        { id: 'market-exclusion-depop', label: 'Depop' },
        { id: 'market-exclusion-grailed', label: 'Grailed' },
        { id: 'market-exclusion-vinted', label: 'Vinted' },
      ],
    });
    expect(definitions[0]?.options).toEqual([
      { id: 'existing-tradera', label: 'Tradera' },
      { id: 'existing-shpock', label: 'Shpock' },
      { id: 'custom-option', label: 'Custom Market' },
      { id: 'market-exclusion-willhaben', label: 'Willhaben' },
      { id: 'market-exclusion-depop', label: 'Depop' },
      { id: 'market-exclusion-grailed', label: 'Grailed' },
      { id: 'market-exclusion-vinted', label: 'Vinted' },
    ]);
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
