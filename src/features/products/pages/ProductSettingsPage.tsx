'use client';

import { useProductSettingsController } from './product-settings/useProductSettingsController';
import { ProductDefaultsForm } from './product-settings/ProductDefaultsForm';
import { ProductLabelingSettings } from './product-settings/ProductLabelingSettings';
import { TaxationSettingsPanel } from './product-settings/TaxationSettingsPanel';

export default function ProductSettingsPage(): React.JSX.Element {
  const ctrl = useProductSettingsController();

  return (
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
    </div>
  );
}
