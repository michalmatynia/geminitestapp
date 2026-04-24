import { Button, SelectSimple } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

export function ProviderRoutingForm({ provider, setProvider, onSave, isSaving }: any) {
  const options = [{ value: 'mongodb', label: 'MongoDB' }, { value: 'redis', label: 'Redis' }];
  
  return (
    <FormSection title='Provider Routing' className='p-4'>
      <div className='flex items-center gap-3 mt-4'>
        <SelectSimple
          value={provider}
          onValueChange={setProvider}
          options={options}
          className='w-48'
        />
        <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
      </div>
    </FormSection>
  );
}
