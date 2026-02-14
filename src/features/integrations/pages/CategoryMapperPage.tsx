'use client';

import { BaseCategoryMapper } from '@/features/integrations/components/marketplaces/category-mapper/BaseCategoryMapper';
import { MarketplaceSelector } from '@/features/integrations/components/marketplaces/category-mapper/MarketplaceSelector';
import {
  CategoryMapperPageProvider,
  useCategoryMapperPageContext,
} from '@/features/integrations/context/CategoryMapperPageContext';
import { SectionHeader } from '@/shared/ui';

function CategoryMapperPageContent(): React.JSX.Element {
  const { selectedConnectionId, isSupportedConnection } = useCategoryMapperPageContext();

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Category, Producer & Tag Mapper'
        description='Map external marketplace categories, producers, and tags to internal records for reliable import and export.'
        className='mb-6'
      />

      <div className='grid gap-6 md:grid-cols-[280px_1fr]'>
        {/* Sidebar */}
        <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
          <MarketplaceSelector />
        </div>

        {/* Main Content */}
        <div className='rounded-lg border border-border/60 bg-card/40 p-6'>
          {!selectedConnectionId ? (
            <div className='flex h-64 items-center justify-center text-gray-500'>
              <p>Select a marketplace connection to start mapping categories.</p>
            </div>
          ) : isSupportedConnection ? (
            <BaseCategoryMapper />
          ) : (
            <div className='flex h-64 items-center justify-center text-gray-500'>
              <p>Category mapping is not yet supported for this marketplace.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CategoryMapperPage(): React.JSX.Element {
  return (
    <CategoryMapperPageProvider>
      <CategoryMapperPageContent />
    </CategoryMapperPageProvider>
  );
}
