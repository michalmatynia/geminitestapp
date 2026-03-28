'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import type { VerificationCardState } from './KangurLoginPage.utils';

export type VerificationCardProps = VerificationCardState & {
  resendLabel: string;
  resendDisabled: boolean;
  resendHelper?: string | null;
  changeEmailLabel?: string | null;
  onChangeEmail?: (() => void) | null;
  continueToSignInLabel?: string | null;
  onContinueToSignIn?: (() => void) | null;
  onResend: () => void;
};

export const ParentVerificationCard = ({
  email,
  message,
  error,
  verificationUrl,
  resendLabel,
  resendDisabled,
  resendHelper,
  changeEmailLabel,
  onChangeEmail,
  continueToSignInLabel,
  onContinueToSignIn,
  onResend,
}: VerificationCardProps): React.JSX.Element => {
  const translations = useTranslations('KangurLogin');

  return (
    <div className='mt-6 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm'>
      <div className='text-sm font-semibold text-slate-900'>
        {translations('checkInboxLabel', { email })}
      </div>
      {message ? (
        <div
          role='status'
          aria-live='polite'
          className='mt-3 text-sm font-medium text-slate-700'
        >
          {message}
        </div>
      ) : null}
      {error ? (
        <div className='mt-3 text-sm font-medium text-rose-600' role='alert'>
          {error}
        </div>
      ) : null}
      {verificationUrl ? (
        <a
          className='mt-4 inline-flex text-sm font-semibold text-indigo-600 underline underline-offset-4 cursor-pointer'
          href={verificationUrl}
          target='_blank'
          rel='noopener noreferrer'
        >
          {translations('verifyEmailNow')}
        </a>
      ) : null}
      <div className='mt-4 flex flex-col gap-2'>
        <KangurButton
          type='button'
          variant='ghost'
          size='sm'
          disabled={resendDisabled}
          onClick={onResend}
          className='justify-start px-0'
        >
          {resendLabel}
        </KangurButton>
        {resendHelper ? (
          <div className='text-xs text-slate-500'>{resendHelper}</div>
        ) : null}
        {changeEmailLabel && onChangeEmail ? (
          <KangurButton
            type='button'
            variant='ghost'
            size='sm'
            onClick={onChangeEmail}
            className='justify-start px-0'
          >
            {changeEmailLabel}
          </KangurButton>
        ) : null}
        {continueToSignInLabel && onContinueToSignIn ? (
          <KangurButton
            type='button'
            variant='ghost'
            size='sm'
            onClick={onContinueToSignIn}
            className='justify-start px-0'
          >
            {continueToSignInLabel}
          </KangurButton>
        ) : null}
      </div>
    </div>
  );
};
