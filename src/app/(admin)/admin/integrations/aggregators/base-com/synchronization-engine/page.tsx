import { type JSX } from 'react';

import { ProductSyncSettings } from '@/features/product-sync/public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';

export default function BaseSynchronizationEnginePage(): JSX.Element {
  return (
    <div className='page-section'>
      <SectionHeader
        title='Base.com Synchronization Engine'
        description='Configure scheduled product synchronization profiles between your app and Base.com.'
        className='mb-6'
      />
      <ProductSyncSettings />
    </div>
  );
}