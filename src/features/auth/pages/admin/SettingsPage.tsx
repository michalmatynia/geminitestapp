'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';


import { disableMfa, setupMfa, verifyMfa } from '@/features/auth/api/mfa';
import { useAuthUserSecurity } from '@/features/auth/hooks/useAuthQueries';
import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_ROLES,
  mergeDefaultRoles,
  type AuthRole,
} from '@/features/auth/utils/auth-management';
import {
  DEFAULT_AUTH_SECURITY_POLICY,
  normalizeAuthSecurityPolicy,
  type AuthSecurityPolicy,
} from '@/features/auth/utils/auth-security';
import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast, SectionHeader, SectionPanel, Checkbox } from '@/shared/ui';
import { parseJsonSetting } from '@/shared/utils/settings-json';


export default function AuthSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [roles, setRoles] = useState<AuthRole[]>(DEFAULT_AUTH_ROLES);
  const [defaultRole, setDefaultRole] = useState<string>('viewer');
  const [securityPolicy, setSecurityPolicy] = useState<AuthSecurityPolicy>(
    DEFAULT_AUTH_SECURITY_POLICY
  );
  const [defaultDirty, setDefaultDirty] = useState(false);
  const [securityDirty, setSecurityDirty] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpAuth, setMfaOtpAuth] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaDisableCode, setMfaDisableCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const settingsQuery = useSettingsMap();
  const updateDefaultRole = useUpdateSetting();
  const updateSecurityPolicy = useUpdateSetting();
  const mfaSetupMutation = useMutation({ mutationFn: setupMfa });
  const mfaVerifyMutation = useMutation({ mutationFn: verifyMfa });
  const mfaDisableMutation = useMutation({ mutationFn: disableMfa });
  const userSecurityQuery = useAuthUserSecurity(session?.user?.id);

  useEffect(() => {
    if (!settingsQuery.error) return;
    logClientError(settingsQuery.error, { context: { source: 'AuthSettingsPage', action: 'loadSettings' } });
    toast('Failed to load auth settings.', { variant: 'error' });
  }, [settingsQuery.error, toast]);

  const roleOptions = useMemo(
    () =>
      mergeDefaultRoles(roles).map((role: AuthRole) => ({
        id: role.id,
        name: role.name,
      })),
    [roles]
  );

  useEffect(() => {
    if (!settingsQuery.data) return;
    const storedRoles = mergeDefaultRoles(
      parseJsonSetting<AuthRole[]>(
        settingsQuery.data.get(AUTH_SETTINGS_KEYS.roles),
        DEFAULT_AUTH_ROLES
      )
    );
    setRoles(storedRoles);
    const storedDefault = settingsQuery.data.get(AUTH_SETTINGS_KEYS.defaultRole);
    const nextDefault =
      storedDefault && storedRoles.some((role: AuthRole) => role.id === storedDefault)
        ? storedDefault
        : storedRoles.find((role: AuthRole) => role.id === 'viewer')?.id ??
          storedRoles[0]?.id ??
          'viewer';
    setDefaultRole(nextDefault);
    setDefaultDirty(false);

    const storedPolicyRaw = settingsQuery.data.get(AUTH_SETTINGS_KEYS.securityPolicy);
    const parsedPolicy = storedPolicyRaw
      ? normalizeAuthSecurityPolicy(parseJsonSetting<Partial<AuthSecurityPolicy>>(storedPolicyRaw, DEFAULT_AUTH_SECURITY_POLICY))
      : DEFAULT_AUTH_SECURITY_POLICY;
    setSecurityPolicy(parsedPolicy);
    setSecurityDirty(false);
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!userSecurityQuery.data) return;
    setMfaEnabled(Boolean(userSecurityQuery.data.mfaEnabled));
  }, [userSecurityQuery.data]);

  const saveDefaultRole = async (): Promise<void> => {
    try {
      await updateDefaultRole.mutateAsync({
        key: AUTH_SETTINGS_KEYS.defaultRole,
        value: defaultRole,
      });
      setDefaultDirty(false);
      toast('Default role saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AuthSettingsPage', action: 'saveDefaultRole' } });
      toast(
        error instanceof Error ? error.message : 'Failed to save settings.',
        { variant: 'error' }
      );
    }
  };

  const saveSecurityPolicy = async (): Promise<void> => {
    try {
      await updateSecurityPolicy.mutateAsync({
        key: AUTH_SETTINGS_KEYS.securityPolicy,
        value: JSON.stringify(securityPolicy),
      });
      setSecurityDirty(false);
      toast('Security policy saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AuthSettingsPage', action: 'saveSecurityPolicy' } });
      toast(
        error instanceof Error ? error.message : 'Failed to save security policy.',
        { variant: 'error' }
      );
    }
  };

  const handleMfaSetup = async (): Promise<void> => {
    try {
      setMfaSecret(null);
      setMfaOtpAuth(null);
      setRecoveryCodes([]);
      const res = await mfaSetupMutation.mutateAsync();
      if (!res.ok) throw new Error('Failed to start MFA setup.');
      const payload = res.payload;
      setMfaSecret(payload.secret ?? null);
      setMfaOtpAuth(payload.otpauthUrl ?? null);
      toast('MFA setup started. Enter the code from your authenticator app.', {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error, { context: { source: 'AuthSettingsPage', action: 'handleMfaSetup' } });
      toast(
        error instanceof Error ? error.message : 'Failed to start MFA setup.',
        { variant: 'error' }
      );
    }
  };

  const handleMfaVerify = async (): Promise<void> => {
    if (!mfaToken.trim()) {
      toast('Enter the MFA code from your authenticator app.', { variant: 'error' });
      return;
    }
    try {
      const res = await mfaVerifyMutation.mutateAsync(mfaToken.trim());
      const payload = res.payload;
      if (!res.ok) {
        throw new Error(payload.message ?? 'Failed to verify MFA.');
      }
      setRecoveryCodes(payload.recoveryCodes ?? []);
      setMfaEnabled(true);
      setMfaToken('');
      toast('MFA enabled. Save your recovery codes.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AuthSettingsPage', action: 'handleMfaVerify' } });
      toast(error instanceof Error ? error.message : 'Failed to verify MFA.', {
        variant: 'error',
      });
    }
  };

  const handleMfaDisable = async (): Promise<void> => {
    if (!mfaDisableCode.trim()) {
      toast('Enter a code to disable MFA.', { variant: 'error' });
      return;
    }
    try {
      const res = await mfaDisableMutation.mutateAsync({
        token: mfaDisableCode.trim(),
        recoveryCode: mfaDisableCode.trim(),
      });
      const payload = res.payload;
      if (!res.ok) {
        throw new Error(payload.message ?? 'Failed to disable MFA.');
      }
      setMfaEnabled(false);
      setMfaSecret(null);
      setMfaOtpAuth(null);
      setRecoveryCodes([]);
      setMfaDisableCode('');
      toast('MFA disabled.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AuthSettingsPage', action: 'handleMfaDisable' } });
      toast(error instanceof Error ? error.message : 'Failed to disable MFA.', {
        variant: 'error',
      });
    }
  };

  return (
    <SectionPanel className="p-6 space-y-6">
      <SectionHeader
        title="Auth Settings"
        description="Authentication data source is managed globally."
      />

      <div className="rounded-md border border-border bg-card p-4">
        <h2 className="text-lg font-semibold text-white">Default role</h2>
        <p className="mt-1 text-xs text-gray-400">
          Users without an explicit role will receive this role. To avoid
          unintended access, set this to a low-privilege role.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Select
            value={defaultRole}
            onValueChange={(value: string) => {
              setDefaultRole(value);
              setDefaultDirty(true);
            }}
            disabled={settingsQuery.isPending}
          >
            <SelectTrigger className="w-64 bg-gray-900 border text-white">
              <SelectValue placeholder="Select default role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role: { id: string; name: string }) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => void saveDefaultRole()}
            disabled={!defaultDirty || updateDefaultRole.isPending}
          >
            {updateDefaultRole.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Security policy</h2>
          <p className="mt-1 text-xs text-gray-400">
            Control password strength and login protection rules.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Minimum password length</Label>
            <Input
              type="number"
              min={6}
              max={64}
              value={securityPolicy.minPasswordLength}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                  ...prev,
                  minPasswordLength: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Require strong password</Label>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={securityPolicy.requireStrongPassword} onCheckedChange={(checked: boolean | 'indeterminate') => {
                  setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                    ...prev,
                    requireStrongPassword: Boolean(checked),
                  }));
                  setSecurityDirty(true);
                }}
                className="h-4 w-4 rounded border bg-gray-900"
              />
              <span className="text-xs text-gray-400">
                Enforce uppercase, lowercase, number, and symbol.
              </span>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs text-gray-300">Password rules</Label>
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              {(
                [
                  ['requireUppercase', 'Uppercase'],
                  ['requireLowercase', 'Lowercase'],
                  ['requireNumber', 'Number'],
                  ['requireSymbol', 'Symbol'],
                ] as const
              ).map(([key, label]: readonly ['requireUppercase' | 'requireLowercase' | 'requireNumber' | 'requireSymbol', string]) => (
                <Label key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={securityPolicy[key]} onCheckedChange={(checked: boolean | 'indeterminate') => {
                      setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                        ...prev,
                        [key]: Boolean(checked),
                      }));
                      setSecurityDirty(true);
                    }}
                    className="h-4 w-4 rounded border bg-gray-900"
                  />
                  {label}
                </Label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Email lockout attempts</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={securityPolicy.lockoutMaxAttempts}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                  ...prev,
                  lockoutMaxAttempts: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Email lockout window (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={securityPolicy.lockoutWindowMinutes}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                  ...prev,
                  lockoutWindowMinutes: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Email lockout duration (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={securityPolicy.lockoutDurationMinutes}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                  ...prev,
                  lockoutDurationMinutes: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">IP rate limit attempts</Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={securityPolicy.ipRateLimitMaxAttempts}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                  ...prev,
                  ipRateLimitMaxAttempts: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">IP rate limit window (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={securityPolicy.ipRateLimitWindowMinutes}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                  ...prev,
                  ipRateLimitWindowMinutes: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">IP rate limit duration (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={securityPolicy.ipRateLimitDurationMinutes}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                  ...prev,
                  ipRateLimitDurationMinutes: Number(event.target.value),
                }));
                setSecurityDirty(true);
              }}
              className="bg-gray-900 border text-white"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => void saveSecurityPolicy()}
            disabled={!securityDirty || updateSecurityPolicy.isPending}
          >
            {updateSecurityPolicy.isPending ? 'Saving...' : 'Save security policy'}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Multi-factor authentication</h2>
          <p className="mt-1 text-xs text-gray-400">
            Enable MFA for your account and store recovery codes securely.
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Status: {mfaEnabled ? 'Enabled' : 'Disabled'}
        </div>
        {!mfaEnabled ? (
          <div className="space-y-3">
            <Button onClick={() => void handleMfaSetup()} disabled={mfaSetupMutation.isPending}>
              {mfaSetupMutation.isPending ? 'Starting...' : 'Start MFA setup'}
            </Button>
            {mfaSecret ? (
              <div className="rounded-md border border-border bg-card/40 p-3 text-xs text-gray-300 space-y-2">
                <div>Secret: {mfaSecret}</div>
                {mfaOtpAuth ? <div>OTP URL: {mfaOtpAuth}</div> : null}
              </div>
            ) : null}
            {mfaSecret ? (
              <div className="space-y-2">
                <Label className="text-xs text-gray-300">Enter MFA code</Label>
                <Input
                  value={mfaToken}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMfaToken(event.target.value)}
                  className="bg-gray-900 border text-white"
                  placeholder="123456"
                />
                <Button onClick={() => void handleMfaVerify()} disabled={mfaVerifyMutation.isPending}>
                  {mfaVerifyMutation.isPending ? 'Verifying...' : 'Verify & enable'}
                </Button>
              </div>
            ) : null}
            {recoveryCodes.length > 0 ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                <div className="font-semibold">Recovery codes (save these now)</div>
                <div className="mt-2 grid gap-1">
                  {recoveryCodes.map((code: string) => (
                    <div key={code}>{code}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Disable MFA (enter code)</Label>
            <Input
              value={mfaDisableCode}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMfaDisableCode(event.target.value)}
              className="bg-gray-900 border text-white"
              placeholder="MFA code or recovery code"
            />
            <Button
              variant="outline"
              onClick={() => void handleMfaDisable()}
              disabled={mfaDisableMutation.isPending}
            >
              {mfaDisableMutation.isPending ? 'Disabling...' : 'Disable MFA'}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        Go to Settings → Database to choose the global provider for the entire app.
      </div>
      <div>
        <Link
          href="/admin/settings/database"
          className="text-sm font-semibold text-blue-400 underline"
        >
          Open Database Settings
        </Link>
      </div>
    </SectionPanel>
  );
}
