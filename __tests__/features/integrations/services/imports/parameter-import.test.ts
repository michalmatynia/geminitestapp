import { describe, expect, it } from 'vitest';

import {
  applyBaseParameterImport,
  extractBaseParameters,
} from '@/features/integrations/services/imports/parameter-import';
import type { ParameterRepository } from '@/features/products/types/services/parameter-repository';

const createInMemoryParameterRepository = (): ParameterRepository => {
  const items: Array<{
    id: string;
    catalogId: string;
    name_en: string;
    name_pl: string | null;
    name_de: string | null;
  }> = [];
  let counter = 1;

  return {
    async listParameters(filters) {
      const catalogId = filters.catalogId ?? '';
      return items
        .filter((item) => item.catalogId === catalogId)
        .map((item) => ({
          ...item,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        }));
    },
    async getParameterById(id) {
      const found = items.find((item) => item.id === id);
      if (!found) return null;
      return {
        ...found,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      };
    },
    async createParameter(data) {
      const created = {
        id: `p-${counter++}`,
        catalogId: data.catalogId,
        name_en: data.name_en,
        name_pl: data.name_pl ?? null,
        name_de: data.name_de ?? null,
      };
      items.push(created);
      return {
        ...created,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      };
    },
    async updateParameter(id, data) {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new Error('Parameter not found');
      }
      const existing = items[index]!;
      const updated = {
        ...existing,
        ...(data.name_en !== undefined ? { name_en: data.name_en } : {}),
        ...(data.name_pl !== undefined ? { name_pl: data.name_pl ?? null } : {}),
        ...(data.name_de !== undefined ? { name_de: data.name_de ?? null } : {}),
      };
      items[index] = updated;
      return {
        ...updated,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      };
    },
    async deleteParameter(id) {
      const next = items.filter((item) => item.id !== id);
      items.splice(0, items.length, ...next);
    },
    async findByName(catalogId, name_en) {
      const found = items.find(
        (item) => item.catalogId === catalogId && item.name_en === name_en
      );
      if (!found) return null;
      return {
        ...found,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      };
    },
  };
};

describe('parameter import feature', () => {
  it('extracts multilingual parameter payloads from Base record', () => {
    const extracted = extractBaseParameters({
      record: {
        parameters: [{ id: '101', name: 'Material', value: 'Wood' }],
        text_fields: {
          'parameters|en': [{ id: '101', name: 'Material', value: 'Wood' }],
          'parameters|de': [{ id: '101', name: 'Material', value: 'Holz' }],
        },
      },
      settings: {
        enabled: true,
        mode: 'all',
        languageScope: 'catalog_languages',
        createMissingParameters: true,
        overwriteExistingValues: true,
        matchBy: 'name_only',
      },
      templateMappings: [],
    });

    expect(extracted).toHaveLength(1);
    expect(extracted[0]?.baseParameterId).toBe('101');
    expect(extracted[0]?.valuesByLanguage['default']).toBe('Wood');
    expect(extracted[0]?.valuesByLanguage['en']).toBe('Wood');
    expect(extracted[0]?.valuesByLanguage['de']).toBe('Holz');
  });

  it('creates missing parameters and writes values for catalog languages', async () => {
    const repository = createInMemoryParameterRepository();
    const result = await applyBaseParameterImport({
      record: {
        parameters: [{ name: 'Material', value: 'Wood' }],
        text_fields: {
          'parameters|de': [{ name: 'Material', value: 'Holz' }],
        },
      },
      catalogId: 'catalog-1',
      parameterRepository: repository,
      existingValues: [],
      catalogLanguageCodes: ['en', 'de'],
      defaultLanguageCode: 'en',
      settings: {
        enabled: true,
        mode: 'all',
        languageScope: 'catalog_languages',
        createMissingParameters: true,
        overwriteExistingValues: true,
        matchBy: 'name_only',
      },
      templateMappings: [],
    });

    expect(result.applied).toBe(true);
    expect(result.summary.created).toBe(1);
    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0]?.value).toBe('Wood');
    expect(result.parameters[0]?.valuesByLanguage).toEqual({
      en: 'Wood',
      de: 'Holz',
    });
  });

  it('keeps existing values when overwrite is disabled', async () => {
    const repository = createInMemoryParameterRepository();
    const created = await repository.createParameter({
      catalogId: 'catalog-1',
      name_en: 'Material',
    });

    const result = await applyBaseParameterImport({
      record: {
        parameters: [{ name: 'Material', value: 'Wood' }],
      },
      catalogId: 'catalog-1',
      parameterRepository: repository,
      existingValues: [
        {
          parameterId: created.id,
          value: 'Metal',
          valuesByLanguage: { en: 'Metal' },
        },
      ],
      catalogLanguageCodes: ['en'],
      defaultLanguageCode: 'en',
      settings: {
        enabled: true,
        mode: 'all',
        languageScope: 'catalog_languages',
        createMissingParameters: true,
        overwriteExistingValues: false,
        matchBy: 'name_only',
      },
      templateMappings: [],
    });

    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0]?.value).toBe('Metal');
    expect(result.parameters[0]?.valuesByLanguage).toEqual({ en: 'Metal' });
    expect(result.summary.written).toBe(0);
  });
});
