'use client';

import { BaseCategoryMapper } from '@/shared/lib/integrations/components/marketplaces/category-mapper/BaseCategoryMapper';
import { MarketplaceSelector } from '@/shared/lib/integrations/components/marketplaces/category-mapper/MarketplaceSelector';
import {
  CategoryMapperPageProvider,
  useCategoryMapperPageContext,
} from '@/shared/lib/integrations/context/CategoryMapperPageContext';
import { SectionHeader, Card } from '@/shared/ui';

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
        <Card variant='subtle' padding='md' className='bg-card/40'>
          <MarketplaceSelector />
        </Card>

        {/* Main Content */}
        <Card variant='subtle' padding='lg' className='bg-card/40'>
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
        </Card>
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
