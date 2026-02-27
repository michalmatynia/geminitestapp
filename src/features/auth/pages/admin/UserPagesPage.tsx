'use client';

import { useEffect, useState } from 'react';


import { useAuth } from '@/features/auth/context/AuthContext';
import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import {
  type AuthUserPageSettings,
} from '@/features/auth/utils/auth-user-pages';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast,  FormSection, ToggleRow, FormActions, LoadingState } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

export default function AuthUserPagesPage(): React.JSX.Element {
  const {
    userPageSettings: contextSettings,
    isLoading,
    updateSetting,
    refetchSettings,
  } = useAuth();

  if (isLoading) {
    return (
      <div className='container mx-auto py-10'>
        <LoadingState message='Loading user page settings...' />
      </div>
    );
  }

  return (
    <AuthUserPagesForm
      initialSettings={contextSettings}
      updateSetting={updateSetting}
      refetchSettings={refetchSettings}
    />
  );
}

function AuthUserPagesForm({
  initialSettings,
  updateSetting,
  refetchSettings,
}: {
  initialSettings: AuthUserPageSettings;
  updateSetting: ReturnType<typeof useUpdateSetting>;
  refetchSettings: () => Promise<unknown>;
}): React.JSX.Element {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AuthUserPageSettings>(initialSettings);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSettings(initialSettings);
    setDirty(false);
  }, [initialSettings]);

  const handleToggle = (key: keyof AuthUserPageSettings): void => {
    setSettings((prev: AuthUserPageSettings) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const handleSave = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: AUTH_SETTINGS_KEYS.userPages,
        value: serializeSetting(settings),
      });
      setDirty(false);
      await refetchSettings();
      toast('User page settings saved', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AuthUserPagesPage', action: 'saveSettings' } });
      toast('Failed to save user page settings', { variant: 'error' });
    }
  };

  return (
    <div className='space-y-6'>
      <FormSection
        title='User Pages'
        description='Configure which authentication flows are available in the public UI.'
        className='p-6'
      >
        <div className='mt-4 text-sm text-gray-400'>
          Control which auth flows are visible to end users.
        </div>
      </FormSection>

      <FormSection
        title='Authentication Flows'
        description='Toggle each flow on/off. Password strength rules live in Auth Settings.'
        className='p-6'
      >
        <div className='space-y-3 mt-4'>
          {(
            [
              ['allowSignup', 'Allow sign-up', 'Enable self-service user registration.'],
              ['allowPasswordReset', 'Allow password reset', 'Enable forgot-password flow.'],
              ['allowSocialLogin', 'Allow social login', 'Show OAuth providers on login.'],
              ['requireEmailVerification', 'Require email verification', 'Block access until email is verified.'],
            ] as const
          ).map(([key, title, description]: readonly [keyof AuthUserPageSettings, string, string]) => (
            <ToggleRow
              key={key}
              label={title}
              description={description}
              checked={settings[key]}
              onCheckedChange={() => handleToggle(key)}
              type='switch'
            />
          ))}
        </div>
      </FormSection>

      <FormActions
        onSave={() => { void handleSave(); }}
        saveText='Save user page settings'
        isDisabled={!dirty || updateSetting.isPending}
        isSaving={updateSetting.isPending}
        className='mt-6'
      />
    </div>
  );
}
