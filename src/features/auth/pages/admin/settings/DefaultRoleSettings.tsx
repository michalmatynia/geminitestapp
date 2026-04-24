import { Button, SelectSimple } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import type { LabeledOptionDto } from '@/shared/contracts/base';

export function DefaultRoleSettings({
  defaultRole,
  setDefaultRole,
  setDefaultDirty,
  onSave,
  roleOptions,
  disabled,
  isSaving,
  defaultDirty,
}: {
  defaultRole: string;
  setDefaultRole: (val: string) => void;
  setDefaultDirty: (val: boolean) => void;
  onSave: () => void;
  roleOptions: LabeledOptionDto<string>[];
  disabled: boolean;
  isSaving: boolean;
  defaultDirty: boolean;
}): React.JSX.Element {
  return (
    <FormSection
      title='Default role'
      description='Users without an explicit role will receive this role.'
      className='p-4'
      variant='subtle'
    >
      <div className='mt-4 flex flex-wrap items-center gap-3'>
        <SelectSimple
          size='sm'
          value={defaultRole}
          onValueChange={(value: string) => {
            setDefaultRole(value);
            setDefaultDirty(true);
          }}
          disabled={disabled}
          options={roleOptions}
          placeholder='Select default role'
        />
        <Button onClick={onSave} disabled={!defaultDirty || isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </FormSection>
  );
}
