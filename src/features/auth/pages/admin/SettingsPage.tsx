'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { disableMfa, setupMfa, verifyMfa } from '@/features/auth/api/mfa';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthUserSecurity } from '@/features/auth/hooks/useAuthQueries';
import { AUTH_SETTINGS_KEYS, type AuthRole } from '@/features/auth/utils/auth-management';
import { type AuthSecurityPolicy } from '@/features/auth/utils/auth-security';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { ApiError } from '@/shared/lib/api-client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Button, Input, Label, useToast, Checkbox, Alert } from '@/shared/ui/primitives.public';
import { PanelHeader } from '@/shared/ui/templates.public';
import { FormSection, FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME, insetPanelVariants } from '@/shared/ui/navigation-and-layout.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export default function AuthSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const {
    session,
    roles: contextRoles,
    defaultRole: contextDefaultRole,
    securityPolicy: contextSecurityPolicy,
    isLoading: authLoading,
    updateSetting,
    refetchSettings,
  } = useAuth();

  const [roles, setRoles] = useState<AuthRole[]>(contextRoles);
  const [defaultRole, setDefaultRole] = useState<string>(contextDefaultRole);
  const [securityPolicy, setSecurityPolicy] = useState<AuthSecurityPolicy>(contextSecurityPolicy);
  const [defaultDirty, setDefaultDirty] = useState(false);
  const [securityDirty, setSecurityDirty] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpAuth, setMfaOtpAuth] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaDisableCode, setMfaDisableCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const mfaSetupMutation = createMutationV2({
    mutationKey: QUERY_KEYS.auth.mutation('mfa.setup'),
    mutationFn: setupMfa,
    meta: {
      source: 'auth.settings.mfa.setup',
      operation: 'action',
      resource: 'auth.mfa.setup',
      domain: 'global',
      tags: ['auth', 'mfa', 'settings'],
      description: 'Runs auth mfa setup.'},
  });
  const mfaVerifyMutation = createMutationV2({
    mutationKey: QUERY_KEYS.auth.mutation('mfa.verify'),
    mutationFn: verifyMfa,
    meta: {
      source: 'auth.settings.mfa.verify',
      operation: 'action',
      resource: 'auth.mfa.verify',
      domain: 'global',
      tags: ['auth', 'mfa', 'settings'],
      description: 'Runs auth mfa verify.'},
  });
  const mfaDisableMutation = createMutationV2({
    mutationKey: QUERY_KEYS.auth.mutation('mfa.disable'),
    mutationFn: disableMfa,
    meta: {
      source: 'auth.settings.mfa.disable',
      operation: 'action',
      resource: 'auth.mfa.disable',
      domain: 'global',
      tags: ['auth', 'mfa', 'settings'],
      description: 'Runs auth mfa disable.'},
  });
  const userSecurityQuery = useAuthUserSecurity(session?.user?.id);

  const roleOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      roles.map((role: AuthRole) => ({
        value: role.id,
        label: role.name,
      })),
    [roles]
  );

  useEffect(() => {
    setRoles(contextRoles);
    setDefaultRole(contextDefaultRole);
    setSecurityPolicy(contextSecurityPolicy);
    setDefaultDirty(false);
    setSecurityDirty(false);
  }, [contextRoles, contextDefaultRole, contextSecurityPolicy]);

  useEffect(() => {
    if (!userSecurityQuery.data) return;
    setMfaEnabled(Boolean(userSecurityQuery.data.mfaEnabled));
  }, [userSecurityQuery.data]);

  const saveDefaultRole = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: AUTH_SETTINGS_KEYS.defaultRole,
        value: defaultRole,
      });
      setDefaultDirty(false);
      await refetchSettings();
      toast('Default role saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'AuthSettingsPage', action: 'saveDefaultRole' });
      toast(error instanceof Error ? error.message : 'Failed to save settings.', {
        variant: 'error',
      });
    }
  };

  const saveSecurityPolicy = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: AUTH_SETTINGS_KEYS.securityPolicy,
        value: JSON.stringify(securityPolicy),
      });
      setSecurityDirty(false);
      await refetchSettings();
      toast('Security policy saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'AuthSettingsPage',
        action: 'saveSecurityPolicy',
      });
      toast(error instanceof Error ? error.message : 'Failed to save security policy.', {
        variant: 'error',
      });
    }
  };

  const handleMfaSetup = async (): Promise<void> => {
    try {
      setMfaSecret(null);
      setMfaOtpAuth(null);
      setRecoveryCodes([]);
      const res = await mfaSetupMutation.mutateAsync(undefined);
      if (!res.ok) throw new ApiError('Failed to start MFA setup.', 400);
      const payload = res.payload;
      setMfaSecret(payload.secret ?? null);
      setMfaOtpAuth(payload.otpauthUrl ?? null);
      toast('MFA setup started. Enter the code from your authenticator app.', {
        variant: 'success',
      });
    } catch (error) {
      logClientCatch(error, { source: 'AuthSettingsPage', action: 'handleMfaSetup' });
      toast(error instanceof Error ? error.message : 'Failed to start MFA setup.', {
        variant: 'error',
      });
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
        throw new ApiError(payload.message ?? 'Failed to verify MFA.', 400);
      }
      setRecoveryCodes(payload.recoveryCodes ?? []);
      setMfaEnabled(true);
      setMfaToken('');
      toast('MFA enabled. Save your recovery codes.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'AuthSettingsPage', action: 'handleMfaVerify' });
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
        throw new ApiError(payload.message ?? 'Failed to disable MFA.', 400);
      }
      setMfaEnabled(false);
      setMfaSecret(null);
      setMfaOtpAuth(null);
      setRecoveryCodes([]);
      setMfaDisableCode('');
      toast('MFA disabled.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'AuthSettingsPage',
        action: 'handleMfaDisable',
      });
      toast(error instanceof Error ? error.message : 'Failed to disable MFA.', {
        variant: 'error',
      });
    }
  };

  return (
    <div className='page-section max-w-5xl space-y-6'>
      <PanelHeader
        title='Auth Settings'
        description='Authentication data source is managed globally.'
      />

      <FormSection
        title='Default role'
        description='Users without an explicit role will receive this role. To avoid unintended access, set this to a low-privilege role.'
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
            disabled={authLoading}
            options={roleOptions}
            placeholder='Select default role'
            triggerClassName='w-64 bg-gray-900 border text-white'
           ariaLabel='Select default role' title='Select default role'/>
          <Button
            onClick={() => void saveDefaultRole()}
            disabled={!defaultDirty || updateSetting.isPending}
          >
            {updateSetting.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </FormSection>

      <FormSection
        title='Security policy'
        description='Control password strength and login protection rules.'
        className='p-4'
        actions={
          <Button
            onClick={() => void saveSecurityPolicy()}
            disabled={!securityDirty || updateSetting.isPending}
          >
            {updateSetting.isPending ? 'Saving...' : 'Save security policy'}
          </Button>
        }
      >
        <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 mt-4`}>
          <FormField label='Minimum password length'>
            <Input
              type='number'
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
              className='bg-gray-900 border text-white'
             aria-label='Minimum password length' title='Minimum password length'/>
          </FormField>
          <FormField
            label='Require strong password'
            description='Enforce uppercase, lowercase, number, and symbol.'
          >
            <Checkbox
              checked={securityPolicy.requireStrongPassword}
              onCheckedChange={(checked: boolean | 'indeterminate') => {
                setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                  ...prev,
                  requireStrongPassword: Boolean(checked),
                }));
                setSecurityDirty(true);
              }}
              className='h-4 w-4 rounded border bg-gray-900'
            />
          </FormField>
          <div className='space-y-2 md:col-span-2'>
            <Label className='text-xs text-gray-300'>Password rules</Label>
            <div className='flex flex-wrap gap-4 text-xs text-gray-400'>
              {(
                [
                  ['requireUppercase', 'Uppercase'],
                  ['requireLowercase', 'Lowercase'],
                  ['requireNumber', 'Number'],
                  ['requireSymbol', 'Symbol'],
                ] as const
              ).map(
                ([key, label]: readonly [
                  'requireUppercase' | 'requireLowercase' | 'requireNumber' | 'requireSymbol',
                  string,
                ]) => (
                  <Label key={key} className='flex items-center gap-2'>
                    <Checkbox
                      checked={securityPolicy[key]}
                      onCheckedChange={(checked: boolean | 'indeterminate') => {
                        setSecurityPolicy((prev: AuthSecurityPolicy) => ({
                          ...prev,
                          [key]: Boolean(checked),
                        }));
                        setSecurityDirty(true);
                      }}
                      className='h-4 w-4 rounded border bg-gray-900'
                    />
                    {label}
                  </Label>
                )
              )}
            </div>
          </div>
          <FormField label='Email lockout attempts'>
            <Input
              type='number'
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
              className='bg-gray-900 border text-white'
             aria-label='Email lockout attempts' title='Email lockout attempts'/>
          </FormField>
          <FormField label='Email lockout window (minutes)'>
            <Input
              type='number'
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
              className='bg-gray-900 border text-white'
             aria-label='Email lockout window (minutes)' title='Email lockout window (minutes)'/>
          </FormField>
          <FormField label='Email lockout duration (minutes)'>
            <Input
              type='number'
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
              className='bg-gray-900 border text-white'
             aria-label='Email lockout duration (minutes)' title='Email lockout duration (minutes)'/>
          </FormField>
          <FormField label='IP rate limit attempts'>
            <Input
              type='number'
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
              className='bg-gray-900 border text-white'
             aria-label='IP rate limit attempts' title='IP rate limit attempts'/>
          </FormField>
          <FormField label='IP rate limit window (minutes)'>
            <Input
              type='number'
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
              className='bg-gray-900 border text-white'
             aria-label='IP rate limit window (minutes)' title='IP rate limit window (minutes)'/>
          </FormField>
          <FormField label='IP rate limit duration (minutes)'>
            <Input
              type='number'
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
              className='bg-gray-900 border text-white'
             aria-label='IP rate limit duration (minutes)' title='IP rate limit duration (minutes)'/>
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title='Multi-factor authentication'
        description='Enable MFA for your account and store recovery codes securely.'
        className='p-4'
      >
        <div className='mt-4 space-y-4'>
          <div className='text-xs text-gray-400'>Status: {mfaEnabled ? 'Enabled' : 'Disabled'}</div>
          {!mfaEnabled ? (
            <div className='space-y-3'>
              <Button onClick={() => void handleMfaSetup()} disabled={mfaSetupMutation.isPending}>
                {mfaSetupMutation.isPending ? 'Starting...' : 'Start MFA setup'}
              </Button>
              {mfaSecret ? (
                <div
                  className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} space-y-2 border-border text-xs text-gray-300`}
                >
                  <div>Secret: {mfaSecret}</div>
                  {mfaOtpAuth ? <div>OTP URL: {mfaOtpAuth}</div> : null}
                </div>
              ) : null}
              {mfaSecret ? (
                <div className='space-y-2'>
                  <FormField label='Enter MFA code'>
                    <Input
                      value={mfaToken}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setMfaToken(event.target.value)
                      }
                      className='bg-gray-900 border text-white w-full'
                      placeholder='123456'
                     aria-label='123456' title='123456'/>
                  </FormField>
                  <Button
                    onClick={() => void handleMfaVerify()}
                    disabled={mfaVerifyMutation.isPending}
                  >
                    {mfaVerifyMutation.isPending ? 'Verifying...' : 'Verify & enable'}
                  </Button>
                </div>
              ) : null}
              {recoveryCodes.length > 0 ? (
                <Alert variant='warning' className='p-3 text-xs'>
                  <div className='font-semibold'>Recovery codes (save these now)</div>
                  <div className='mt-2 grid gap-1'>
                    {recoveryCodes.map((code: string) => (
                      <div key={code}>{code}</div>
                    ))}
                  </div>
                </Alert>
              ) : null}
            </div>
          ) : (
            <div className='space-y-2'>
              <FormField label='Disable MFA (enter code)'>
                <Input
                  value={mfaDisableCode}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setMfaDisableCode(event.target.value)
                  }
                  className='bg-gray-900 border text-white w-full'
                  placeholder='MFA code or recovery code'
                 aria-label='MFA code or recovery code' title='MFA code or recovery code'/>
              </FormField>
              <Button
                variant='outline'
                onClick={() => void handleMfaDisable()}
                disabled={mfaDisableMutation.isPending}
              >
                {mfaDisableMutation.isPending ? 'Disabling...' : 'Disable MFA'}
              </Button>
            </div>
          )}
        </div>
      </FormSection>

      <Alert variant='warning' className='p-4 text-sm'>
        Go to Workflow Database -&gt; Database Engine to configure provider routing and strict
        fallback policy.
      </Alert>
      <div>
        <Link
          href='/admin/databases/engine'
          className='text-sm font-semibold text-blue-400 underline'
        >
          Open Database Engine
        </Link>
      </div>
    </div>
  );
}
