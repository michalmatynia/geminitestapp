import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { FilemakerMailAccount } from '../types';
import { CampaignTestSendSection } from '../pages/AdminFilemakerCampaignEditPage.sections';

const useCampaignEditContextMock = vi.fn();

vi.mock('@/shared/lib/document-editor/public', () => ({
  DocumentWysiwygEditor: () => null,
}));

vi.mock('@/shared/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type='button' disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Checkbox: () => <input type='checkbox' />,
  FormField: ({
    label,
    description,
    children,
    className,
  }: {
    label?: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }) => (
    <label className={className}>
      {label ? <span>{label}</span> : null}
      {description ? <span>{description}</span> : null}
      {children}
    </label>
  ),
  FormSection: ({
    title,
    children,
    className,
  }: {
    title?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }) => (
    <section className={className}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
  Input: ({
    value,
    onChange,
    'aria-label': ariaLabel,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    'aria-label'?: string;
  }) => <input value={value} onChange={onChange} aria-label={ariaLabel} />,
  MultiSelect: () => <div />,
  SelectSimple: () => <div />,
  Textarea: () => <textarea />,
}));

vi.mock('../pages/AdminFilemakerCampaignEditPage.context', () => ({
  useCampaignEditContext: () => useCampaignEditContextMock(),
}));

const createMailAccount = (): FilemakerMailAccount => ({
  id: 'mail-account-sales',
  createdAt: '2026-04-02T10:00:00.000Z',
  updatedAt: '2026-04-02T10:00:00.000Z',
  name: 'Sales',
  emailAddress: 'sales@example.com',
  provider: 'imap_smtp',
  status: 'active',
  imapHost: 'imap.example.com',
  imapPort: 993,
  imapSecure: true,
  imapUser: 'sales@example.com',
  imapPasswordSettingKey: 'imap-password',
  smtpHost: 'smtp.example.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: 'sales@example.com',
  smtpPasswordSettingKey: 'smtp-password',
  fromName: 'Sales Team',
  replyToEmail: 'replies@example.com',
  folderAllowlist: [],
  initialSyncLookbackDays: 30,
  maxMessagesPerSync: 100,
  lastSyncedAt: null,
  lastSyncError: null,
});

function CampaignTestSendHarness({
  selectedMailAccount = createMailAccount(),
  isTestSendPending = false,
  onSend = vi.fn(),
}: {
  selectedMailAccount?: FilemakerMailAccount | null;
  isTestSendPending?: boolean;
  onSend?: () => Promise<void>;
}): React.JSX.Element {
  const [value, setValue] = useState('');
  useCampaignEditContextMock.mockReturnValue({
    testRecipientEmailDraft: value,
    setTestRecipientEmailDraft: setValue,
    handleSendTestEmail: onSend,
    isTestSendPending,
    selectedMailAccount,
  });

  return (
    <>
      <CampaignTestSendSection />
      <output data-testid='test-recipient-value'>{value}</output>
    </>
  );
}

describe('CampaignTestSendSection', () => {
  it('captures the recipient email and triggers the send handler', () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<CampaignTestSendHarness onSend={onSend} />);

    fireEvent.change(screen.getByLabelText('Campaign test recipient email'), {
      target: { value: 'qa@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Test Email' }));

    expect(screen.getByTestId('test-recipient-value')).toHaveTextContent('qa@example.com');
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/Tracking placeholders are rendered in preview-safe mode/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Sender route: Sales <sales@example.com>/)).toBeInTheDocument();
  });

  it('keeps the send button disabled until a recipient is provided', () => {
    render(<CampaignTestSendHarness selectedMailAccount={null} />);

    expect(screen.getByRole('button', { name: 'Send Test Email' })).toBeDisabled();
    expect(screen.getByText(/Sender route: Shared provider/)).toBeInTheDocument();
  });
});
