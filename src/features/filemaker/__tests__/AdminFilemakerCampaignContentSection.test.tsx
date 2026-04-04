import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { FilemakerEmailCampaign } from '../types';
import { createBlankCampaignDraft } from '../pages/AdminFilemakerCampaignEditPage.utils';
import { ContentSection } from '../pages/AdminFilemakerCampaignEditPage.sections';

const useCampaignEditContextMock = vi.fn();

vi.mock('@/shared/lib/document-editor/components/DocumentWysiwygEditor', () => ({
  DocumentWysiwygEditor: ({
    value,
    onChange,
    placeholder,
    engineInstance,
    showBrand,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    engineInstance?: 'filemaker_email' | 'notes_app' | 'case_resolver';
    showBrand?: boolean;
  }) => (
    <div>
      <textarea
        aria-label={placeholder ?? 'Document editor'}
        data-testid='campaign-html-editor'
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {showBrand && engineInstance ? (
        <a
          aria-label={`Open ${engineInstance === 'filemaker_email' ? 'Filemaker Email' : engineInstance === 'notes_app' ? 'Notes App' : 'Case Resolver'} text editor settings`}
          href={`/admin/settings/text-editors#text-editor-instance-${engineInstance}`}
        >
          te
        </a>
      ) : null}
    </div>
  ),
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
    description?: string;
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
    placeholder,
    'aria-label': ariaLabel,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    'aria-label'?: string;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} aria-label={ariaLabel} />
  ),
  MultiSelect: () => <div />,
  SelectSimple: () => <div />,
  Textarea: ({
    value,
    onChange,
    placeholder,
    rows,
    'aria-label': ariaLabel,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
    placeholder?: string;
    rows?: number;
    'aria-label'?: string;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      aria-label={ariaLabel}
    />
  ),
}));

vi.mock('../pages/AdminFilemakerCampaignEditPage.context', () => ({
  useCampaignEditContext: () => useCampaignEditContextMock(),
}));

function ContentSectionHarness(): React.JSX.Element {
  const [draft, setDraft] = useState<FilemakerEmailCampaign>(createBlankCampaignDraft());
  useCampaignEditContextMock.mockReturnValue({
    draft,
    setDraft,
  });

  return (
    <>
      <ContentSection />
      <output data-testid='campaign-body-html'>{draft.bodyHtml ?? ''}</output>
      <output data-testid='campaign-body-text'>{draft.bodyText ?? ''}</output>
    </>
  );
}

describe('ContentSection', () => {
  it('stores HTML body updates through the shared rich-text editor', () => {
    render(<ContentSectionHarness />);

    expect(
      screen.getByText('Write the primary campaign body with the shared rich-text editor.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Optional. Leave blank to derive plain text from the HTML body during delivery.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Open Filemaker Email text editor settings',
      })
    ).toHaveAttribute(
      'href',
      '/admin/settings/text-editors#text-editor-instance-filemaker_email'
    );

    fireEvent.change(screen.getByTestId('campaign-html-editor'), {
      target: { value: '<p>Hello from campaign editor</p>' },
    });

    expect(screen.getByTestId('campaign-body-html')).toHaveTextContent(
      '<p>Hello from campaign editor</p>'
    );
    expect(screen.getByTestId('campaign-body-text')).toHaveTextContent('');
  });

  it('keeps the plain-text field as an explicit override', () => {
    render(<ContentSectionHarness />);

    fireEvent.change(screen.getByLabelText('Campaign plain-text override'), {
      target: { value: 'Plain text fallback' },
    });

    expect(screen.getByTestId('campaign-body-text')).toHaveTextContent('Plain text fallback');
    expect(screen.getByTestId('campaign-body-html')).toHaveTextContent('');
  });
});
