import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  savePlaywrightActionsIsPending: false,
  savePlaywrightActionsMutateAsync: vi.fn(),
  settingsGet: vi.fn(),
  settingsRefetch: vi.fn(),
  triggerButtonsQuery: vi.fn(),
  useActionsContext: vi.fn(),
  usePlaywrightActions: vi.fn(),
  useSettingsMap: vi.fn(),
  useStateContext: vi.fn(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: mocks.settingsGet,
    refetch: mocks.settingsRefetch,
  }),
}));

vi.mock('@/shared/hooks/usePlaywrightStepSequencer', () => ({
  usePlaywrightActions: (options?: unknown) => mocks.usePlaywrightActions(options),
  useSavePlaywrightActionsMutation: () => ({
    isPending: mocks.savePlaywrightActionsIsPending,
    mutateAsync: mocks.savePlaywrightActionsMutateAsync,
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: (options?: unknown) => mocks.useSettingsMap(options),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormActions: ({
    onSave,
    saveText = 'Save',
    isDisabled,
    isSaving,
  }: {
    onSave?: () => void;
    saveText?: string;
    isDisabled?: boolean;
    isSaving?: boolean;
  }) => (
    <button type='button' disabled={isDisabled === true || isSaving === true} onClick={onSave}>
      {isSaving ? 'Saving...' : saveText}
    </button>
  ),
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
  ToggleRow: ({
    children,
    checked,
    disabled,
    label,
    onCheckedChange,
  }: {
    children?: React.ReactNode;
    checked: boolean;
    disabled?: boolean;
    label: string;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <label>
      <span>{label}</span>
      <input
        aria-label={label}
        checked={checked}
        disabled={disabled}
        role='switch'
        type='checkbox'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onCheckedChange(event.currentTarget.checked)
        }
      />
      {children}
    </label>
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
    header,
    isOpen,
    subtitle,
    title,
  }: {
    children: React.ReactNode;
    footer?: React.ReactNode;
    header?: React.ReactNode;
    isOpen: boolean;
    subtitle?: React.ReactNode;
    title: React.ReactNode;
  }) =>
    isOpen ? (
      <div role='dialog' aria-label={String(title)}>
        {header ?? <h3>{title}</h3>}
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
    mocks.savePlaywrightActionsIsPending = false;
    mocks.savePlaywrightActionsMutateAsync.mockReset();
    mocks.savePlaywrightActionsMutateAsync.mockResolvedValue(undefined);
    mocks.fireAiPathTriggerEvent.mockImplementation(async (args: {
      onFinished?: () => void;
      onSuccess?: (runId: string) => void;
    }) => {
      await Promise.resolve();
      args.onSuccess?.('run-job-application-1');
      args.onFinished?.();
    });
    mocks.settingsGet.mockReset();
    mocks.settingsRefetch.mockReset();
    mocks.triggerButtonsQuery.mockReset();
    mocks.triggerButtonsQuery.mockReturnValue({
      data: [jobApplicationTailoredCvTriggerButton],
      isLoading: false,
    });
    mocks.useActionsContext.mockReset();
    mocks.usePlaywrightActions.mockReset();
    mocks.usePlaywrightActions.mockReturnValue({ data: [] });
    mocks.useSettingsMap.mockReset();
    mocks.useSettingsMap.mockReturnValue({ data: undefined, isLoading: false });
    mocks.useStateContext.mockReset();
    jobApplicationsPayload = { applications: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        await Promise.resolve();
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
                steps: [
                  {
                    id: 'apply-step-launch',
                    label: 'Launch browser',
                    status: 'ok',
                    detail: 'Using headed browser mode.',
                    createdAt: '2026-04-29T10:00:02.000Z',
                  },
                  {
                    id: 'apply-step-auth',
                    label: 'Authenticate',
                    status: 'pending',
                    detail: 'Opening Pracuj.pl with saved integration settings.',
                    createdAt: '2026-04-29T10:00:05.000Z',
                  },
                ],
                createdAt: '2026-04-29T10:00:00.000Z',
                startedAt: null,
                completedAt: null,
                updatedAt: '2026-04-29T10:00:00.000Z',
              },
            });
          }
          return createJsonResponse({ run: null });
        }
        const applicationResourceMatch = href.match(/\/api\/filemaker\/job-applications\/([^/?#]+)/);
        if (applicationResourceMatch !== null) {
          const applicationId = applicationResourceMatch[1] as string;
          if (method === 'PATCH') {
            const body =
              typeof init?.body === 'string'
                ? (JSON.parse(init.body) as { status?: string; removeLogEntryId?: string })
                : { status: undefined };
            const updatedApplications = jobApplicationsPayload.applications.map(
              (application: unknown): unknown => {
                const record = application as FilemakerJobApplication;
                if (record.id !== applicationId) return application;
                const nextApplicationLog =
                  typeof body.removeLogEntryId === 'string'
                    ? (record.applicationLog ?? []).filter(
                        (entry: { id: string }): boolean => entry.id !== body.removeLogEntryId
                      )
                    : record.applicationLog;
                return {
                  ...record,
                  applicationLog: nextApplicationLog,
                  status: body.status ?? record.status,
                  updatedAt: '2026-04-29T11:00:00.000Z',
                };
              }
            );
            jobApplicationsPayload = { applications: updatedApplications };
            const responseApplication = (updatedApplications.find(
              (application: unknown): boolean =>
                (application as FilemakerJobApplication).id === applicationId
            ) as FilemakerJobApplication | undefined) ?? (updatedApplications[0] as FilemakerJobApplication);
            return createJsonResponse({ application: responseApplication });
          }
          if (method === 'DELETE') {
            jobApplicationsPayload = {
              applications: jobApplicationsPayload.applications.filter(
                (application: unknown): boolean =>
                  (application as FilemakerJobApplication).id !== applicationId
              ),
            };
            return new Response(null, { status: 204 });
          }
          return createJsonResponse({ application: jobApplicationsPayload.applications[0] });
        }
        if (href.endsWith('/api/filemaker/job-applications') && method === 'POST') {
          const body =
            typeof init?.body === 'string'
              ? (JSON.parse(init.body) as {
                  jobListingId: string;
                  jobTitle?: string;
                  organizationId: string;
                  organizationName?: string;
                  personId: string;
                  personName?: string;
                  sourceSite?: string | null;
                  sourceUrl?: string | null;
                })
              : null;
          if (body === null) return new Response(null, { status: 400 });
          const existing = jobApplicationsPayload.applications.find(
            (application: unknown): boolean => {
              const record = application as FilemakerJobApplication;
              return (
                record.jobListingId === body.jobListingId &&
                record.organizationId === body.organizationId &&
                record.personId === body.personId
              );
            }
          ) as FilemakerJobApplication | undefined;
          const application: FilemakerJobApplication =
            existing !== undefined
              ? {
                  ...existing,
                  status: 'applied',
                  updatedAt: '2026-04-29T11:00:00.000Z',
                }
              : ({
                  id: `manual-${body.organizationId}-${body.jobListingId}-${body.personId}`,
                  activeArtifacts: {
                    applicationEmailVersionId: null,
                    coverLetterVersionId: null,
                    tailoredCvVersionId: null,
                  },
                  artifactVersions: {
                    applicationEmail: [],
                    coverLetter: [],
                    tailoredCv: [],
                  },
                  canonicalApplicationKey: `${body.personId}::${body.organizationId}::${body.jobListingId}::default`,
                  status: 'applied',
                  personId: body.personId,
                  personName: body?.personName ?? null,
                  organizationId: body.organizationId,
                  organizationName: body?.organizationName ?? null,
                  jobListingId: body.jobListingId,
                  jobTitle: body?.jobTitle ?? null,
                  integrationId: null,
                  integrationSlug: null,
                  connectionId: null,
                  tailoredCvId: null,
                  tailoredCv: null,
                  coverLetter: null,
                  applicationEmail: null,
                  matchAnalysis: null,
                  applicationNotes: ['Marked applied manually.'],
                  missingInformation: [],
                  confidence: null,
                  source: 'filemaker-manual-applied',
                  sourceEntityId: `${body.organizationId}:${body.jobListingId}:${body.personId}:manual_applied`,
                  sourceApplicationContext: {
                    jobContext: {
                      listing: {
                        sourceUrl: body?.sourceUrl ?? null,
                      },
                    },
                  },
                  createdAt: '2026-04-29T10:00:00.000Z',
                  updatedAt: '2026-04-29T10:00:00.000Z',
                } as FilemakerJobApplication);
          jobApplicationsPayload = {
            applications:
              existing !== undefined
                ? jobApplicationsPayload.applications.map((entry: unknown): unknown =>
                    (entry as FilemakerJobApplication).id === existing.id ? application : entry
                  )
                : [application, ...jobApplicationsPayload.applications],
          };
          return createJsonResponse({ application });
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

  it('marks a job listing as applied manually for the Filemaker default person', async () => {
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
            sourceSite: 'pracuj.pl',
            sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
          }),
        ]}
      />
    );

    const markAppliedButton = screen.getByRole('button', {
      name: /Mark applied manually for FileMaker Consultant/i,
    });
    await waitFor(() => {
      expect(markAppliedButton).not.toBeDisabled();
    });

    fireEvent.click(markAppliedButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/filemaker/job-applications',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
    const fetchCalls = (
      fetch as unknown as {
        mock: { calls: Array<[string | URL | Request, RequestInit | undefined]> };
      }
    ).mock.calls;
    const postCall = fetchCalls.find(
      ([url, init]) => String(url) === '/api/filemaker/job-applications' && init?.method === 'POST'
    );
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      action: 'mark_applied_manual',
      jobListingId: 'job-1',
      jobTitle: 'FileMaker Consultant',
      organizationId: 'org-1',
      organizationName: 'Acme Hiring',
      personId: 'person-2',
      personName: 'Grace Hopper',
      sourceSite: 'pracuj.pl',
      sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
    });

    expect(await screen.findByText('Prepared applications')).toBeInTheDocument();
    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
    expect(jobApplicationsPayload.applications[0]).toMatchObject({
      jobListingId: 'job-1',
      organizationId: 'org-1',
      personId: 'person-2',
      status: 'applied',
    });
  });

  it('unmarks a manually applied job listing by removing the manual log entry', async () => {
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
    jobApplicationsPayload = {
      applications: [
        {
          id: 'application-1',
          status: 'applied',
          personId: 'person-2',
          personName: 'Grace Hopper',
          activeArtifacts: {
            applicationEmailVersionId: null,
            coverLetterVersionId: null,
            tailoredCvVersionId: null,
          },
          artifactVersions: {
            applicationEmail: [],
            coverLetter: [],
            tailoredCv: [],
          },
          applicationEmail: null,
          coverLetter: null,
          tailoredCv: null,
          applicationLog: [
            {
              id: 'manual-log-entry-1',
              method: 'manual',
              appliedAt: '2026-04-29T10:00:00.000Z',
              personId: 'person-2',
              personName: 'Grace Hopper',
              toStatus: 'applied',
            },
          ],
          canonicalApplicationKey: 'person-2::org-1::job-1::default',
          jobListingId: 'job-1',
          jobTitle: 'FileMaker Consultant',
          organizationId: 'org-1',
          organizationName: 'Acme Hiring',
          integrationId: null,
          integrationSlug: null,
          connectionId: null,
          tailoredCvId: null,
          missingInformation: [],
          applicationNotes: ['Marked applied manually.'],
          confidence: null,
          source: 'filemaker-manual-applied',
          sourceEntityId: 'org-1:job-1:person-2:manual_applied',
          sourceApplicationContext: {
            jobContext: {
              listing: {
                sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
              },
            },
          },
          createdAt: '2026-04-29T10:00:00.000Z',
          updatedAt: '2026-04-29T11:00:00.000Z',
          matchAnalysis: null,
          matchAnalysisHistory: null,
        } as FilemakerJobApplication,
      ],
    };

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

    const markAppliedButton = screen.getByRole('button', {
      name: /Mark applied manually for FileMaker Consultant/i,
    });
    await waitFor(() => {
      expect(markAppliedButton).not.toBeDisabled();
      expect(markAppliedButton).toHaveTextContent('Applied');
    });

    fireEvent.click(markAppliedButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/filemaker/job-applications/application-1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    const fetchCalls = (
      fetch as unknown as {
        mock: { calls: Array<[string | URL | Request, RequestInit | undefined]> };
      }
    ).mock.calls;
    const patchCall = fetchCalls.find(
      ([url, init]) =>
        String(url) === '/api/filemaker/job-applications/application-1' &&
        init?.method === 'PATCH'
    );
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      removeLogEntryId: 'manual-log-entry-1',
      status: 'draft',
    });

    expect(await screen.findByRole('button', { name: /Mark applied manually for FileMaker Consultant/i }))
      .toHaveTextContent('Mark applied');

    expect(jobApplicationsPayload.applications[0]).toMatchObject({
      status: 'draft',
      applicationLog: [],
    });
  });

  it('unmarks an applied job listing when manual log has missing person id', async () => {
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
    jobApplicationsPayload = {
      applications: [
        {
          id: 'application-1',
          status: 'applied',
          personId: 'person-2',
          personName: 'Grace Hopper',
          activeArtifacts: {
            applicationEmailVersionId: null,
            coverLetterVersionId: null,
            tailoredCvVersionId: null,
          },
          artifactVersions: {
            applicationEmail: [],
            coverLetter: [],
            tailoredCv: [],
          },
          applicationEmail: null,
          coverLetter: null,
          tailoredCv: null,
          applicationLog: [
            {
              id: 'manual-log-entry-1',
              method: 'manual',
              appliedAt: '2026-04-29T10:00:00.000Z',
              personId: null,
              personName: 'Grace Hopper',
              toStatus: 'applied',
            },
          ],
          canonicalApplicationKey: 'person-2::org-1::job-1::default',
          jobListingId: 'job-1',
          jobTitle: 'FileMaker Consultant',
          organizationId: 'org-1',
          organizationName: 'Acme Hiring',
          integrationId: null,
          integrationSlug: null,
          connectionId: null,
          tailoredCvId: null,
          missingInformation: [],
          applicationNotes: ['Marked applied manually.'],
          confidence: null,
          source: 'filemaker-manual-applied',
          sourceEntityId: 'org-1:job-1:person-2:manual_applied',
          sourceApplicationContext: {
            jobContext: {
              listing: {
                sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
              },
            },
          },
          createdAt: '2026-04-29T10:00:00.000Z',
          updatedAt: '2026-04-29T11:00:00.000Z',
          matchAnalysis: null,
          matchAnalysisHistory: null,
        } as FilemakerJobApplication,
      ],
    };

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

    const markAppliedButton = screen.getByRole('button', {
      name: /Mark applied manually for FileMaker Consultant/i,
    });
    await waitFor(() => {
      expect(markAppliedButton).not.toBeDisabled();
      expect(markAppliedButton).toHaveTextContent('Applied');
    });

    fireEvent.click(markAppliedButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/filemaker/job-applications/application-1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    const fetchCalls = (
      fetch as unknown as {
        mock: { calls: Array<[string | URL | Request, RequestInit | undefined]> };
      }
    ).mock.calls;
    const patchCall = fetchCalls.find(
      ([url, init]) =>
        String(url) === '/api/filemaker/job-applications/application-1' &&
        init?.method === 'PATCH'
    );
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      removeLogEntryId: 'manual-log-entry-1',
      status: 'draft',
    });

    expect(
      await screen.findByRole('button', { name: /Mark applied manually for FileMaker Consultant/i })
    ).toHaveTextContent('Mark applied');

    expect(jobApplicationsPayload.applications[0]).toMatchObject({
      status: 'draft',
      applicationLog: [],
    });
  });

  it('unmarks an applied job listing when manual log has nullable toStatus and whitespace person ids', async () => {
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
    jobApplicationsPayload = {
      applications: [
        {
          id: 'application-1',
          status: 'applied',
          personId: '  person-2  ',
          personName: 'Grace Hopper',
          activeArtifacts: {
            applicationEmailVersionId: null,
            coverLetterVersionId: null,
            tailoredCvVersionId: null,
          },
          artifactVersions: {
            applicationEmail: [],
            coverLetter: [],
            tailoredCv: [],
          },
          applicationEmail: null,
          coverLetter: null,
          tailoredCv: null,
          applicationLog: [
            {
              id: 'manual-log-entry-1',
              method: 'manual',
              appliedAt: '2026-04-29T10:00:00.000Z',
              personId: 'person-2',
              personName: 'Grace Hopper',
              toStatus: null,
            },
          ],
          canonicalApplicationKey: 'person-2::org-1::job-1::default',
          jobListingId: 'job-1',
          jobTitle: 'FileMaker Consultant',
          organizationId: 'org-1',
          organizationName: 'Acme Hiring',
          integrationId: null,
          integrationSlug: null,
          connectionId: null,
          tailoredCvId: null,
          missingInformation: [],
          applicationNotes: ['Marked applied manually.'],
          confidence: null,
          source: 'filemaker-manual-applied',
          sourceEntityId: 'org-1:job-1:person-2:manual_applied',
          sourceApplicationContext: {
            jobContext: {
              listing: {
                sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
              },
            },
          },
          createdAt: '2026-04-29T10:00:00.000Z',
          updatedAt: '2026-04-29T11:00:00.000Z',
          matchAnalysis: null,
          matchAnalysisHistory: null,
        } as FilemakerJobApplication,
      ],
    };

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

    const markAppliedButton = screen.getByRole('button', {
      name: /Mark applied manually for FileMaker Consultant/i,
    });
    await waitFor(() => {
      expect(markAppliedButton).not.toBeDisabled();
      expect(markAppliedButton).toHaveTextContent('Applied');
    });

    fireEvent.click(markAppliedButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/filemaker/job-applications/application-1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    const fetchCalls = (
      fetch as unknown as {
        mock: { calls: Array<[string | URL | Request, RequestInit | undefined]> };
      }
    ).mock.calls;
    const patchCall = fetchCalls.find(
      ([url, init]) =>
        String(url) === '/api/filemaker/job-applications/application-1' &&
        init?.method === 'PATCH'
    );
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      removeLogEntryId: 'manual-log-entry-1',
      status: 'draft',
    });
  });

  it('unmarks an applied job listing by removing a manual log from a non-base application', async () => {
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
    jobApplicationsPayload = {
      applications: [
        {
          id: 'base-application-1',
          status: 'draft',
          personId: 'person-2',
          personName: 'Grace Hopper',
          activeArtifacts: {
            applicationEmailVersionId: null,
            coverLetterVersionId: null,
            tailoredCvVersionId: null,
          },
          artifactVersions: {
            applicationEmail: [],
            coverLetter: [],
            tailoredCv: [],
          },
          applicationEmail: null,
          coverLetter: null,
          tailoredCv: null,
          applicationLog: [],
          canonicalApplicationKey: 'person-2::org-1::job-1::default',
          jobListingId: 'job-1',
          jobTitle: 'FileMaker Consultant',
          organizationId: 'org-1',
          organizationName: 'Acme Hiring',
          integrationId: null,
          integrationSlug: null,
          connectionId: null,
          tailoredCvId: null,
          missingInformation: [],
          applicationNotes: ['Prepared application row.'],
          confidence: null,
          source: 'ai-path-job-application-prepare',
          sourceEntityId: 'org-1:job-1:person-2:legacy',
          sourceApplicationContext: {
            jobContext: {
              listing: {
                sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
              },
            },
          },
          createdAt: '2026-04-29T09:00:00.000Z',
          updatedAt: '2026-04-29T09:30:00.000Z',
          matchAnalysis: null,
          matchAnalysisHistory: null,
        } as FilemakerJobApplication,
        {
          id: 'manual-application-1',
          status: 'applied',
          personId: 'person-2',
          personName: 'Grace Hopper',
          activeArtifacts: {
            applicationEmailVersionId: null,
            coverLetterVersionId: null,
            tailoredCvVersionId: null,
          },
          artifactVersions: null,
          applicationEmail: null,
          coverLetter: null,
          tailoredCv: null,
          applicationLog: [
            {
              id: 'manual-log-entry-1',
              method: 'manual',
              appliedAt: '2026-04-29T10:00:00.000Z',
              personId: 'person-2',
              personName: 'Grace Hopper',
              toStatus: 'applied',
            },
          ],
          canonicalApplicationKey: 'person-2::org-1::job-1::default',
          jobListingId: 'job-1',
          jobTitle: 'FileMaker Consultant',
          organizationId: 'org-1',
          organizationName: 'Acme Hiring',
          integrationId: null,
          integrationSlug: null,
          connectionId: null,
          tailoredCvId: null,
          missingInformation: [],
          applicationNotes: ['Marked applied manually.'],
          confidence: null,
          source: 'filemaker-manual-applied',
          sourceEntityId: 'org-1:job-1:person-2:manual_applied',
          sourceApplicationContext: {
            jobContext: {
              listing: {
                sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
              },
            },
          },
          createdAt: '2026-04-29T10:00:00.000Z',
          updatedAt: '2026-04-29T10:45:00.000Z',
          matchAnalysis: null,
          matchAnalysisHistory: null,
        } as FilemakerJobApplication,
      ],
    };

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

    const markAppliedButton = screen.getByRole('button', {
      name: /Mark applied manually for FileMaker Consultant/i,
    });
    await waitFor(() => {
      expect(markAppliedButton).not.toBeDisabled();
      expect(markAppliedButton).toHaveTextContent('Applied');
    });

    fireEvent.click(markAppliedButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/filemaker/job-applications/manual-application-1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    const fetchCalls = (
      fetch as unknown as {
        mock: { calls: Array<[string | URL | Request, RequestInit | undefined]> };
      }
    ).mock.calls;
    const patchCall = fetchCalls.find(
      ([url, init]) =>
        String(url) === '/api/filemaker/job-applications/manual-application-1' &&
        init?.method === 'PATCH'
    );
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      removeLogEntryId: 'manual-log-entry-1',
      status: 'draft',
    });

    expect(
      await screen.findByRole('button', { name: /Mark applied manually for FileMaker Consultant/i })
    ).toHaveTextContent('Mark applied');

    const manualApplication = jobApplicationsPayload.applications.find(
      (application: FilemakerJobApplication): boolean => application.id === 'manual-application-1'
    );
    expect(manualApplication).toMatchObject({
      status: 'draft',
      applicationLog: [],
    });
  });

  it('unmarks an applied job listing by setting status to draft when no manual log is present', async () => {
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
    jobApplicationsPayload = {
      applications: [
        {
          id: 'application-1',
          status: 'applied',
          personId: 'person-2',
          personName: 'Grace Hopper',
          activeArtifacts: {
            applicationEmailVersionId: null,
            coverLetterVersionId: null,
            tailoredCvVersionId: null,
          },
          artifactVersions: {
            applicationEmail: [],
            coverLetter: [],
            tailoredCv: [],
          },
          applicationEmail: null,
          coverLetter: null,
          tailoredCv: null,
          applicationLog: [],
          canonicalApplicationKey: 'person-2::org-1::job-1::default',
          jobListingId: 'job-1',
          jobTitle: 'FileMaker Consultant',
          organizationId: 'org-1',
          organizationName: 'Acme Hiring',
          integrationId: null,
          integrationSlug: null,
          connectionId: null,
          tailoredCvId: null,
          missingInformation: [],
          applicationNotes: ['Marked applied manually.'],
          confidence: null,
          source: 'filemaker-manual-applied',
          sourceEntityId: 'org-1:job-1:person-2:manual_applied',
          sourceApplicationContext: {
            jobContext: {
              listing: {
                sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
              },
            },
          },
          createdAt: '2026-04-29T10:00:00.000Z',
          updatedAt: '2026-04-29T11:00:00.000Z',
          matchAnalysis: null,
          matchAnalysisHistory: null,
        } as FilemakerJobApplication,
      ],
    };

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

    const markAppliedButton = screen.getByRole('button', {
      name: /Mark applied manually for FileMaker Consultant/i,
    });
    await waitFor(() => {
      expect(markAppliedButton).not.toBeDisabled();
      expect(markAppliedButton).toHaveTextContent('Applied');
    });

    fireEvent.click(markAppliedButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/filemaker/job-applications/application-1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    const fetchCalls = (
      fetch as unknown as {
        mock: { calls: Array<[string | URL | Request, RequestInit | undefined]> };
      }
    ).mock.calls;
    const patchCall = fetchCalls.find(
      ([url, init]) =>
        String(url) === '/api/filemaker/job-applications/application-1' &&
        init?.method === 'PATCH'
    );
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
      status: 'draft',
    });

    expect(
      await screen.findByRole('button', { name: /Mark applied manually for FileMaker Consultant/i })
    ).toHaveTextContent('Mark applied');

    expect(jobApplicationsPayload.applications[0]).toMatchObject({
      status: 'draft',
    });
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
    expect(screen.getByRole('link', { name: 'Edit action' })).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=runtime_action__job_application_apply'
    );
    expect(screen.getByText('Current: Headless')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Action browser mode' }));
    expect(screen.getByText('Current: Headed · Unsaved')).toBeInTheDocument();
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
      expect(mocks.savePlaywrightActionsMutateAsync).toHaveBeenCalledTimes(1);
    });
    const savedActions = (
      mocks.savePlaywrightActionsMutateAsync.mock.calls[0]?.[0] as {
        actions: Array<{ executionSettings: { headless: boolean | null }; runtimeKey: string | null }>;
      }
    ).actions;
    expect(
      savedActions.find((action) => action.runtimeKey === 'job_application_apply')?.executionSettings
        .headless
    ).toBe(false);

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
    expect(screen.getByText('Playwright application steps')).toBeInTheDocument();
    expect(screen.getByText('Launch browser')).toBeInTheDocument();
    expect(screen.getByText('Using headed browser mode.')).toBeInTheDocument();
    expect(screen.getByText('Authenticate')).toBeInTheDocument();
    expect(
      screen.getByText('Opening Pracuj.pl with saved integration settings.')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Application status'), {
      target: { value: 'applied' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Application status')).toHaveValue('applied');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(fetch).toHaveBeenCalledWith(
      '/api/filemaker/job-applications/application-1',
      expect.objectContaining({
        body: JSON.stringify({ status: 'applied' }),
        method: 'PATCH',
      })
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    });

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

  it('keeps sparse application email versions visible after generation completes', async () => {
    jobApplicationsPayload = {
      applications: [
        {
          id: 'application-1',
          activeArtifacts: {
            applicationEmailVersionId: 'email-version-1',
            coverLetterVersionId: null,
            tailoredCvVersionId: null,
          },
          artifactVersions: {
            applicationEmail: [
              {
                id: 'email-version-1',
                applicationNotes: [],
                confidence: null,
                createdAt: '2026-04-29T10:05:00.000Z',
                kind: 'application_email',
                linkedRecordId: null,
                missingInformation: [],
                payload: {
                  applicationEmail: {},
                },
                sourceRunId: 'run-email-1',
                version: 1,
              },
            ],
            coverLetter: [],
            tailoredCv: [],
          },
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
          applicationEmail: null,
          applicationNotes: [],
          missingInformation: [],
          confidence: null,
          source: 'ai-path-job-application-tailored-email',
          sourceEntityId: 'org-1:job-1:person-1:application_package',
          sourceApplicationContext: {},
          createdAt: '2026-04-29T10:00:00.000Z',
          updatedAt: '2026-04-29T10:05:00.000Z',
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
    expect(screen.getByText('Email v1')).toBeInTheDocument();
    expect(screen.getByText('Application email draft created.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByRole('dialog', { name: 'Prepared application' })).toBeInTheDocument();
    expect(screen.getByText('1 generated version')).toBeInTheDocument();
    expect(screen.getByText('Email version')).toBeInTheDocument();
    expect(screen.getByText('No application email content was generated.')).toBeInTheDocument();
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
