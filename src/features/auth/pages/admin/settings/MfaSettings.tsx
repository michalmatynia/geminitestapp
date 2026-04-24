import { useState } from 'react';
import { Button, Input, FormField, Alert } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { insetPanelVariants } from '@/shared/ui/navigation-and-layout.public';

export function MfaSettings({
  enabled,
  onSetup,
  onVerify,
  onDisable,
  mfaSetupMutation,
  mfaVerifyMutation,
  mfaDisableMutation,
}: {
  enabled: boolean;
  onSetup: () => void;
  onVerify: (token: string) => void;
  onDisable: (code: string) => void;
  mfaSetupMutation: any;
  mfaVerifyMutation: any;
  mfaDisableMutation: any;
}) {
  const [token, setToken] = useState('');
  const [disableCode, setDisableCode] = useState('');

  return (
    <FormSection title='Multi-factor authentication' description='Enable MFA for your account.' className='p-4'>
      <div className='mt-4 space-y-4'>
        <div className='text-xs text-gray-400'>Status: {enabled ? 'Enabled' : 'Disabled'}</div>
        {!enabled ? (
          <div className='space-y-3'>
            <Button onClick={onSetup} disabled={mfaSetupMutation.isPending}>Start MFA setup</Button>
            {/* MFA setup/verify UI here */}
          </div>
        ) : (
          <div className='space-y-2'>
            <FormField label='Disable MFA (enter code)'>
              <Input value={disableCode} onChange={(e) => setDisableCode(e.target.value)} />
            </FormField>
            <Button variant='outline' onClick={() => onDisable(disableCode)} disabled={mfaDisableMutation.isPending}>Disable MFA</Button>
          </div>
        )}
      </div>
    </FormSection>
  );
}
