import type { ChangeEvent } from 'react';

import { FormSection, Input } from '@/shared/ui/forms-and-actions.public';

type TaxationSettingsPanelProps = {
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

const getNumberSettingInputValue = (
  settings: Record<string, unknown>,
  key: string
): string | number => {
  const value = settings[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
};

export function TaxationSettingsPanel({
  settings,
  onUpdate,
}: TaxationSettingsPanelProps): React.JSX.Element {
  const handleVatRateChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onUpdate({ vatRate: Number(event.target.value) });
  };

  const handleTaxRegionChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onUpdate({ taxRegion: event.target.value });
  };

  return (
    <FormSection title='Taxation Rules' className='p-4 space-y-4'>
      <Input
        label='VAT Rate (%)'
        type='number'
        value={getNumberSettingInputValue(settings, 'vatRate')}
        onChange={handleVatRateChange}
      />
      <Input
        label='Tax Region'
        value={getStringSetting(settings, 'taxRegion')}
        onChange={handleTaxRegionChange}
      />
    </FormSection>
  );
}
