'use client';

import Link from 'next/link';
import { Alert } from '@/shared/ui/primitives.public';
import { PanelHeader } from '@/shared/ui/templates.public';
import { useSettingsController } from './settings/useSettingsController';
import { DefaultRoleSettings } from './settings/DefaultRoleSettings';
import { SecurityPolicyForm } from './settings/SecurityPolicyForm';
import { MfaSettings } from './settings/MfaSettings';
import { useMemo } from 'react';
import type { AuthRole } from '@/features/auth/utils/auth-management';

export default function AuthSettingsPage(): React.JSX.Element {
  const ctrl = useSettingsController();
  const roleOptions = useMemo(() => ctrl.roles.map((r: AuthRole) => ({ value: r.id, label: r.name })), [ctrl.roles]);

  return (
    <div className='page-section max-w-5xl space-y-6'>
      <PanelHeader title='Auth Settings' description='Authentication data source is managed globally.' />
      
      <DefaultRoleSettings
        defaultRole={ctrl.defaultRole}
        setDefaultRole={ctrl.setDefaultRole}
        setDefaultDirty={ctrl.setDefaultDirty}
        onSave={ctrl.saveDefaultRole}
        roleOptions={roleOptions}
        disabled={false}
        isSaving={ctrl.isSaving}
        defaultDirty={ctrl.defaultDirty}
      />

      <SecurityPolicyForm
        securityPolicy={ctrl.securityPolicy}
        setSecurityPolicy={ctrl.setSecurityPolicy}
        setSecurityDirty={ctrl.setSecurityDirty}
        onSave={ctrl.saveSecurityPolicy}
        isSaving={ctrl.isSaving}
        securityDirty={ctrl.securityDirty}
      />

      <MfaSettings
        enabled={Boolean(ctrl.userSecurityQuery.data?.mfaEnabled)}
        onSetup={() => {}}
        onVerify={() => {}}
        onDisable={() => {}}
        mfaSetupMutation={ctrl.mfaSetupMutation}
        mfaVerifyMutation={ctrl.mfaVerifyMutation}
        mfaDisableMutation={ctrl.mfaDisableMutation}
      />

      <Alert variant='warning' className='p-4 text-sm'>
        Go to Workflow Database -&gt; Database Engine to configure provider routing.
      </Alert>
      <Link href='/admin/databases/engine' className='text-sm font-semibold text-blue-400 underline'>
        Open Database Engine
      </Link>
    </div>
  );
}
