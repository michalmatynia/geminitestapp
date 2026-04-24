import { FormSection, Input } from '@/shared/ui/forms-and-actions.public';
import { Button } from '@/shared/ui/primitives.public';

export function ScannerConfigForm({ config, onUpdate, onSave, isSaving }: any) {
  return (
    <FormSection title='Scanner Configuration' className='p-4 space-y-4'>
      <Input label='Scanner Host' value={config.host ?? ''} onChange={(e) => onUpdate({ host: e.target.value })} />
      <Input label='Connection Timeout (ms)' type='number' value={config.timeout ?? ''} onChange={(e) => onUpdate({ timeout: Number(e.target.value) })} />
      <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Configuration'}</Button>
    </FormSection>
  );
}
