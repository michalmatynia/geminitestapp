import { JSX } from 'react';

import { ProductSettingsPage } from '@/features/products/public';

export default function Page(): JSX.Element {
  return (
    <div className='container mx-auto py-10'>
      <ProductSettingsPage />
    </div>
  );
}
