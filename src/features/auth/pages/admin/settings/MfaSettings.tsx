import { useState } from 'react';
import { Button, Input } from '@/shared/ui/primitives.public';
import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import type {
  MfaDisableResponse,
  MfaSetupResponse,
  MfaVerifyResponse,
} from '@/shared/contracts/auth';

type MfaSetupMutation = MutationResult<{ ok: boolean; payload: MfaSetupResponse }, void>;
type MfaVerifyMutation = MutationResult<{ ok: boolean; payload: MfaVerifyResponse }, string>;
type MfaDisableMutation = MutationResult<
  { ok: boolean; payload: MfaDisableResponse },
  string | { token?: string; recoveryCode?: string }
>;

export function MfaSettings({
  enabled,
  onSetup,
  onVerify: _onVerify,
  onDisable,
  mfaSetupMutation,
  mfaVerifyMutation: _mfaVerifyMutation,
  mfaDisableMutation,
}: {
  enabled: boolean;
  onSetup: () => void;
  onVerify: (token: string) => void;
  onDisable: (code: string) => void;
  mfaSetupMutation: MfaSetupMutation;
  mfaVerifyMutation: MfaVerifyMutation;
  mfaDisableMutation: MfaDisableMutation;
}): React.JSX.Element {
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
