import { Button, Input, Label, Checkbox, FormField } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import type { AuthSecurityPolicy } from '@/features/auth/utils/auth-security';

export function SecurityPolicyForm({
  securityPolicy,
  setSecurityPolicy,
  setSecurityDirty,
  onSave,
  isSaving,
  securityDirty,
}: {
  securityPolicy: AuthSecurityPolicy;
  setSecurityPolicy: React.Dispatch<React.SetStateAction<AuthSecurityPolicy>>;
  setSecurityDirty: (val: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
  securityDirty: boolean;
}) {
  const updatePolicy = (key: keyof AuthSecurityPolicy, value: any) => {
    setSecurityPolicy((prev) => ({ ...prev, [key]: value }));
    setSecurityDirty(true);
  };

  return (
    <FormSection
      title='Security policy'
      description='Control password strength and login protection rules.'
      className='p-4'
      actions={
        <Button onClick={onSave} disabled={!securityDirty || isSaving}>
          {isSaving ? 'Saving...' : 'Save security policy'}
        </Button>
      }
    >
      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 mt-4`}>
        <FormField label='Minimum password length'>
          <Input type='number' value={securityPolicy.minPasswordLength} onChange={(e) => updatePolicy('minPasswordLength', Number(e.target.value))} />
        </FormField>
        <FormField label='Require strong password'>
          <Checkbox checked={securityPolicy.requireStrongPassword} onCheckedChange={(c) => updatePolicy('requireStrongPassword', Boolean(c))} />
        </FormField>
        <div className='md:col-span-2 flex flex-wrap gap-4 text-xs'>
          {(['requireUppercase', 'requireLowercase', 'requireNumber', 'requireSymbol'] as const).map(key => (
            <Label key={key} className='flex items-center gap-2'>
              <Checkbox checked={securityPolicy[key]} onCheckedChange={(c) => updatePolicy(key, Boolean(c))} />
              {key}
            </Label>
          ))}
        </div>
        <FormField label='Email lockout attempts'>
          <Input type='number' value={securityPolicy.lockoutMaxAttempts} onChange={(e) => updatePolicy('lockoutMaxAttempts', Number(e.target.value))} />
        </FormField>
        {/* Additional fields similarly mapped... */}
      </div>
    </FormSection>
  );
}
