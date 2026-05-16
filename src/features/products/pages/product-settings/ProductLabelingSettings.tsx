import type { ChangeEvent } from 'react';

import { FormSection, Input } from '@/shared/ui/forms-and-actions.public';

type ProductLabelingSettingsProps = {
  settings: Record<string, unknown>;
  onUpdate: (settings: Record<string, unknown>) => void;
};

const getStringSetting = (
  settings: Record<string, unknown>,
  key: string
): string => {
  const value = settings[key];
  return typeof value === 'string' ? value : '';
};

export function ProductLabelingSettings({
  settings,
  onUpdate,
}: ProductLabelingSettingsProps): React.JSX.Element {
  const handleBarcodePrefixChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onUpdate({ barcodePrefix: event.target.value });
  };

  const handleLabelTemplateChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onUpdate({ labelTemplate: event.target.value });
  };

  return (
    <FormSection title='Labeling Configuration' className='p-4 space-y-4'>
      <Input
        aria-label='Barcode Prefix'
        placeholder='Barcode Prefix'
        value={getStringSetting(settings, 'barcodePrefix')}
        onChange={handleBarcodePrefixChange}
      />
      <Input
        aria-label='Label Template'
        placeholder='Label Template'
        value={getStringSetting(settings, 'labelTemplate')}
        onChange={handleLabelTemplateChange}
      />
    </FormSection>
  );
}
