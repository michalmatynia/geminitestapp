// @vitest-environment jsdom

/* eslint-disable max-lines-per-function */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { TriggerButtonRunSnapshotArgs } from '@/shared/lib/ai-paths/hooks/useTriggerButtons';
import {
  createDefaultFilemakerDatabase,
  createFilemakerJobListing,
  createFilemakerOrganization,
} from '../../settings';
import { createDefaultFilemakerJobApplicationSettings } from '../../filemaker-job-application-settings';
import { JobApplicationPreparationModal } from './JobApplicationPreparationModal';

const mocks = vi.hoisted(() => ({
  triggerButtonBarPropsMock: vi.fn(),
}));

type TriggerButtonBarTestProps = {
  disabled?: boolean;
  onRunSnapshot?: (args: TriggerButtonRunSnapshotArgs) => void;
};

vi.mock('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar', () => ({
  TriggerButtonBar: (props: TriggerButtonBarTestProps) => {
    mocks.triggerButtonBarPropsMock(props);
    return (
      <button type='button' disabled={props.disabled}>
        Trigger buttons
      </button>
    );
  },
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormField: ({
    children,
    label,
  }: {
    children?: React.ReactNode;
    label?: React.ReactNode;
  }) => (
    <label>
      {label !== undefined && label !== null ? <span>{label}</span> : null}
      {children}
    </label>
  ),
  SelectSimple: ({
    ariaLabel,
    onValueChange,
    options,
    value,
  }: {
    ariaLabel?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ label: string; value: string }>;
    value?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? 'select'}
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
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    disabled,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  }) => (
    <button type='button' disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  DetailModal: ({
    children,
    footer,
    isOpen,
    subtitle,
    title,
  }: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
    isOpen: boolean;
    subtitle?: React.ReactNode;
    title: React.ReactNode;
  }) =>
    isOpen ? (
      <div role='dialog' aria-label={String(title)}>
        <h3>{title}</h3>
        {subtitle !== undefined && subtitle !== null ? <p>{subtitle}</p> : null}
        {children}
        {footer}
      </div>
    ) : null,
}));

const createJsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });

const applicationEmailTriggerButton: AiTriggerButtonRecord = {
  id: 'trigger-application-email',
  name: 'Create Application Email',
  iconId: null,
  locations: ['filemaker_organization_job_application'],
  mode: 'click',
  display: {
    label: 'Create Application Email',
  },
  pathId: 'path-application-email',
  contextTemplate: {
    jobApplicationArtifactKind: 'application_email',
  },
  enabled: true,
  sortIndex: 10,
  createdAt: '2026-04-29T10:00:00.000Z',
  updatedAt: '2026-04-29T10:00:00.000Z',
};

const organization = createFilemakerOrganization({
  id: 'org-1',
  name: 'Acme Hiring',
});

const jobListing = createFilemakerJobListing({
  id: 'job-1',
  organizationId: 'org-1',
  title: 'FileMaker Consultant',
});

describe('JobApplicationPreparationModal', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mocks.triggerButtonBarPropsMock.mockReset();
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL | Request) => {
        const href = String(url);
        if (href.includes('/api/v2/integrations/with-connections')) {
          return Promise.resolve(createJsonResponse([
            {
              id: 'integration-pracuj',
              name: 'Pracuj.pl',
              slug: 'pracuj-pl',
              connections: [
                {
                  id: 'connection-pracuj',
                  name: 'Main Pracuj',
                  integrationId: 'integration-pracuj',
                  jobApplicationPersonId: 'person-1',
                  jobApplicationPersonName: 'Ada Lovelace',
                },
              ],
            },
          ]));
        }
        if (href.includes('/api/filemaker/persons/person-1')) {
          return Promise.resolve(createJsonResponse({
            linkedAddresses: [],
            linkedAnyParams: [],
            linkedAnyTexts: [],
            linkedBankAccounts: [],
            linkedContracts: [],
            linkedDocuments: [],
            linkedEmails: [],
            linkedOccupations: [],
            linkedWebsites: [],
            person: {
              id: 'person-1',
              fullName: 'Ada Lovelace',
              firstName: 'Ada',
              lastName: 'Lovelace',
              cvProfessionalSummary: 'Software engineer with marketplace experience.',
            },
          }));
        }
        if (href.includes('/api/filemaker/persons')) {
          return Promise.resolve(createJsonResponse({
            persons: [
              {
                id: 'person-1',
                fullName: 'Ada Lovelace',
                cvProfessionalSummary: 'Software engineer with marketplace experience.',
              },
            ],
          }));
        }
        if (href.includes('/api/filemaker/cvs')) {
          return Promise.resolve(createJsonResponse({
            cvs: [
              {
                id: 'cv-1',
                personId: 'person-1',
                title: 'Primary CV',
                bodyText: 'Existing CV text',
              },
            ],
          }));
        }
        if (href.includes('/api/filemaker/organizations/org-1')) {
          return Promise.resolve(createJsonResponse({
            harvestProfiles: [],
            importedDemands: [],
            importedProfiles: [],
            linkedAddresses: [],
            linkedAnyParams: [],
            linkedAnyTexts: [],
            linkedBankAccounts: [],
            linkedDocuments: [],
            linkedEmails: [],
            linkedEvents: [],
            linkedPersons: [],
            linkedWebsites: [],
            organization,
            relationshipSummary: null,
            valueCatalog: [],
          }));
        }
        return Promise.resolve(createJsonResponse({}));
      })
    );
  });

  it('refreshes generated artifacts when an application email run completes', async () => {
    const onCreated = vi.fn();
    const onRunEntryChange = vi.fn();

    render(
      <JobApplicationPreparationModal
        filemakerDatabase={createDefaultFilemakerDatabase()}
        initialJobListingId='job-1'
        isOpen
        jobApplicationSettings={createDefaultFilemakerJobApplicationSettings()}
        jobListings={[jobListing]}
        onClose={vi.fn()}
        onCreated={onCreated}
        onRunEntryChange={onRunEntryChange}
        organization={organization}
      />
    );

    await screen.findByText('Application context ready.');
    await waitFor(() => {
      expect(mocks.triggerButtonBarPropsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          disabled: false,
          onRunSnapshot: expect.any(Function),
        })
      );
    });

    const triggerProps = mocks.triggerButtonBarPropsMock.mock.lastCall?.[0] as TriggerButtonBarTestProps;
    const completedEmailSnapshot: TriggerButtonRunSnapshotArgs = {
      button: applicationEmailTriggerButton,
      entityId: 'org-1:job-1:person-1:application_package',
      entityType: 'custom',
      snapshot: {
        runId: 'run-application-email-1',
        status: 'completed',
        updatedAt: '2026-04-29T10:05:00.000Z',
        finishedAt: '2026-04-29T10:05:00.000Z',
        errorMessage: null,
        entityId: 'org-1:job-1:person-1:application_package',
        entityType: 'custom',
        trackingState: 'stopped',
      },
    };
    vi.useFakeTimers();

    act(() => {
      triggerProps.onRunSnapshot?.(completedEmailSnapshot);
    });

    expect(onRunEntryChange).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactKind: 'application_email',
        artifactLabel: 'Create Application Email',
        runId: 'run-application-email-1',
        status: 'completed',
      })
    );
    expect(onCreated).toHaveBeenCalledTimes(1);

    act(() => {
      triggerProps.onRunSnapshot?.(completedEmailSnapshot);
    });
    expect(onCreated).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(onCreated).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(onCreated).toHaveBeenCalledTimes(3);
  });
});
