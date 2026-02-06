import { JSX } from 'react';

import { ProductSettingsPage } from '@/features/products';

export default function Page(): JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <ProductSettingsPage />
    </div>
  );
}
