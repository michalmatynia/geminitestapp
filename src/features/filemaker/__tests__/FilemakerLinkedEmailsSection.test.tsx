import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FilemakerLinkedEmailsSection } from '@/features/filemaker/components/shared/FilemakerLinkedEmailsSection';
import {
  FilemakerLinkedEmailsField,
  formatLinkedEmailFieldValue,
} from '@/features/filemaker/components/shared/FilemakerLinkedEmailsField';

import type { FilemakerEmail } from '@/features/filemaker/types';

const emails: FilemakerEmail[] = [
  {
    id: 'email-1',
    email: 'test@example.com',
    status: 'active',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
];

describe('FilemakerLinkedEmailsSection', () => {
  it('renders linked emails and triggers extraction callback', () => {
    const onExtractEmails = vi.fn();
    const onEmailExtractionTextChange = vi.fn();

    render(
      <FilemakerLinkedEmailsSection
        emails={emails}
        emailExtractionText='candidate@email.com'
        onEmailExtractionTextChange={onEmailExtractionTextChange}
        onExtractEmails={onExtractEmails}
        isSaving={false}
      />
    );

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText('Paste document content, headers, or any text here...'),
      {
        target: { value: 'updated text' },
      }
    );
    expect(onEmailExtractionTextChange).toHaveBeenCalledWith('updated text');

    fireEvent.click(screen.getByRole('button', { name: 'Extract Emails' }));
    expect(onExtractEmails).toHaveBeenCalledTimes(1);
  });

  it('disables extraction when text is empty', () => {
    render(
      <FilemakerLinkedEmailsSection
        emails={[]}
        emailExtractionText=''
        onEmailExtractionTextChange={vi.fn()}
        onExtractEmails={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.getByText('No emails linked yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Extract Emails' })).toBeDisabled();
  });
});

describe('FilemakerLinkedEmailsField', () => {
  it('renders linked emails as a read-only one-to-many relationship field', () => {
    render(<FilemakerLinkedEmailsField emails={emails} />);

    const field = screen.getByLabelText('Linked emails');
    expect(field).toHaveValue('test@example.com');
    expect(field).toHaveAttribute('readonly');
  });

  it('formats linked emails without duplicating repeated email records', () => {
    expect(formatLinkedEmailFieldValue([...emails, { ...emails[0]!, id: 'email-2' }])).toBe(
      'test@example.com'
    );
  });
});
