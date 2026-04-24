'use client';

import { useProductSettingsController } from './product-settings/useProductSettingsController';
import { ProductDefaultsForm } from './product-settings/ProductDefaultsForm';
import { ProductLabelingSettings } from './product-settings/ProductLabelingSettings';
import { TaxationSettingsPanel } from './product-settings/TaxationSettingsPanel';

type ProductSettingsPageProps = {
  internationalizationSettingsSlot?: React.ReactNode;
  internationalizationProvider?: React.ComponentType<{ children: React.ReactNode }>;
  internationalizationModalsSlot?: React.ReactNode;
  productSyncSettingsSlot?: React.ReactNode;
};

export function ProductSettingsPage({
  internationalizationSettingsSlot,
  internationalizationProvider: InternationalizationProvider,
  internationalizationModalsSlot,
  productSyncSettingsSlot,
}: ProductSettingsPageProps = {}): React.JSX.Element {
  const ctrl = useProductSettingsController();

  const content = (
    <div className='page-section max-w-3xl space-y-6'>
      <h1 className='text-xl font-semibold text-white'>Product Settings</h1>
      
      <ProductDefaultsForm
        settings={ctrl.settings}
        onUpdate={ctrl.handleUpdate}
        onSave={ctrl.saveSettings}
        isSaving={ctrl.isSaving}
      />

      <ProductLabelingSettings settings={ctrl.settings} onUpdate={ctrl.handleUpdate} />
      
      <TaxationSettingsPanel settings={ctrl.settings} onUpdate={ctrl.handleUpdate} />
      {productSyncSettingsSlot}
      {internationalizationSettingsSlot}
      {internationalizationModalsSlot}
    </div>
  );

  return InternationalizationProvider ? (
    <InternationalizationProvider>{content}</InternationalizationProvider>
  ) : (
    content
  );
}

export default ProductSettingsPage;
