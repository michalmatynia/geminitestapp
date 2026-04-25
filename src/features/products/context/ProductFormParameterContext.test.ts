import { act, renderHook } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useMemo, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductParameter, ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const { useParametersMock, useSimpleParametersMock, useTitleTermsMock } = vi.hoisted(() => ({
  useParametersMock: vi.fn(),
  useSimpleParametersMock: vi.fn(),
  useTitleTermsMock: vi.fn(),
}));

vi.mock('../hooks/useProductMetadataQueries', () => ({
  useParameters: useParametersMock,
  useSimpleParameters: useSimpleParametersMock,
  useTitleTerms: useTitleTermsMock,
}));

import {
  ProductFormParameterProvider,
  resolvePrimaryParameterValue,
  useProductFormParameters,
} from './ProductFormParameterContext';
import { ProductFormCoreStateContext } from './ProductFormCoreContext';

const createWrapper = ({
  product,
  selectedCatalogIds = ['catalog-1'],
  onInteraction,
  defaultNameEn = '',
}: {
  product?: ProductWithImages;
  selectedCatalogIds?: string[];
  onInteraction?: () => void;
  defaultNameEn?: string;
}) =>
  function Wrapper({ children }: { children: ReactNode }) {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        name_en: defaultNameEn,
      } as ProductFormData,
    });
    const coreState = useMemo(
      () =>
        ({
          register: methods.register,
          hasUnsavedChanges: false,
          errors: {},
          getValues: methods.getValues,
          selectedNoteIds: [],
          generationError: null,
          product,
          draft: null,
          ConfirmationModal: () => null,
          methods,
          uploading: false,
          uploadError: null,
          uploadSuccess: false,
        }),
      [methods, product]
    );

    return React.createElement(
      FormProvider,
      methods,
      React.createElement(
        ProductFormCoreStateContext.Provider,
        { value: coreState },
        React.createElement(
          ProductFormParameterProvider,
          {
            product,
            selectedCatalogIds,
            onInteraction,
          },
          children
        )
      )
    );
  };

describe('resolvePrimaryParameterValue', () => {
  it('prefers the explicit default locale when it exists', () => {
    expect(
      resolvePrimaryParameterValue({
        en: 'English',
        default: 'Default',
        pl: 'Polski',
      })
    ).toBe('Default');
  });

  it('keeps a direct value only when it still matches a localized entry', () => {
    expect(
      resolvePrimaryParameterValue(
        {
          en: 'English',
          pl: 'Polski',
        },
        'English'
      )
    ).toBe('English');

    expect(
      resolvePrimaryParameterValue({
        en: 'English',
        pl: 'Polski',
      })
    ).toBe('');
  });

  it('falls back to the explicit direct value only when there are no localized values', () => {
    expect(resolvePrimaryParameterValue({}, 'Fallback')).toBe('Fallback');
  });
});

describe('ProductFormParameterProvider', () => {
  beforeEach(() => {
    useSimpleParametersMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
    useTitleTermsMock.mockImplementation(() => ({
      data: [],
      isLoading: false,
    }));
  });

  it('removes a parameter row from local state and tracks interaction', () => {
    useParametersMock.mockReturnValue({
      data: [
        { id: 'param-1', name_en: 'Condition' },
        { id: 'param-2', name_en: 'Material' },
      ] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    const onInteraction = vi.fn();
    const product = {
      parameters: [
        { parameterId: 'param-1', value: 'Used' },
        { parameterId: 'param-2', value: 'Steel' },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = createWrapper({ product, onInteraction });
    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    act(() => {
      result.current.removeParameterValue(0);
    });

    expect(result.current.parameterValues).toEqual([{ parameterId: 'param-2', value: 'Steel' }]);
    expect(onInteraction).toHaveBeenCalledTimes(1);
  });

  it('merges legacy simple parameter definitions with synced product parameter definitions', () => {
    useParametersMock.mockReturnValue({
      data: [
        {
          id: 'param-material',
          name_en: 'Material',
          selectorType: 'text',
          linkedTitleTermType: 'material',
        },
      ] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });
    useSimpleParametersMock.mockReturnValue({
      data: [
        {
          id: 'param-condition',
          catalogId: 'catalog-1',
          name_en: 'Condition',
        },
      ] satisfies Partial<ProductSimpleParameter>[],
      isLoading: false,
    });

    const product = {
      parameters: [{ parameterId: 'param-condition', value: 'Used' }],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = createWrapper({ product });
    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    expect(result.current.parameters.map((parameter) => parameter.id)).toEqual([
      'param-condition',
      'param-material',
    ]);
    expect(result.current.parameterValues).toEqual([
      { parameterId: 'param-condition', value: 'Used' },
    ]);
  });

  it('keeps saved legacy parameters visible when their metadata definition is missing', () => {
    useParametersMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
    useSimpleParametersMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const product = {
      parameters: [{ parameterId: 'legacy_condition', value: 'Used' }],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = createWrapper({ product });
    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    expect(result.current.parameters).toEqual([
      expect.objectContaining({
        id: 'legacy_condition',
        name_en: 'Legacy Condition',
      }),
    ]);
    expect(result.current.parameterValues).toEqual([
      { parameterId: 'legacy_condition', value: 'Used' },
    ]);
  });

  it('keeps the parameter row when its localized value is cleared', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    const product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: 'Used',
          valuesByLanguage: { en: 'Used', pl: 'Uzywany' },
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = createWrapper({ product });
    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    act(() => {
      result.current.updateParameterValueByLanguage(0, 'en', '');
    });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: '',
        valuesByLanguage: { pl: 'Uzywany' },
      },
    ]);
  });

  it('persists parameter inference skip state on parameter values', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });
    const onInteraction = vi.fn();

    const product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: 'Used',
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = createWrapper({ product, onInteraction });
    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    act(() => {
      result.current.updateParameterInferenceSkip(0, true);
    });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: 'Used',
        skipParameterInference: true,
      },
    ]);
    expect(onInteraction).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.updateParameterInferenceSkip(0, false);
    });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: 'Used',
      },
    ]);
  });

  it('updates English without removing the sibling Polish value', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    const product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: 'Used',
          valuesByLanguage: { en: 'Used', pl: 'Uzywany' },
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = createWrapper({ product });
    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    act(() => {
      result.current.updateParameterValueByLanguage(0, 'en', 'Refurbished');
    });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: 'Refurbished',
        valuesByLanguage: {
          en: 'Refurbished',
          pl: 'Uzywany',
        },
      },
    ]);
  });

  it('applies translated localized values without overwriting the existing English scalar base', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    const product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: 'Used',
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = createWrapper({ product });
    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    act(() => {
      result.current.applyLocalizedParameterValues([
        {
          parameterId: 'param-1',
          languageCode: 'pl',
          value: 'Uzywany',
        },
      ]);
    });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: 'Used',
        valuesByLanguage: {
          pl: 'Uzywany',
        },
      },
    ]);
  });

  it('hydrates an explicitly blank saved parameter as a preserved row', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    const product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: '',
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = createWrapper({ product });
    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: '',
      },
    ]);
  });

  it('adopts refreshed product parameters when the modal receives updated product detail', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    let product = {
      parameters: [],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) => {
      const methods = useForm<ProductFormData>({
        defaultValues: {
          name_en: '',
        } as ProductFormData,
      });
      const coreState = useMemo(
        () =>
          ({
            register: methods.register,
            hasUnsavedChanges: false,
            errors: {},
            getValues: methods.getValues,
            selectedNoteIds: [],
            generationError: null,
            product,
            draft: null,
            ConfirmationModal: () => null,
            methods,
            uploading: false,
            uploadError: null,
            uploadSuccess: false,
          }),
        [methods, product]
      );

      return React.createElement(
        FormProvider,
        methods,
        React.createElement(
          ProductFormCoreStateContext.Provider,
          { value: coreState },
          React.createElement(
            ProductFormParameterProvider,
            {
              product,
              selectedCatalogIds: ['catalog-1'],
            },
            children
          )
        )
      );
    };
    const { result, rerender } = renderHook(() => useProductFormParameters(), { wrapper });

    expect(result.current.parameterValues).toEqual([]);

    product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: 'Used',
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    rerender();

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: 'Used',
      },
    ]);
  });

  it('preserves local parameter edits when refreshed product detail arrives later', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    let product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: '',
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) => {
      const methods = useForm<ProductFormData>({
        defaultValues: {
          name_en: '',
        } as ProductFormData,
      });
      const coreState = useMemo(
        () =>
          ({
            register: methods.register,
            hasUnsavedChanges: false,
            errors: {},
            getValues: methods.getValues,
            selectedNoteIds: [],
            generationError: null,
            product,
            draft: null,
            ConfirmationModal: () => null,
            methods,
            uploading: false,
            uploadError: null,
            uploadSuccess: false,
          }),
        [methods, product]
      );

      return React.createElement(
        FormProvider,
        methods,
        React.createElement(
          ProductFormCoreStateContext.Provider,
          { value: coreState },
          React.createElement(
            ProductFormParameterProvider,
            {
              product,
              selectedCatalogIds: ['catalog-1'],
            },
            children
          )
        )
      );
    };
    const { result, rerender } = renderHook(() => useProductFormParameters(), { wrapper });

    act(() => {
      result.current.updateParameterValue(0, 'Local draft');
    });

    product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: 'Inferred',
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    rerender();

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: 'Local draft',
      },
    ]);
  });

  it('auto-maps linked title terms into parameter values from English Name', () => {
    useParametersMock.mockReturnValue({
      data: [
        {
          id: 'param-material',
          name_en: 'Material',
          selectorType: 'text',
          linkedTitleTermType: 'material',
        },
      ] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });
    useTitleTermsMock.mockImplementation((_catalogId: string, type: string) => ({
      data:
        type === 'material'
          ? [
              {
                id: 'term-metal',
                catalogId: 'catalog-1',
                type: 'material',
                name_en: 'Metal',
                name_pl: 'Metal PL',
              },
            ]
          : [],
      isLoading: false,
    }));

    const wrapper = createWrapper({
      defaultNameEn: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
    });
    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-material',
        value: 'Metal',
        valuesByLanguage: {
          en: 'Metal',
          pl: 'Metal PL',
        },
      },
    ]);
  });

  it('falls back to the English linked term when the Polish translation is missing', () => {
    useParametersMock.mockReturnValue({
      data: [
        {
          id: 'param-material',
          name_en: 'Material',
          selectorType: 'text',
          linkedTitleTermType: 'material',
        },
      ] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });
    useTitleTermsMock.mockImplementation((_catalogId: string, type: string) => ({
      data:
        type === 'material'
          ? [
              {
                id: 'term-metal',
                catalogId: 'catalog-1',
                type: 'material',
                name_en: 'Metal',
                name_pl: null,
              },
            ]
          : [],
      isLoading: false,
    }));

    const wrapper = createWrapper({
      defaultNameEn: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
    });
    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-material',
        value: 'Metal',
        valuesByLanguage: {
          en: 'Metal',
          pl: 'Metal',
        },
      },
    ]);
  });
});
