import { JSX } from 'react';

import { ProductConstructorPage } from '@/features/products';

export default function Page(): JSX.Element {
  return (
    <div className='container mx-auto py-10'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-white'>Product Constructor</h1>
        <p className='mt-2 text-sm text-gray-400'>
          Define reusable building blocks for your product data.
        </p>
      </div>
      <ProductConstructorPage />
    </div>
  );
}