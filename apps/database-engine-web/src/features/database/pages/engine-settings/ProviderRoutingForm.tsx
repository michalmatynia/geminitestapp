import { Button } from '@/shared/ui/primitives.public';
import { FormSection, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { type Dispatch, type SetStateAction } from 'react';

type DatabaseEngineProvider = 'mongodb' | 'redis';

type ProviderRoutingFormProps = {
  provider: DatabaseEngineProvider;
  setProvider: Dispatch<SetStateAction<DatabaseEngineProvider>>;
  onSave: () => void;
  isSaving: boolean;
};

export function ProviderRoutingForm({
  provider,
  setProvider,
  onSave,
  isSaving,
}: ProviderRoutingFormProps): React.JSX.Element {
  const options = [
    { value: 'mongodb', label: 'MongoDB' },
    { value: 'redis', label: 'Redis' },
  ];
  const handleProviderChange = (value: string): void => {
    setProvider(value as DatabaseEngineProvider);
  };

  return (
    <FormSection title='Provider Routing' className='p-4'>
      <div className='flex items-center gap-3 mt-4'>
        <SelectSimple
          value={provider}
          onValueChange={handleProviderChange}
          options={options}
          className='w-48'
        />
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </FormSection>
  );
}
