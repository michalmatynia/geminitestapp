import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

/* eslint-disable max-lines-per-function */

import { OrganizationJobListingsSection } from '../components/page/OrganizationJobListingsSection';
import type { FilemakerJobListing, FilemakerOrganization } from '../types';

const mocks = vi.hoisted(() => ({
  settingsGet: vi.fn(),
  useActionsContext: vi.fn(),
  useStateContext: vi.fn(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: mocks.settingsGet,
  }),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormField: ({
    label,
    description,
    children,
    className,
  }: {
    label?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }) => (
    <label className={className}>
      {label !== undefined && label !== null ? <span>{label}</span> : null}
      {description !== undefined && description !== null ? <span>{description}</span> : null}
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
      {title !== undefined && title !== null ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
  MultiSelect: ({
    selected,
    options,
    onChange,
    ariaLabel,
  }: {
    selected: string[];
    options: Array<{ value: string; label: string }>;
    onChange: (values: string[]) => void;
    ariaLabel?: string;
  }) => (
    <div aria-label={ariaLabel}>
      <output data-testid='selected-campaigns'>{selected.join(',')}</output>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type='button'
            onClick={() => {
              onChange(
                isSelected
                  ? selected.filter((value: string): boolean => value !== option.value)
                  : [...selected, option.value]
              );
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  ),
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
      onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
        onValueChange?.(event.target.value)
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
    type,
    'aria-label': ariaLabel,
  }: {
    value?: string | number;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    type?: string;
    'aria-label'?: string;
  }) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  ),
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

vi.mock('../context/AdminFilemakerOrganizationEditPageContext', () => ({
  useAdminFilemakerOrganizationEditPageActionsContext: () => mocks.useActionsContext(),
  useAdminFilemakerOrganizationEditPageStateContext: () => mocks.useStateContext(),
}));

const organization: FilemakerOrganization = {
  id: 'org-1',
  name: 'Acme Hiring',
  addressId: '',
  street: '',
  streetNumber: '',
  city: '',
  postalCode: '',
  country: '',
  countryId: '',
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
};

function JobListingsHarness(): React.JSX.Element {
  const [jobListings, setJobListings] = useState<FilemakerJobListing[]>([]);
  mocks.useStateContext.mockReturnValue({
    jobListings,
    organization,
  });
  mocks.useActionsContext.mockReturnValue({
    setJobListings,
  });

  return (
    <>
      <OrganizationJobListingsSection />
      <output data-testid='job-listings-state'>{JSON.stringify(jobListings)}</output>
    </>
  );
}

describe('OrganizationJobListingsSection', () => {
  it('adds a job listing and records targeted email campaigns', () => {
    mocks.settingsGet.mockReturnValue(
      JSON.stringify({
        version: 1,
        campaigns: [
          {
            id: 'campaign-1',
            name: 'Spring hiring campaign',
            status: 'active',
          },
        ],
      })
    );

    render(<JobListingsHarness />);

    expect(screen.getByText('No job listings are attached to this organization.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add listing/i }));
    fireEvent.change(screen.getByLabelText('Job listing 1 title'), {
      target: { value: 'Senior FileMaker Developer' },
    });
    fireEvent.change(screen.getByLabelText('Job listing 1 description'), {
      target: { value: 'Build and maintain FileMaker integrations.' },
    });
    fireEvent.change(screen.getByLabelText('Job listing 1 salary min'), {
      target: { value: '12000' },
    });
    fireEvent.change(screen.getByLabelText('Job listing 1 salary max'), {
      target: { value: '18000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Spring hiring campaign' }));

    expect(screen.getByText('Senior FileMaker Developer')).toBeInTheDocument();
    expect(screen.getByText('Targeted')).toBeInTheDocument();
    expect(screen.getByTestId('selected-campaigns')).toHaveTextContent('campaign-1');

    const state = JSON.parse(screen.getByTestId('job-listings-state').textContent) as
      FilemakerJobListing[];
    expect(state[0]).toMatchObject({
      organizationId: 'org-1',
      title: 'Senior FileMaker Developer',
      description: 'Build and maintain FileMaker integrations.',
      salaryMin: 12000,
      salaryMax: 18000,
      targetedCampaignIds: ['campaign-1'],
    });
    expect(state[0]?.lastTargetedAt).toEqual(expect.any(String));
  });
});
