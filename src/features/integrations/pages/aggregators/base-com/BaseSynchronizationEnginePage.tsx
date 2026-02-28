'use client';

import { ProductSyncSettings } from '@/features/product-sync/components/ProductSyncSettings';
import { SectionHeader } from '@/shared/ui';

export default function BaseSynchronizationEnginePage(): React.JSX.Element {
  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Base.com Synchronization Engine'
        description='Configure scheduled product synchronization profiles between your app and Base.com.'
        className='mb-6'
      />
      <ProductSyncSettings />
    </div>
  );
}
