import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable max-lines-per-function */

import { OrganizationJobListingsSection } from '../components/page/OrganizationJobListingsSection';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import {
  JOB_APPLICATION_PREPARE_TRIGGER_LOCATION,
  JOB_APPLICATION_TAILORED_CV_PATH_ID,
  JOB_APPLICATION_TAILORED_CV_TRIGGER_BUTTON_ID,
  JOB_APPLICATION_TAILORED_CV_TRIGGER_NAME,
} from '@/shared/lib/ai-paths/job-application-prepare';
import {
  createDefaultFilemakerDatabase,
  createFilemakerJobListing,
  createFilemakerLexiconTerm,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_JOB_APPLICATION_SETTINGS_KEY,
  toPersistedFilemakerDatabase,
} from '../settings';
import type { FilemakerJobApplication, FilemakerJobListing, FilemakerOrganization } from '../types';

const mocks = vi.hoisted(() => ({
  fireAiPathTriggerEvent: vi.fn(),
  settingsGet: vi.fn(),
  triggerButtonsQuery: vi.fn(),
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
      <output
        data-testid={ariaLabel?.includes('lexicon') === true ? 'selected-lexicon-tags' : 'selected-campaigns'}
      >
        {selected.join(',')}
      </output>
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
    disabled,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
    disabled?: boolean;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      disabled={disabled}
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
    title,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
    title?: string;
    'aria-label'?: string;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled} title={title} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div role='menu'>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type='button' role='menuitem' onClick={onSelect}>
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  DetailModal: ({
    children,
    footer,
    isOpen,
    subtitle,
    title,
  }: {
    children: React.ReactNode;
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

vi.mock('@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent', () => ({
  useAiPathTriggerEvent: () => ({
    fireAiPathTriggerEvent: mocks.fireAiPathTriggerEvent,
  }),
}));

vi.mock('@/shared/lib/ai-paths/hooks/useAiPathQueries', () => ({
  useAiPathsTriggerButtonsQuery: () => mocks.triggerButtonsQuery(),
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

const jobApplicationTailoredCvTriggerButton: AiTriggerButtonRecord = {
  id: JOB_APPLICATION_TAILORED_CV_TRIGGER_BUTTON_ID,
  name: JOB_APPLICATION_TAILORED_CV_TRIGGER_NAME,
  iconId: null,
  pathId: JOB_APPLICATION_TAILORED_CV_PATH_ID,
  enabled: true,
  locations: [JOB_APPLICATION_PREPARE_TRIGGER_LOCATION],
  mode: 'click',
  display: {
    label: JOB_APPLICATION_TAILORED_CV_TRIGGER_NAME,
    showLabel: true,
  },
  contextTemplate: {
    jobApplicationArtifactKind: 'tailored_cv',
    applicationContext: {
      generationRequest: {
        artifact: 'tailored_cv',
        artifacts: ['tailored_cv', 'cv_pdf_preview'],
        language: 'match_job_listing',
        runtime: 'redis',
        promptGoal: 'Prepare a tailored CV.',
      },
      outputContract: {
        tailoredCv: {
          title: 'string',
        },
      },
    },
  },
  createdAt: '2026-04-29T10:00:00.000Z',
  updatedAt: '2026-04-29T10:00:00.000Z',
  sortIndex: 60,
};

const createSettingsValue = (): string => {
  const database = createDefaultFilemakerDatabase();
  database.lexiconTerms = [
    createFilemakerLexiconTerm({
      id: 'term-contract',
      label: 'B2B contract',
      normalizedLabel: 'b2b contract',
      category: 'contract_type',
    }),
    createFilemakerLexiconTerm({
      id: 'term-office',
      label: 'full office work',
      normalizedLabel: 'full office work',
      category: 'work_mode',
    }),
  ];
  return JSON.stringify(toPersistedFilemakerDatabase(database));
};

const createCampaignsValue = (): string =>
  JSON.stringify({
    version: 1,
    campaigns: [
      {
        id: 'campaign-1',
        name: 'Spring hiring campaign',
        status: 'active',
      },
    ],
  });

const createJsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });

let jobApplicationsPayload: { applications: unknown[] } = { applications: [] };

function JobListingsHarness(props: {
  initialJobListings?: FilemakerJobListing[];
}): React.JSX.Element {
  const [jobListings, setJobListings] = useState<FilemakerJobListing[]>(
    props.initialJobListings ?? []
  );
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
  beforeEach(() => {
    mocks.fireAiPathTriggerEvent.mockReset();
    mocks.fireAiPathTriggerEvent.mockImplementation(async (args: {
      onFinished?: () => void;
      onSuccess?: (runId: string) => void;
    }) => {
      args.onSuccess?.('run-job-application-1');
      args.onFinished?.();
    });
    mocks.settingsGet.mockReset();
    mocks.triggerButtonsQuery.mockReset();
    mocks.triggerButtonsQuery.mockReturnValue({
      data: [jobApplicationTailoredCvTriggerButton],
      isLoading: false,
    });
    mocks.useActionsContext.mockReset();
    mocks.useStateContext.mockReset();
    jobApplicationsPayload = { applications: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const href = String(url);
        const method = init?.method ?? 'GET';
        if (href.includes('/api/filemaker/job-applications/application-1/apply')) {
          if (method === 'POST') {
            return createJsonResponse({
              run: {
                id: 'apply-run-1',
                applicationId: 'application-1',
                organizationId: 'org-1',
                personId: 'person-1',
                jobListingId: 'job-1',
                integrationId: 'integration-pracuj',
                integrationSlug: 'pracuj-pl',
                connectionId: 'connection-pracuj',
                sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
                mode: 'submit',
                status: 'queued',
                artifactVersionIds: {
                  applicationEmailVersionId: null,
                  coverLetterVersionId: null,
                  tailoredCvVersionId: null,
                },
                confirmationUrl: null,
                error: null,
                steps: [],
                createdAt: '2026-04-29T10:00:00.000Z',
                startedAt: null,
                completedAt: null,
                updatedAt: '2026-04-29T10:00:00.000Z',
              },
            });
          }
          return createJsonResponse({ run: null });
        }
        if (href.includes('/api/filemaker/job-applications/application-1')) {
          if (method === 'PATCH') {
            const body =
              typeof init?.body === 'string'
                ? (JSON.parse(init.body) as { status?: string })
                : { status: undefined };
            const updatedApplications = jobApplicationsPayload.applications.map(
              (application: unknown): unknown => {
                const record = application as FilemakerJobApplication;
                return record.id === 'application-1'
                  ? {
                      ...record,
                      status: body.status ?? record.status,
                      updatedAt: '2026-04-29T11:00:00.000Z',
                    }
                  : application;
              }
            );
            jobApplicationsPayload = { applications: updatedApplications };
            return createJsonResponse({ application: updatedApplications[0] });
          }
          if (method === 'DELETE') {
            jobApplicationsPayload = {
              applications: jobApplicationsPayload.applications.filter(
                (application: unknown): boolean =>
                  (application as FilemakerJobApplication).id !== 'application-1'
              ),
            };
            return new Response(null, { status: 204 });
          }
          return createJsonResponse({ application: jobApplicationsPayload.applications[0] });
        }
        if (href.includes('/api/filemaker/job-applications?')) {
          return createJsonResponse(jobApplicationsPayload);
        }
        if (href.includes('/api/v2/integrations/with-connections')) {
          return createJsonResponse([
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
          ]);
        }
        if (href.includes('/api/filemaker/persons/person-1')) {
          return createJsonResponse({
            linkedAddresses: [],
            linkedAnyParams: [],
            linkedAnyTexts: [],
            linkedBankAccounts: [],
            linkedContracts: [],
            linkedDocuments: [],
            linkedOccupations: [],
            linkedWebsites: [],
            person: {
              id: 'person-1',
              fullName: 'Ada Lovelace',
              firstName: 'Ada',
              lastName: 'Lovelace',
              cvProfessionalSummary: 'Software engineer with marketplace experience.',
            },
          });
        }
        if (href.includes('/api/filemaker/persons/person-2')) {
          return createJsonResponse({
            linkedAddresses: [],
            linkedAnyParams: [],
            linkedAnyTexts: [],
            linkedBankAccounts: [],
            linkedContracts: [],
            linkedDocuments: [],
            linkedOccupations: [],
            linkedWebsites: [],
            person: {
              id: 'person-2',
              fullName: 'Grace Hopper',
              firstName: 'Grace',
              lastName: 'Hopper',
              cvProfessionalSummary: 'Computer scientist with compiler experience.',
            },
          });
        }
        if (href.includes('/api/filemaker/organizations/org-1')) {
          return createJsonResponse({
            harvestProfiles: [],
            importedDemands: [],
            importedProfiles: [],
            linkedAddresses: [{ addressId: 'address-org-1', city: 'Warsaw' }],
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
          });
        }
        if (href.includes('/api/filemaker/cvs')) {
          return createJsonResponse({
            cvs: [
              {
                id: 'cv-1',
                personId: 'person-1',
                title: 'Primary CV',
                bodyText: 'Existing CV text',
              },
            ],
          });
        }
        if (href.includes('/api/filemaker/persons')) {
          return createJsonResponse({
            persons: [
              {
                id: 'person-1',
                fullName: 'Ada Lovelace',
                cvProfessionalSummary: 'Software engineer with marketplace experience.',
              },
              {
                id: 'person-2',
                fullName: 'Grace Hopper',
                cvProfessionalSummary: 'Computer scientist with compiler experience.',
              },
            ],
          });
        }
        return createJsonResponse({});
      })
    );
  });

  it('removes an individual job listing from the organization state through the row actions menu', () => {
    const firstListing = createFilemakerJobListing({
      id: 'listing-1',
      organizationId: organization.id,
      title: 'FileMaker Consultant',
      description: 'Consulting role',
      status: 'open',
    });
    const secondListing = createFilemakerJobListing({
      id: 'listing-2',
      organizationId: organization.id,
      title: 'Database Developer',
      description: 'Database role',
      status: 'open',
    });

    render(<JobListingsHarness initialJobListings={[firstListing, secondListing]} />);

    expect(screen.getByText('FileMaker Consultant')).toBeInTheDocument();
    expect(screen.getByText('Database Developer')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('menuitem', { name: /Remove listing/i })[0]);

    expect(screen.queryByText('FileMaker Consultant')).not.toBeInTheDocument();
    expect(screen.getByText('Database Developer')).toBeInTheDocument();
    expect(screen.getByTestId('job-listings-state')).toHaveTextContent('listing-2');
    expect(screen.getByTestId('job-listings-state')).not.toHaveTextContent('listing-1');
  });

  it('adds a job listing and records targeted email campaigns', () => {
    mocks.settingsGet.mockImplementation((key: string) => {
      if (key === FILEMAKER_DATABASE_KEY) return createSettingsValue();
      if (key === FILEMAKER_EMAIL_CAMPAIGNS_KEY) return createCampaignsValue();
      return undefined;
    });

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

  it('loads reusable lexicon tags for job listing categorization', () => {
    mocks.settingsGet.mockImplementation((key: string) => {
      if (key === FILEMAKER_DATABASE_KEY) return createSettingsValue();
      if (key === FILEMAKER_EMAIL_CAMPAIGNS_KEY) return createCampaignsValue();
      return undefined;
    });

    render(
      <JobListingsHarness
        initialJobListings={[
          createFilemakerJobListing({
            id: 'job-1',
            organizationId: 'org-1',
            title: 'Frontend Developer',
            lexiconTermIds: ['term-contract'],
          }),
        ]}
      />
    );

    expect(screen.getByTestId('selected-lexicon-tags')).toHaveTextContent('term-contract');

    fireEvent.click(screen.getByRole('button', { name: 'full office work (Work mode)' }));

    const state = JSON.parse(screen.getByTestId('job-listings-state').textContent) as
      FilemakerJobListing[];
    expect(state[0]?.lexiconTermIds).toEqual(['term-contract', 'term-office']);
  });

  it('opens the application preparation modal from a job row with the Pracuj.pl default person', async () => {
    mocks.settingsGet.mockImplementation((key: string) => {
      if (key === FILEMAKER_DATABASE_KEY) return createSettingsValue();
      if (key === FILEMAKER_EMAIL_CAMPAIGNS_KEY) return createCampaignsValue();
      return undefined;
    });

    render(
      <JobListingsHarness
        initialJobListings={[
          createFilemakerJobListing({
            id: 'job-1',
            organizationId: 'org-1',
            title: 'FileMaker Consultant',
            location: 'Warsaw',
          }),
        ]}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Prepare application for FileMaker Consultant/i })
    );

    expect(await screen.findByRole('dialog', { name: 'Prepare application' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Person context')).toHaveValue('person-1');
    });
    expect(screen.getByLabelText('Job listing context')).toHaveValue('job-1');
    expect(screen.getByLabelText('Organisation context')).toHaveValue('org-1');
    expect(screen.getByText('Pracuj.pl · Main Pracuj')).toBeInTheDocument();
  });

  it('preselects the Filemaker default person before the integration default', async () => {
    mocks.settingsGet.mockImplementation((key: string) => {
      if (key === FILEMAKER_DATABASE_KEY) return createSettingsValue();
      if (key === FILEMAKER_EMAIL_CAMPAIGNS_KEY) return createCampaignsValue();
      if (key === FILEMAKER_JOB_APPLICATION_SETTINGS_KEY) {
        return JSON.stringify({
          defaultPersonId: 'person-2',
          defaultPersonName: 'Grace Hopper',
        });
      }
      return undefined;
    });

    render(
      <JobListingsHarness
        initialJobListings={[
          createFilemakerJobListing({
            id: 'job-1',
            organizationId: 'org-1',
            title: 'FileMaker Consultant',
            location: 'Warsaw',
          }),
        ]}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Prepare application for FileMaker Consultant/i })
    );

    expect(await screen.findByRole('dialog', { name: 'Prepare application' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Person context')).toHaveValue('person-2');
    });
    expect(screen.getByText('Filemaker default · Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Pracuj.pl · Main Pracuj')).toBeInTheDocument();
  });

  it('lists prepared application packages for the matching job listing', async () => {
    jobApplicationsPayload = {
      applications: [
        {
          id: 'application-1',
          status: 'draft',
          personId: 'person-1',
          personName: 'Ada Lovelace',
          organizationId: 'org-1',
          organizationName: 'Acme Hiring',
          jobListingId: 'job-1',
          jobTitle: 'FileMaker Consultant',
          integrationId: 'integration-pracuj',
          integrationSlug: 'pracuj-pl',
          connectionId: 'connection-pracuj',
          tailoredCvId: 'cv-ai-1',
          tailoredCv: {
            professionalSummary: 'Ada has strong marketplace workflow automation experience.',
            skills: ['FileMaker', 'Workflow automation'],
            title: 'Ada Lovelace - FileMaker Consultant',
          },
          coverLetter: {
            subject: 'Application for FileMaker Consultant',
            bodyMarkdown: 'I can help Acme Hiring automate marketplace workflows.',
          },
          applicationEmail: {
            subject: 'Application - FileMaker Consultant',
            bodyMarkdown: 'Please find my tailored CV and cover letter attached.',
            bodyText: 'Please find my tailored CV and cover letter attached.',
          },
          applicationNotes: ['Use Pracuj.pl authenticated profile.'],
          missingInformation: ['Confirm preferred salary range.'],
          confidence: 0.86,
          source: 'ai-path-job-application-prepare',
          sourceEntityId: 'org-1:job-1:person-1',
          sourceApplicationContext: {},
          createdAt: '2026-04-29T10:00:00.000Z',
          updatedAt: '2026-04-29T10:00:00.000Z',
        },
      ],
    };
    mocks.settingsGet.mockImplementation((key: string) => {
      if (key === FILEMAKER_DATABASE_KEY) return createSettingsValue();
      if (key === FILEMAKER_EMAIL_CAMPAIGNS_KEY) return createCampaignsValue();
      return undefined;
    });

    render(
      <JobListingsHarness
        initialJobListings={[
          createFilemakerJobListing({
            id: 'job-1',
            organizationId: 'org-1',
            title: 'FileMaker Consultant',
            sourceSite: 'pracuj.pl',
            sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
          }),
        ]}
      />
    );

    expect(await screen.findByText('Prepared applications')).toBeInTheDocument();
    expect(screen.getByText('Application for FileMaker Consultant')).toBeInTheDocument();
    expect(screen.getByText(/I can help Acme Hiring/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open CV' })).toHaveAttribute(
      'href',
      '/admin/filemaker/persons/person-1/cvs/cv-ai-1'
    );
    expect(screen.getByRole('link', { name: 'Job' })).toHaveAttribute(
      'href',
      'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001'
    );

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByRole('dialog', { name: 'Prepared application' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open source' })).toHaveAttribute(
      'href',
      'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001'
    );
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CV PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview CV PDF' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Download Text' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Export PDF' })).toBeInTheDocument();
    expect(screen.getByText('Application - FileMaker Consultant')).toBeInTheDocument();
    expect(screen.getByText('86% confidence')).toBeInTheDocument();
    expect(
      screen.getByText('Ada has strong marketplace workflow automation experience.')
    ).toBeInTheDocument();
    expect(screen.getByText('Use Pracuj.pl authenticated profile.')).toBeInTheDocument();
    expect(screen.getByText('Confirm preferred salary range.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/filemaker/job-applications/application-1/apply',
        expect.objectContaining({
          body: expect.stringContaining('"mode":"submit"'),
          method: 'POST',
        })
      );
    });
    expect(await screen.findByText('Queued')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Application status'), {
      target: { value: 'applied' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Application status')).toHaveValue('applied');
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/filemaker/job-applications/application-1',
      expect.objectContaining({
        body: JSON.stringify({ status: 'applied' }),
        method: 'PATCH',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Prepared application' })).not.toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/filemaker/job-applications/application-1',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(screen.queryByText('Prepared applications')).not.toBeInTheDocument();
  });

  it('surfaces email-only prepared application packages in the job listing summary', async () => {
    jobApplicationsPayload = {
      applications: [
        {
          id: 'application-email-1',
          status: 'draft',
          personId: 'person-1',
          personName: 'Ada Lovelace',
          organizationId: 'org-1',
          organizationName: 'Acme Hiring',
          jobListingId: 'job-1',
          jobTitle: 'FileMaker Consultant',
          integrationId: 'integration-pracuj',
          integrationSlug: 'pracuj-pl',
          connectionId: 'connection-pracuj',
          tailoredCvId: null,
          tailoredCv: null,
          coverLetter: null,
          applicationEmail: {
            subject: 'Application - FileMaker Consultant',
            bodyMarkdown: 'Please find my tailored application details attached.',
            bodyText: 'Please find my tailored application details attached.',
          },
          applicationNotes: [],
          missingInformation: [],
          confidence: 0.82,
          source: 'ai-path-job-application-tailored-email',
          sourceEntityId: 'org-1:job-1:person-1:application_package',
          sourceApplicationContext: {},
          createdAt: '2026-04-29T10:00:00.000Z',
          updatedAt: '2026-04-29T10:00:00.000Z',
        },
      ],
    };
    mocks.settingsGet.mockImplementation((key: string) => {
      if (key === FILEMAKER_DATABASE_KEY) return createSettingsValue();
      if (key === FILEMAKER_EMAIL_CAMPAIGNS_KEY) return createCampaignsValue();
      return undefined;
    });

    render(
      <JobListingsHarness
        initialJobListings={[
          createFilemakerJobListing({
            id: 'job-1',
            organizationId: 'org-1',
            title: 'FileMaker Consultant',
            sourceSite: 'pracuj.pl',
            sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
          }),
        ]}
      />
    );

    expect(await screen.findByText('Prepared applications')).toBeInTheDocument();
    expect(screen.getByText('Application - FileMaker Consultant')).toBeInTheDocument();
    expect(
      screen.getByText('Please find my tailored application details attached.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Cover letter draft created.')).not.toBeInTheDocument();
  });

  it('fires the job application AI Path with person CV, job, and organisation context', async () => {
    mocks.settingsGet.mockImplementation((key: string) => {
      if (key === FILEMAKER_DATABASE_KEY) return createSettingsValue();
      if (key === FILEMAKER_EMAIL_CAMPAIGNS_KEY) return createCampaignsValue();
      return undefined;
    });

    render(
      <JobListingsHarness
        initialJobListings={[
          createFilemakerJobListing({
            id: 'job-1',
            organizationId: 'org-1',
            title: 'FileMaker Consultant',
            description: 'Build marketplace workflow automations.',
            location: 'Warsaw',
          }),
        ]}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Prepare application for FileMaker Consultant/i })
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Person context')).toHaveValue('person-1');
    });

    await waitFor(() => {
      expect(screen.getByText('Application context ready.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: JOB_APPLICATION_TAILORED_CV_TRIGGER_NAME }));

    await waitFor(() => {
      expect(mocks.fireAiPathTriggerEvent).toHaveBeenCalledTimes(1);
    });

    const [args] = mocks.fireAiPathTriggerEvent.mock.calls[0] as Array<{
      entityType: string;
      extras: Record<string, unknown>;
      getEntityJson: () => Record<string, unknown> | null;
      preferredPathId: string;
      source: { location?: string };
      triggerEventId: string;
    }>;
    const entityJson = args.getEntityJson();
    const context = entityJson?.['applicationContext'] as Record<string, unknown>;
    const personContext = context['personContext'] as Record<string, unknown>;
    const jobContext = context['jobContext'] as Record<string, unknown>;
    const organizationContext = context['organizationContext'] as Record<string, unknown>;
    const generationRequest = context['generationRequest'] as Record<string, unknown>;

    expect(args).toMatchObject({
      entityType: 'custom',
      preferredPathId: JOB_APPLICATION_TAILORED_CV_PATH_ID,
      source: { location: 'filemaker_organization_job_application' },
      triggerEventId: JOB_APPLICATION_TAILORED_CV_TRIGGER_BUTTON_ID,
    });
    expect((personContext['person'] as Record<string, unknown>)['fullName']).toBe('Ada Lovelace');
    expect((personContext['cvsSummary'] as Record<string, unknown>)['count']).toBe(1);
    expect((personContext['cvsSummary'] as Record<string, unknown>)['items']).toEqual([
      expect.objectContaining({
        id: 'cv-1',
        title: 'Primary CV',
      }),
    ]);
    expect((jobContext['listing'] as FilemakerJobListing).title).toBe('FileMaker Consultant');
    expect((organizationContext['organization'] as FilemakerOrganization).name).toBe('Acme Hiring');
    expect(
      (organizationContext['linkedRecordsSummary'] as Record<string, unknown>)['linkedAddresses']
    ).toEqual([expect.objectContaining({ city: 'Warsaw' })]);
    expect(generationRequest['artifacts']).toEqual([
      'tailored_cv',
      'cv_pdf_preview',
    ]);
    expect(generationRequest['artifact']).toBe('tailored_cv');
    expect(args.extras['generationRequest']).toEqual(generationRequest);
    expect(args.extras['outputContract']).toEqual(context['outputContract']);
  });
});
