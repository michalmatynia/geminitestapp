import { FormSection, Input } from '@/shared/ui/forms-and-actions.public';

export function ProductLabelingSettings({ settings, onUpdate }: any) {
  return (
    <FormSection title='Labeling Configuration' className='p-4 space-y-4'>
      <Input label='Barcode Prefix' value={settings.barcodePrefix ?? ''} onChange={(e) => onUpdate({ barcodePrefix: e.target.value })} />
      <Input label='Label Template' value={settings.labelTemplate ?? ''} onChange={(e) => onUpdate({ labelTemplate: e.target.value })} />
    </FormSection>
  );
}
