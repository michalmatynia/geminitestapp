'use client';

import { useEffect, useState } from 'react';


import { useAuth } from '@/features/auth/context/AuthContext';
import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import {
  type AuthUserPageSettings,
} from '@/features/auth/utils/auth-user-pages';
import { logClientError } from '@/features/observability';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Switch, useToast, SectionHeader, SectionPanel } from '@/shared/ui';
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
      <SectionPanel className="p-6 text-sm text-gray-400">
        Loading user page settings...
      </SectionPanel>
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
  updateSetting: any; // Use proper type if possible
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
    <div className="space-y-6">
      <SectionPanel className="p-6">
        <SectionHeader
          title="User Pages"
          description="Configure which authentication flows are available in the public UI."
        />
      </SectionPanel>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white text-lg">Authentication Flows</CardTitle>
          <CardDescription className="text-gray-500">
            Toggle each flow on/off. Password strength rules live in Auth Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ['allowSignup', 'Allow sign-up', 'Enable self-service user registration.'],
              ['allowPasswordReset', 'Allow password reset', 'Enable forgot-password flow.'],
              ['allowSocialLogin', 'Allow social login', 'Show OAuth providers on login.'],
              ['requireEmailVerification', 'Require email verification', 'Block access until email is verified.'],
            ] as const
          ).map(([key, title, description]: readonly [keyof AuthUserPageSettings, string, string]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-md border border-border bg-card/40 px-4 py-3"
            >
              <div>
                <Label className="text-sm text-gray-200">{title}</Label>
                <div className="text-xs text-gray-500">{description}</div>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={!dirty || updateSetting.isPending}
        >
          {updateSetting.isPending ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
