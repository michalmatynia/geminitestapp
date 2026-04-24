import { FormSection, Input } from '@/shared/ui/forms-and-actions.public';

export function TaxationSettingsPanel({ settings, onUpdate }: any) {
  return (
    <FormSection title='Taxation Rules' className='p-4 space-y-4'>
      <Input label='VAT Rate (%)' type='number' value={settings.vatRate ?? ''} onChange={(e) => onUpdate({ vatRate: Number(e.target.value) })} />
      <Input label='Tax Region' value={settings.taxRegion ?? ''} onChange={(e) => onUpdate({ taxRegion: e.target.value })} />
    </FormSection>
  );
}
