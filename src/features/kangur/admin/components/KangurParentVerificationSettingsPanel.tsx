'use client';

import React, { createContext, useContext } from 'react';

import {
  KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MIN,
  KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MAX,
} from '@/features/kangur/settings';
import {
  Alert,
  Badge,
  Button,
  FormField,
  FormSection,
  Input,
  ToggleRow,
} from '@/features/kangur/shared/ui';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

import { KangurAdminCard } from './KangurAdminCard';

const formatShortTimestamp = (value: string): string => {
  return withKangurClientErrorSync(
    {
      source: 'kangur.admin.settings',
      action: 'format-timestamp',
      description: 'Formats a timestamp for settings display.',
      context: { value },
    },
    () =>
      new Intl.DateTimeFormat('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value)),
    { fallback: value }
  );
};

interface KangurParentVerificationSettingsContextValue {
  requireEmailVerification: boolean;
  setRequireEmailVerification: (value: boolean) => void;
  requireCaptcha: boolean;
  setRequireCaptcha: (value: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  notificationsDisabledUntilInput: string;
  setNotificationsDisabledUntilInput: (value: string) => void;
  resendCooldownInput: string;
  setResendCooldownInput: (value: string) => void;
  notificationsPausedUntil: string | null;
}

const KangurParentVerificationSettingsContext = createContext<KangurParentVerificationSettingsContextValue | null>(null);

function useParentVerificationSettings() {
  const context = useContext(KangurParentVerificationSettingsContext);
  if (!context) {
    throw new Error('useParentVerificationSettings must be used within a KangurParentVerificationSettingsPanel');
  }
  return context;
}

function RequireEmailVerificationToggle() {
  const { requireEmailVerification, setRequireEmailVerification } = useParentVerificationSettings();
  return (
    <FormField
      label='Wymagaj potwierdzenia e-maila rodzica'
      description='Disable to activate parent accounts immediately without email verification.'
    >
      <ToggleRow
        label={requireEmailVerification ? 'Włączone' : 'Wyłączone'}
        description={
          requireEmailVerification
            ? 'Parents must confirm their email before signing in.'
            : 'New parent accounts are activated immediately.'
        }
        checked={requireEmailVerification}
        onCheckedChange={setRequireEmailVerification}
        variant='switch'
        className='border-none bg-muted/20 px-3 py-2 hover:bg-muted/30'
      />
    </FormField>
  );
}

function RequireCaptchaToggle() {
  const { requireCaptcha, setRequireCaptcha } = useParentVerificationSettings();
  return (
    <FormField
      label='Wymagaj Captcha przy zakładaniu konta'
      description='Disable to skip the Turnstile check during parent signup.'
    >
      <ToggleRow
        label={requireCaptcha ? 'Włączona' : 'Wyłączona'}
        description={
          requireCaptcha
            ? 'Captcha runs when Turnstile keys are configured.'
            : 'Parent signup skips the Captcha check.'
        }
        checked={requireCaptcha}
        onCheckedChange={setRequireCaptcha}
        variant='switch'
        className='border-none bg-muted/20 px-3 py-2 hover:bg-muted/30'
      />
    </FormField>
  );
}

function NotificationsEnabledToggle() {
  const { notificationsEnabled, setNotificationsEnabled } = useParentVerificationSettings();
  return (
    <FormField
      label='Wysyłka e-maili potwierdzających'
      description='Disable to pause delivery of parent email confirmations.'
    >
      <ToggleRow
        label={notificationsEnabled ? 'Włączona' : 'Wyłączona'}
        description={
          notificationsEnabled
            ? 'Notifications are active for new parent verifications.'
            : 'Parent confirmation emails will not be sent.'
        }
        checked={notificationsEnabled}
        onCheckedChange={setNotificationsEnabled}
        variant='switch'
        className='border-none bg-muted/20 px-3 py-2 hover:bg-muted/30'
      />
    </FormField>
  );
}

function NotificationsDisabledUntilInput() {
  const { notificationsDisabledUntilInput, setNotificationsDisabledUntilInput, notificationsPausedUntil } = useParentVerificationSettings();
  return (
    <FormField
      label='Wstrzymaj wysyłkę do'
      description='Temporarily pause confirmation emails until the chosen time (local). Leave blank to send normally.'
    >
      <Input
        type='datetime-local'
        value={notificationsDisabledUntilInput}
        onChange={(event) =>
          setNotificationsDisabledUntilInput(event.target.value)
        }
        aria-label='Wstrzymaj wysyłkę do'
        title='Wstrzymaj wysyłkę do'
      />
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => setNotificationsDisabledUntilInput('')}
        >
          Clear pause
        </Button>
        {notificationsPausedUntil ? (
          <Badge variant='outline'>
            Wstrzymane do {formatShortTimestamp(notificationsPausedUntil)}
          </Badge>
        ) : null}
      </div>
    </FormField>
  );
}

function ResendCooldownInput() {
  const { resendCooldownInput, setResendCooldownInput } = useParentVerificationSettings();
  return (
    <>
      <FormField
        label='Czas oczekiwania na ponowne wysłanie e-maila (sekundy)'
        description='Controls how long to wait before another verification email can be sent to the same address.'
      >
        <Input
          type='number'
          min={KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MIN}
          max={KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MAX}
          step={1}
          value={resendCooldownInput}
          onChange={(event) => setResendCooldownInput(event.target.value)}
          aria-label='Czas oczekiwania na ponowne wysłanie e-maila (sekundy)'
          inputMode='numeric'
          title='Czas oczekiwania na ponowne wysłanie e-maila (sekundy)'
        />
      </FormField>
      <p className='text-xs text-muted-foreground'>
        Akceptowany zakres: {KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MIN}–
        {KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MAX} s.
      </p>
    </>
  );
}

interface KangurParentVerificationSettingsPanelProps extends KangurParentVerificationSettingsContextValue {
  className?: string;
}

export function KangurParentVerificationSettingsPanel(props: KangurParentVerificationSettingsPanelProps): React.JSX.Element {
  const { className, ...contextValue } = props;
  return (
    <KangurParentVerificationSettingsContext.Provider value={contextValue}>
      <FormSection
        title='Parent verification email'
        description='Configure resend throttling for parent account verification emails.'
        className={className}
        gridClassName='gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'
      >
        <KangurAdminCard>
          <div className='space-y-4'>
            <RequireEmailVerificationToggle />
            <RequireCaptchaToggle />
            <NotificationsEnabledToggle />
            <NotificationsDisabledUntilInput />
            <ResendCooldownInput />
          </div>
        </KangurAdminCard>
        <div className='space-y-3'>
          <Alert variant='default' title='Scope'>
            Applies to parent create-account and resend-verification actions across login pages and public
            enrollment flow.
          </Alert>
          <Alert variant='default' title='Security'>
            Shorter values increase retry attempts and email traffic. Longer values reduce request spam but
            also slow account confirmation.
          </Alert>
        </div>
      </FormSection>
    </KangurParentVerificationSettingsContext.Provider>
  );
}
