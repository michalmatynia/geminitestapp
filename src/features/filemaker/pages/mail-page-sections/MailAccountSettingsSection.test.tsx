import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MailPageState } from '../AdminFilemakerMailPage.hooks';

const mocks = vi.hoisted(() => ({
  useMailPageContextMock: vi.fn(),
}));

vi.mock('../FilemakerMail.context', () => ({
  useMailPageContext: () => mocks.useMailPageContextMock(),
}));

vi.mock('@/shared/lib/oauth/components/GoogleOAuthCredentialsSettings', () => ({
  GoogleOAuthCredentialsSettings: ({ id }: { id?: string }) => (
    <section id={id} data-testid='google-oauth-credentials-settings' />
  ),
}));

import { MailAccountSettingsSection } from './MailAccountSettingsSection';

const createState = (overrides: Partial<MailPageState> = {}): MailPageState =>
  ({
    selectedAccountLabel: 'Primary Gmail',
    selectedAccount: {
      id: 'account-1',
      name: 'Primary Gmail',
      emailAddress: 'user@example.com',
      authMode: 'password',
      status: 'active',
      folderAllowlist: [],
      lastSyncedAt: null,
      lastSyncError: null,
    },
    syncingAccountId: null,
    handleSyncAccount: vi.fn(),
    handleDisconnectGoogleAccount: vi.fn(),
    googleAuthErrorMessage: null,
    draft: {
      name: 'Primary Gmail',
      emailAddress: 'user@example.com',
      authMode: 'password',
      status: 'active',
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      imapSecure: true,
      imapUser: 'user@example.com',
      imapPassword: '',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'user@example.com',
      smtpPassword: '',
      fromName: null,
      replyToEmail: null,
      folderAllowlist: [],
      initialSyncLookbackDays: 30,
      maxMessagesPerSync: 100,
      pushEnabled: true,
      dkimDomain: null,
      dkimKeySelector: null,
      dkimPrivateKey: '',
    },
    setDraft: vi.fn(),
    accountFormErrors: {},
    folderAllowlistValue: '',
    setFolderAllowlistValue: vi.fn(),
    handleSaveAccount: vi.fn(),
    isSavingAccount: false,
    router: {
      push: vi.fn(),
    },
    ...overrides,
  }) as unknown as MailPageState;

describe('MailAccountSettingsSection', () => {
  it('shows a Google OAuth credential configuration link after connect failures', () => {
    mocks.useMailPageContextMock.mockReturnValue(
      createState({
        googleAuthErrorMessage: 'Google mail OAuth client credentials are not configured.',
      })
    );

    render(<MailAccountSettingsSection />);

    expect(
      screen.getByText('Google mail OAuth client credentials are not configured.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Configure Google OAuth/ })).toHaveAttribute(
      'href',
      '#filemaker-google-oauth-credentials'
    );
    expect(screen.getByTestId('google-oauth-credentials-settings')).toHaveAttribute(
      'id',
      'filemaker-google-oauth-credentials'
    );
  });
});
