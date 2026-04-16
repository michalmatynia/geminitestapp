'use client';

import dynamic from 'next/dynamic';
import { TabsContent } from '@/shared/ui/tabs';
import type { ProductDraftOpenFormTab } from '@/shared/contracts/products';
import ProductFormGeneral from './ProductFormGeneral';
import ProductFormOther from './ProductFormOther';

const DeferredTabPlaceholder = (): React.JSX.Element => (
  <div className='rounded-lg border border-border/60 bg-background/40 px-4 py-6 text-sm text-muted-foreground'>
    Loading tab...
  </div>
);

const ProductFormImages = dynamic(() => import('./ProductFormImages'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});
const ProductFormScans = dynamic(() => import('./ProductFormScans'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});
const ProductFormMarketplaceCopy = dynamic(() => import('./ProductFormMarketplaceCopy'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});
const ProductFormParameters = dynamic(() => import('./ProductFormParameters'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});
const ProductFormCustomFields = dynamic(() => import('./ProductFormCustomFields'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});
const ProductFormImportInfo = dynamic(() => import('./ProductFormImportInfo'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});
const ProductFormNotes = dynamic(() => import('./ProductFormNotes'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});
const ProductFormNoteLink = dynamic(() => import('./ProductFormNoteLink'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});
const ProductFormStudio = dynamic(() => import('./ProductFormStudio'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});

const ProductFormValidationTab = dynamic(
  () =>
    import('./ProductFormValidationTab').then((mod) => ({
      default: mod.ProductFormValidationTab,
    })),
  { ssr: false, loading: DeferredTabPlaceholder }
);

function DeferredTabsA({ mountedTabs }: { mountedTabs: Set<ProductDraftOpenFormTab> }): React.JSX.Element {
  return (
    <>
      <TabsContent value='parameters' className='mt-4 data-[state=inactive]:hidden'>{mountedTabs.has('parameters') && <ProductFormParameters />}</TabsContent>
      <TabsContent value='images' className='mt-4 data-[state=inactive]:hidden'>{mountedTabs.has('images') && <ProductFormImages />}</TabsContent>
      <TabsContent value='studio' className='mt-4 data-[state=inactive]:hidden'>{mountedTabs.has('studio') && <ProductFormStudio />}</TabsContent>
      <TabsContent value='marketplace-copy' className='mt-4 data-[state=inactive]:hidden'>{mountedTabs.has('marketplace-copy') && <ProductFormMarketplaceCopy />}</TabsContent>
    </>
  );
}

function DeferredTabsB({ mountedTabs }: { mountedTabs: Set<ProductDraftOpenFormTab> }): React.JSX.Element {
  return (
    <>
      <TabsContent value='custom-fields' className='mt-4 data-[state=inactive]:hidden'>{mountedTabs.has('custom-fields') && <ProductFormCustomFields />}</TabsContent>
      <TabsContent value='scans' className='mt-4 data-[state=inactive]:hidden'>{mountedTabs.has('scans') && <ProductFormScans />}</TabsContent>
      <TabsContent value='import-info' className='mt-4 data-[state=inactive]:hidden'>{mountedTabs.has('import-info') && <ProductFormImportInfo />}</TabsContent>
      <TabsContent value='notes' className='mt-4 data-[state=inactive]:hidden'>{mountedTabs.has('notes') && <ProductFormNotes />}</TabsContent>
      <TabsContent value='note-link' className='mt-4 data-[state=inactive]:hidden'>{mountedTabs.has('note-link') && <ProductFormNoteLink />}</TabsContent>
    </>
  );
}

export function ProductFormTabsContent({ mountedTabs }: { mountedTabs: Set<ProductDraftOpenFormTab> }): React.JSX.Element {
  return (
    <>
      <TabsContent value='general' className='mt-4 data-[state=inactive]:hidden' forceMount><ProductFormGeneral /></TabsContent>
      <TabsContent value='other' className='mt-4 data-[state=inactive]:hidden' forceMount><ProductFormOther /></TabsContent>
      <DeferredTabsA mountedTabs={mountedTabs} />
      <DeferredTabsB mountedTabs={mountedTabs} />
      <TabsContent value='validation' className='mt-4 space-y-4'><ProductFormValidationTab /></TabsContent>
    </>
  );
}
