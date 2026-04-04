'use client';

import { BaseCategoryMapper } from '@/features/integrations/components/marketplaces/category-mapper/BaseCategoryMapper';
import { MarketplaceSelector } from '@/features/integrations/components/marketplaces/category-mapper/MarketplaceSelector';
import {
  type CategoryMapperMarketplace,
  CategoryMapperPageProvider,
  useCategoryMapperPageSelection,
} from '@/features/integrations/context/CategoryMapperPageContext';
import { SectionHeader, Card, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui';

function CategoryMapperPageContent(): React.JSX.Element {
  const { selectedConnectionId, selectedMarketplaceLabel, isSupportedConnection } =
    useCategoryMapperPageSelection();

  return (
    <div className='page-section'>
      <SectionHeader
        title='Category Mapper'
        description='Choose Base.com or Tradera, then select a connection to map external marketplace categories to your internal product categories.'
        className='mb-6'
      />

      <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-[280px_1fr]`}>
        {/* Sidebar */}
        <Card variant='subtle' padding='md' className='bg-card/40'>
          <MarketplaceSelector />
        </Card>

        {/* Main Content */}
        <Card variant='subtle' padding='lg' className='bg-card/40'>
          {!selectedConnectionId ? (
            <div className='flex h-64 items-center justify-center text-gray-500'>
              <p>Select a {selectedMarketplaceLabel} connection to start mapping categories.</p>
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

type CategoryMapperPageProps = {
  initialMarketplace?: CategoryMapperMarketplace;
};

export default function CategoryMapperPage({
  initialMarketplace,
}: CategoryMapperPageProps): React.JSX.Element {
  return (
    <CategoryMapperPageProvider initialMarketplace={initialMarketplace}>
      <CategoryMapperPageContent />
    </CategoryMapperPageProvider>
  );
}
