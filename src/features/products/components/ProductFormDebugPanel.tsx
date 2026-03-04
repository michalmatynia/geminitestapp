'use client';

import { useContext } from 'react';

import { ProductFormSubmitContext } from '@/features/products/context/ProductFormContext';
import { ProductFormCoreContext } from '@/features/products/context/ProductFormCoreContext';
import { ProductFormImageContext } from '@/features/products/context/ProductFormImageContext';
import { ProductFormMetadataContext } from '@/features/products/context/ProductFormMetadataContext';
import { ProductFormParameterContext } from '@/features/products/context/ProductFormParameterContext';
import { ProductFormStudioContext } from '@/features/products/context/ProductFormStudioContext';

export default function ProductFormDebugPanel(): React.JSX.Element | null {
  const coreContext = useContext(ProductFormCoreContext);
  const metadataContext = useContext(ProductFormMetadataContext);
  const imageContext = useContext(ProductFormImageContext);
  const parameterContext = useContext(ProductFormParameterContext);
  const studioContext = useContext(ProductFormStudioContext);
  const submitContext = useContext(ProductFormSubmitContext);

  if (
    !coreContext &&
    !metadataContext &&
    !imageContext &&
    !parameterContext &&
    !studioContext &&
    !submitContext
  ) {
    return null;
  }

  const context = {
    core: coreContext,
    metadata: metadataContext,
    images: imageContext,
    parameters: parameterContext,
    studio: studioContext,
    submit: submitContext,
  };

  // A function to handle circular references in the context for JSON.stringify
  const getCircularReplacer = (): ((key: string, value: unknown) => unknown) => {
    const seen = new WeakSet();
    return (_key: string, value: unknown): unknown => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return; // Omit circular reference
        }
        seen.add(value);
      }
      return value;
    };
  };

  return (
    <div className='fixed bottom-0 right-0 bg-gray-800 text-white p-4 rounded-tl-lg shadow-lg max-w-lg max-h-96 overflow-auto z-50'>
      <h3 className='text-lg font-bold mb-2'>Product Form Debug Panel</h3>
      <pre className='text-xs'>{JSON.stringify(context, getCircularReplacer(), 2)}</pre>
    </div>
  );
}
