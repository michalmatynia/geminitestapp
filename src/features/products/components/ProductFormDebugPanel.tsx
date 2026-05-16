'use client';

import { useContext } from 'react';

import { ProductFormSubmitContext } from '@/features/products/context/ProductFormContext';
import {
  ProductFormCoreActionsContext,
  ProductFormCoreStateContext,
} from '@/features/products/context/ProductFormCoreContext';
import { ProductFormImageContext } from '@/features/products/context/ProductFormImageContext';
import { ProductFormMetadataContext } from '@/features/products/context/ProductFormMetadataContext';
import { ProductFormCustomFieldContext } from '@/features/products/context/ProductFormCustomFieldContext';
import { ProductFormParameterContext } from '@/features/products/context/ProductFormParameterContext';
import {
  ProductFormStudioActionsContext,
  ProductFormStudioStateContext,
} from '@/features/products/context/ProductFormStudioContext';

const mergeDebugContexts = (
  left: object | null,
  right: object | null
): Record<string, unknown> | null => {
  if (left === null && right === null) return null;
  return { ...(left ?? {}), ...(right ?? {}) };
};

const hasDebugContext = (context: Record<string, unknown>): boolean =>
  Object.values(context).some((value) => value !== null);

const getCircularReplacer = (): ((key: string, value: unknown) => unknown) => {
  const seen = new WeakSet();
  return (_key: string, value: unknown): unknown => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return undefined;
      }
      seen.add(value);
    }
    return value;
  };
};

export default function ProductFormDebugPanel(): React.JSX.Element | null {
  const coreStateContext = useContext(ProductFormCoreStateContext);
  const coreActionsContext = useContext(ProductFormCoreActionsContext);
  const metadataContext = useContext(ProductFormMetadataContext);
  const imageContext = useContext(ProductFormImageContext);
  const customFieldContext = useContext(ProductFormCustomFieldContext);
  const parameterContext = useContext(ProductFormParameterContext);
  const studioStateContext = useContext(ProductFormStudioStateContext);
  const studioActionsContext = useContext(ProductFormStudioActionsContext);
  const submitContext = useContext(ProductFormSubmitContext);
  const coreContext = mergeDebugContexts(coreStateContext, coreActionsContext);
  const studioContext = mergeDebugContexts(studioStateContext, studioActionsContext);

  const context = {
    core: coreContext,
    metadata: metadataContext,
    images: imageContext,
    customFields: customFieldContext,
    parameters: parameterContext,
    studio: studioContext,
    submit: submitContext,
  };

  if (!hasDebugContext(context)) return null;

  return (
    <div className='fixed bottom-0 right-0 bg-gray-800 text-white p-4 rounded-tl-lg shadow-lg max-w-lg max-h-96 overflow-auto z-50'>
      <h3 className='text-lg font-bold mb-2'>Product Form Debug Panel</h3>
      <pre className='text-xs'>{JSON.stringify(context, getCircularReplacer(), 2)}</pre>
    </div>
  );
}
