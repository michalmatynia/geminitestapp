import { FormSection, Input, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Button } from '@/shared/ui/primitives.public';

export function ProductDefaultsForm({ settings, onUpdate, onSave, isSaving }: any) {
  return (
    <FormSection title='Catalog Defaults' className='p-4 space-y-4'>
      <Input label='Default Product Name' value={settings.defaultName ?? ''} onChange={(e) => onUpdate({ defaultName: e.target.value })} />
      <SelectSimple
        label='Default Status'
        value={settings.defaultStatus ?? 'draft'}
        onValueChange={(v) => onUpdate({ defaultStatus: v })}
        options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]}
      />
      <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Defaults'}</Button>
    </FormSection>
  );
}
