import { describe, expect, it } from 'vitest';

import {
  assertAvailableProductParameterName,
  buildProductParameterNameLookupInput,
  buildProductParameterUpdateInput,
  normalizeOptionLabels,
} from './handler.helpers';

const currentParameter = {
  id: 'param-1',
  catalogId: 'catalog-1',
  selectorType: 'text' as const,
  optionLabels: [],
  linkedTitleTermType: null,
};

describe('products/parameters/[id] handler helpers', () => {
  it('builds normalized option updates and target catalog lookups', () => {
    expect(
      buildProductParameterUpdateInput(
        { ...currentParameter, selectorType: 'select', optionLabels: ['Existing'] },
        {
          name_pl: null,
          selectorType: 'select',
          optionLabels: [' Size ', 'size', '', 'Color', 'COLOR'],
          linkedTitleTermType: null,
        },
        'param-1'
      )
    ).toEqual({
      linkedTitleTermType: null,
      name_pl: null,
      selectorType: 'select',
      optionLabels: ['Size', 'Color'],
    });

    expect(
      buildProductParameterNameLookupInput(currentParameter, {
        name_en: 'Material',
        catalogId: 'catalog-2',
      })
    ).toEqual({
      catalogId: 'catalog-2',
      nameEn: 'Material',
    });
  });

  it('carries linked English Title term sync through valid text updates', () => {
    expect(
      buildProductParameterUpdateInput(
        currentParameter,
        {
          linkedTitleTermType: 'material',
        },
        'param-1'
      )
    ).toEqual({
      linkedTitleTermType: 'material',
    });
  });

  it('rejects selector types that require at least one normalized option', () => {
    expect(() =>
      buildProductParameterUpdateInput(
        currentParameter,
        {
          selectorType: 'select',
          optionLabels: [' ', ''],
        },
        'param-1'
      )
    ).toThrowError('Selector type requires at least one option label.');
  });

  it('rejects linked English Title sync for non-text selector types', () => {
    expect(() =>
      buildProductParameterUpdateInput(
        currentParameter,
        {
          selectorType: 'select',
          optionLabels: ['Steel'],
          linkedTitleTermType: 'material',
        },
        'param-1'
      )
    ).toThrowError('Only text and textarea parameters can sync from English Title terms.');
  });

  it('allows same-record name matches and rejects duplicates in the target catalog', () => {
    const lookup = {
      catalogId: 'catalog-2',
      nameEn: 'Material',
    };

    expect(() =>
      assertAvailableProductParameterName({ id: 'param-1' }, 'param-1', lookup)
    ).not.toThrow();

    expect(() =>
      assertAvailableProductParameterName({ id: 'param-2' }, 'param-1', lookup)
    ).toThrowError('A parameter with this name already exists in this catalog');
  });

  it('deduplicates option labels and skips unsupported lookup input', () => {
    expect(normalizeOptionLabels([' Material ', 'material', 1, '', 'Color'])).toEqual([
      'Material',
      'Color',
    ]);
    expect(buildProductParameterNameLookupInput(currentParameter, {})).toBeNull();
  });
});
