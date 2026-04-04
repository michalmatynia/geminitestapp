import { fireEvent, render, screen } from '@testing-library/react';
import React, { useMemo, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { FilemakerEmailCampaign, FilemakerMailAccount } from '../types';
import { CampaignDetailsSection } from '../pages/AdminFilemakerCampaignEditPage.sections';
import { createBlankCampaignDraft } from '../pages/AdminFilemakerCampaignEditPage.utils';

const useCampaignEditContextMock = vi.fn();

vi.mock('@/shared/lib/document-editor/public', () => ({
  DocumentWysiwygEditor: () => null,
}));

vi.mock('@/shared/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children }: { children: React.ReactNode }) => <button type='button'>{children}</button>,
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
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
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Textarea: ({
    value,
    onChange,
    rows,
    'aria-label': ariaLabel,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
    rows?: number;
    'aria-label'?: string;
  }) => <textarea value={value} onChange={onChange} rows={rows} aria-label={ariaLabel} />,
}));

vi.mock('../pages/AdminFilemakerCampaignEditPage.context', () => ({
  useCampaignEditContext: () => useCampaignEditContextMock(),
}));

const createMailAccount = (overrides?: Partial<FilemakerMailAccount>): FilemakerMailAccount => ({
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
  ...overrides,
});

function CampaignDetailsHarness(): React.JSX.Element {
  const [draft, setDraft] = useState<FilemakerEmailCampaign>(createBlankCampaignDraft());
  const account = useMemo(() => {
    return draft.mailAccountId === 'mail-account-sales' ? createMailAccount() : null;
  }, [draft.mailAccountId]);
  const mailAccountOptions = [
    {
      value: '__shared__',
      label: 'Shared Filemaker campaign delivery provider',
    },
    {
      value: 'mail-account-sales',
      label: 'Sales <sales@example.com>',
    },
  ];
  useCampaignEditContextMock.mockReturnValue({
    draft,
    setDraft,
    mailAccountOptions,
    selectedMailAccount: account,
  });

  return (
    <>
      <CampaignDetailsSection />
      <output data-testid='campaign-mail-account-id'>{draft.mailAccountId ?? ''}</output>
      <output data-testid='campaign-from-name'>{draft.fromName ?? ''}</output>
      <output data-testid='campaign-reply-to'>{draft.replyToEmail ?? ''}</output>
    </>
  );
}

describe('CampaignDetailsSection', () => {
  it('stores the selected Filemaker mail account and sender overrides in the draft', () => {
    render(<CampaignDetailsHarness />);

    fireEvent.change(screen.getByLabelText('Campaign mail account'), {
      target: { value: 'mail-account-sales' },
    });
    fireEvent.change(screen.getByLabelText('Campaign from name override'), {
      target: { value: 'Campaign Owner' },
    });
    fireEvent.change(screen.getByLabelText('Campaign reply-to override'), {
      target: { value: 'campaign-replies@example.com' },
    });

    expect(screen.getByText(/Campaign delivery uses Sales <sales@example.com>/)).toBeInTheDocument();
    expect(screen.getByTestId('campaign-mail-account-id')).toHaveTextContent('mail-account-sales');
    expect(screen.getByTestId('campaign-from-name')).toHaveTextContent('Campaign Owner');
    expect(screen.getByTestId('campaign-reply-to')).toHaveTextContent(
      'campaign-replies@example.com'
    );
  });

  it('lets admins switch back to the shared campaign delivery provider', () => {
    render(<CampaignDetailsHarness />);

    fireEvent.change(screen.getByLabelText('Campaign mail account'), {
      target: { value: 'mail-account-sales' },
    });
    fireEvent.change(screen.getByLabelText('Campaign mail account'), {
      target: { value: '__shared__' },
    });

    expect(screen.getByTestId('campaign-mail-account-id')).toHaveTextContent('');
  });
});
