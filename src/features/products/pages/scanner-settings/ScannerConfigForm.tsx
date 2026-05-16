import type { ChangeEvent, JSX } from 'react';

import { FormSection, Input } from '@/shared/ui/forms-and-actions.public';
import { Button } from '@/shared/ui/primitives.public';

type ScannerConfig = Record<string, unknown>;

interface ScannerConfigFormProps {
  config: ScannerConfig;
  onUpdate: (config: ScannerConfig) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

const readStringConfig = (config: ScannerConfig, key: string): string => {
  const value = config[key];
  return typeof value === 'string' ? value : '';
};

const readNumberConfig = (config: ScannerConfig, key: string): number | '' => {
  const value = config[key];
  return typeof value === 'number' ? value : '';
};

const parseTimeoutValue = (value: string): number => Number(value);

export function ScannerConfigForm({
  config,
  onUpdate,
  onSave,
  isSaving,
}: ScannerConfigFormProps): JSX.Element {
  const handleHostChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onUpdate({ host: event.target.value });
  };
  const handleTimeoutChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onUpdate({ timeout: parseTimeoutValue(event.target.value) });
  };
  const handleSaveClick = (): void => {
    onSave().catch((): undefined => undefined);
  };

  return (
    <FormSection title='Scanner Configuration' className='p-4 space-y-4'>
      <Input
        aria-label='Scanner Host'
        placeholder='Scanner Host'
        value={readStringConfig(config, 'host')}
        onChange={handleHostChange}
      />
      <Input
        aria-label='Connection Timeout (ms)'
        placeholder='Connection Timeout (ms)'
        type='number'
        value={readNumberConfig(config, 'timeout')}
        onChange={handleTimeoutChange}
      />
      <Button onClick={handleSaveClick} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Configuration'}
      </Button>
    </FormSection>
  );
}
