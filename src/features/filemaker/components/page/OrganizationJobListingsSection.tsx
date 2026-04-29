'use client';

/* eslint-disable complexity, max-lines, max-lines-per-function */

import {
  BriefcaseBusiness,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { MultiSelectOption } from '@/shared/ui/forms-and-actions.public';
import {
  FormField,
  FormSection,
  MultiSelect,
  SelectSimple,
} from '@/shared/ui/forms-and-actions.public';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Textarea,
  useToast,
} from '@/shared/ui/primitives.public';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { DetailModal } from '@/shared/ui/templates.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';
import { JobApplicationPreparationModal } from './JobApplicationPreparationModal';
import { createClientFilemakerId, formatTimestamp } from '../../pages/filemaker-page-utils';
import {
  buildFilemakerLexiconTypeMetadata,
  compareFilemakerLexiconTypeKeys,
  formatFilemakerLexiconCategory,
  type FilemakerLexiconTypeMetadataMap,
} from '../../pages/AdminFilemakerLexiconPage.type-metadata';
import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_JOB_APPLICATION_SETTINGS_KEY,
  createFilemakerJobListing,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerJobApplicationSettings,
} from '../../settings';
import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerJobApplication,
  FilemakerJobApplicationStatus,
  FilemakerJobListing,
  FilemakerJobListingSalaryPeriod,
  FilemakerJobListingStatus,
  FilemakerLexiconTerm,
} from '../../types';

const JOB_STATUS_OPTIONS: Array<{ value: FilemakerJobListingStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

const SALARY_PERIOD_OPTIONS: Array<{ value: FilemakerJobListingSalaryPeriod; label: string }> = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'fixed', label: 'Fixed' },
];

const APPLICATION_STATUS_OPTIONS: Array<{ value: FilemakerJobApplicationStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'applied', label: 'Applied' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

const toCampaignOption = (campaign: FilemakerEmailCampaign): MultiSelectOption => ({
  value: campaign.id,
  label: campaign.name.trim().length > 0 ? campaign.name : campaign.id,
});

const toLexiconOption = (
  term: FilemakerLexiconTerm,
  typeMetadata: FilemakerLexiconTypeMetadataMap
): MultiSelectOption => ({
  value: term.id,
  label: `${term.label} (${formatFilemakerLexiconCategory(term.typeKey, typeMetadata)})`,
});

const lexiconTermHref = (term: FilemakerLexiconTerm): string => {
  const params = new URLSearchParams({
    type: term.typeKey,
    query: term.label,
  });
  return `/admin/filemaker/lexicon?${params.toString()}`;
};

const groupLexiconTermsByCategory = (
  terms: FilemakerLexiconTerm[],
  typeMetadata: FilemakerLexiconTypeMetadataMap
): Array<{ typeKey: FilemakerLexiconTerm['typeKey']; terms: FilemakerLexiconTerm[] }> => {
  const groups = new Map<FilemakerLexiconTerm['typeKey'], FilemakerLexiconTerm[]>();
  terms.forEach((term: FilemakerLexiconTerm): void => {
    const existing = groups.get(term.typeKey) ?? [];
    existing.push(term);
    groups.set(term.typeKey, existing);
  });
  return Array.from(groups.entries())
    .map(([typeKey, groupTerms]) => ({
      typeKey,
      terms: groupTerms,
    }))
    .sort((left, right): number =>
      compareFilemakerLexiconTypeKeys(left.typeKey, right.typeKey, typeMetadata)
    );
};

const RESPONSIBILITY_ITEM_START_RE =
  /(Tworzenie|Budowanie|Integracja|Wsparcie|Dbanie|Optymalizacja|Debugowanie|Rozw[oó]j|Projektowanie|Implementacja|Utrzymanie|Wsp[oó]łpraca|Przygotowywanie|Prowadzenie|Analiza|Testowanie|Dokumentowanie|Creating|Building|Integrating|Supporting|Maintaining|Designing|Implementing|Optimizing|Debugging|Developing|Updating)\b/giu;

const RESPONSIBILITY_HEADING_RE =
  /^(tw[oó]j zakres obowi[aą]zk[oó]w|zakres obowi[aą]zk[oó]w|responsibilities|your responsibilities|role responsibilities)\s*/iu;

const splitResponsibilityTermLabel = (label: string): string[] => {
  const normalized = label.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return [];
  const withoutHeading = normalized.replace(RESPONSIBILITY_HEADING_RE, '').trim();
  const withBreaks = withoutHeading
    .replace(RESPONSIBILITY_ITEM_START_RE, '\n$1')
    .replace(/([.!?])\s+/g, '$1\n');
  const items = withBreaks
    .split(/\n+|[;•]+/u)
    .map((item: string): string => item.trim())
    .filter((item: string): boolean => item.length > 0);
  return items.length > 0 ? items : [normalized];
};

function ResponsibilityLexiconTerms(props: {
  terms: FilemakerLexiconTerm[];
}): React.JSX.Element {
  return (
    <ul className='mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-gray-300'>
      {props.terms.flatMap((term: FilemakerLexiconTerm): React.JSX.Element[] =>
        splitResponsibilityTermLabel(term.label).map(
          (item: string, itemIndex: number): React.JSX.Element => (
            <li key={`${term.id}-${itemIndex}`}>
              <a
                href={lexiconTermHref(term)}
                className='underline-offset-4 hover:text-white hover:underline'
                title={`Open Responsibility lexicon term: ${term.label}`}
              >
                {item}
              </a>
            </li>
          )
        )
      )}
    </ul>
  );
}

const addMissingCampaignOptions = (
  options: MultiSelectOption[],
  selectedCampaignIds: string[]
): MultiSelectOption[] => {
  const knownIds = new Set(options.map((option: MultiSelectOption): string => option.value));
  const missingOptions = selectedCampaignIds
    .filter((campaignId: string): boolean => campaignId.length > 0 && !knownIds.has(campaignId))
    .map((campaignId: string): MultiSelectOption => ({
      value: campaignId,
      label: `Missing campaign (${campaignId})`,
    }));
  return [...options, ...missingOptions];
};

const addMissingLexiconOptions = (
  options: MultiSelectOption[],
  selectedTermIds: string[]
): MultiSelectOption[] => {
  const knownIds = new Set(options.map((option: MultiSelectOption): string => option.value));
  const missingOptions = selectedTermIds
    .filter((termId: string): boolean => termId.length > 0 && !knownIds.has(termId))
    .map((termId: string): MultiSelectOption => ({
      value: termId,
      label: `Missing lexicon term (${termId})`,
    }));
  return [...options, ...missingOptions];
};

const buildLexiconOptions = (
  database: FilemakerDatabase,
  typeMetadata: FilemakerLexiconTypeMetadataMap
): MultiSelectOption[] =>
  database.lexiconTerms
    .filter((term: FilemakerLexiconTerm): boolean => term.typeKey !== 'address')
    .slice()
    .sort((left: FilemakerLexiconTerm, right: FilemakerLexiconTerm): number => {
      const typeCompare = compareFilemakerLexiconTypeKeys(
        left.typeKey,
        right.typeKey,
        typeMetadata
      );
      if (typeCompare !== 0) return typeCompare;
      return left.label.localeCompare(right.label);
    })
    .map((term: FilemakerLexiconTerm): MultiSelectOption => toLexiconOption(term, typeMetadata));

const formatSalary = (listing: FilemakerJobListing): string => {
  const currency = listing.salaryCurrency ?? '';
  const min = listing.salaryMin ?? null;
  const max = listing.salaryMax ?? null;
  const salaryText = listing.salaryText?.trim() ?? '';
  if (min === null && max === null) return salaryText.length > 0 ? salaryText : 'Salary not set';
  if (min !== null && max !== null) return `${min}-${max} ${currency}`.trim();
  if (min !== null) return `From ${min} ${currency}`.trim();
  return `Up to ${max ?? ''} ${currency}`.trim();
};

const createBlankJobListing = (organizationId: string): FilemakerJobListing =>
  createFilemakerJobListing({
    id: createClientFilemakerId('filemaker-job-listing'),
    organizationId,
    title: '',
    description: '',
    salaryCurrency: 'PLN',
    salaryPeriod: 'monthly',
    status: 'draft',
    targetedCampaignIds: [],
  });

type JobApplicationsState = {
  applications: FilemakerJobApplication[];
  error: string | null;
  isLoading: boolean;
};

const formatApplicationTitle = (application: FilemakerJobApplication): string => {
  const subject = application.coverLetter?.subject?.trim() ?? '';
  if (subject.length > 0) return subject;
  const cvTitle = application.tailoredCv?.title?.trim() ?? '';
  if (cvTitle.length > 0) return cvTitle;
  const jobTitle = application.jobTitle?.trim() ?? '';
  return jobTitle.length > 0 ? jobTitle : 'Draft application';
};

const formatApplicationPerson = (application: FilemakerJobApplication): string => {
  const personName = application.personName?.trim() ?? '';
  return personName.length > 0 ? personName : application.personId;
};

const formatApplicationPreview = (application: FilemakerJobApplication): string => {
  const body = application.coverLetter?.bodyMarkdown?.trim() ?? '';
  if (body.length === 0) return 'Cover letter draft created.';
  return body.length > 180 ? `${body.slice(0, 180).trim()}...` : body;
};

const formatApplicationConfidence = (application: FilemakerJobApplication): string => {
  if (application.confidence === null) return 'Confidence not set';
  return `${Math.round(application.confidence * 100)}% confidence`;
};

const formatNullableText = (value: string | null | undefined, fallback: string): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : fallback;
};

const readDownloadFilename = (response: Response, fallback: string): string => {
  const contentDisposition = response.headers.get('Content-Disposition') ?? '';
  const quoted = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quoted?.[1] !== undefined && quoted[1].length > 0) return quoted[1];
  const unquoted = /filename=([^;]+)/i.exec(contentDisposition);
  const unquotedFilename = unquoted?.[1]?.trim() ?? '';
  return unquotedFilename.length > 0 ? unquotedFilename : fallback;
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const createDownloadFilename = (value: string | null | undefined, fallback: string): string => {
  const normalized = (value ?? '')
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 0 ? normalized : fallback;
};

const composeCoverLetterText = (application: FilemakerJobApplication): string => {
  const subject = formatNullableText(application.coverLetter?.subject, 'Cover letter');
  const body = formatNullableText(
    application.coverLetter?.bodyMarkdown,
    'No cover letter content was generated.'
  );
  const meta = [
    formatApplicationPerson(application),
    application.jobTitle,
    application.organizationName,
  ]
    .map((value: string | null | undefined): string => value?.trim() ?? '')
    .filter((value: string): boolean => value.length > 0)
    .join(' · ');
  return [subject, meta, body].filter((value: string): boolean => value.length > 0).join('\n\n');
};

const normalizeExternalHref = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
};

const readRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getApplicationContextJobHref = (application: FilemakerJobApplication): string | null => {
  const context = readRecord(application.sourceApplicationContext);
  const jobContext = readRecord(context?.['jobContext']);
  const listing = readRecord(jobContext?.['listing']);
  return normalizeExternalHref(listing?.['sourceUrl']);
};

const getApplicationJobHref = (
  application: FilemakerJobApplication,
  listing: FilemakerJobListing | null | undefined
): string | null =>
  normalizeExternalHref(listing?.sourceUrl) ?? getApplicationContextJobHref(application);

const cvApplicationHref = (application: FilemakerJobApplication): string | null => {
  if (application.tailoredCvId === null || application.personId.trim().length === 0) {
    return null;
  }
  return `/admin/filemaker/persons/${encodeURIComponent(
    application.personId
  )}/cvs/${encodeURIComponent(application.tailoredCvId)}`;
};

const groupApplicationsByJobListing = (
  applications: FilemakerJobApplication[]
): Map<string, FilemakerJobApplication[]> => {
  const groups = new Map<string, FilemakerJobApplication[]>();
  applications.forEach((application: FilemakerJobApplication): void => {
    const jobListingId = application.jobListingId.trim();
    if (jobListingId.length === 0) return;
    const group = groups.get(jobListingId) ?? [];
    group.push(application);
    groups.set(jobListingId, group);
  });
  return groups;
};

function JobApplicationsInline({
  applications,
  jobListing,
  onOpenApplication,
}: {
  applications: FilemakerJobApplication[];
  jobListing: FilemakerJobListing;
  onOpenApplication: (applicationId: string) => void;
}): React.JSX.Element | null {
  if (applications.length === 0) return null;
  return (
    <div className='rounded-md border border-border/40 bg-background/20 p-3'>
      <div className='mb-2 flex items-center gap-2 text-xs font-semibold text-gray-200'>
        <FileText className='h-3.5 w-3.5 text-emerald-300' aria-hidden='true' />
        Prepared applications
      </div>
      <div className='space-y-2'>
        {applications.slice(0, 3).map((application: FilemakerJobApplication) => {
          const cvHref = cvApplicationHref(application);
          const jobHref = getApplicationJobHref(application, jobListing);
          return (
            <div
              key={application.id}
              className='border-t border-border/40 pt-2 first:border-t-0 first:pt-0'
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium text-gray-100'>
                    {formatApplicationTitle(application)}
                  </div>
                  <div className='text-[11px] text-gray-500'>
                    {formatApplicationPerson(application)} · {formatTimestamp(application.createdAt)}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-7 gap-1.5'
                    onClick={(): void => onOpenApplication(application.id)}
                  >
                    <Eye className='h-3.5 w-3.5' aria-hidden='true' />
                    View
                  </Button>
                  {cvHref !== null ? (
                    <a className='text-xs text-emerald-300 hover:underline' href={cvHref}>
                      Open CV
                    </a>
                  ) : null}
                  {jobHref !== null ? (
                    <a
                      className='inline-flex items-center gap-1 text-xs text-blue-300 hover:underline'
                      href={jobHref}
                      target='_blank'
                      rel='noreferrer'
                    >
                      <ExternalLink className='h-3 w-3' aria-hidden='true' />
                      Job
                    </a>
                  ) : null}
                </div>
              </div>
              <p className='mt-1 line-clamp-2 text-xs text-gray-400'>
                {formatApplicationPreview(application)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApplicationPackageModal({
  application,
  isMutating,
  jobListing,
  onClose,
  onDelete,
  onStatusChange,
}: {
  application: FilemakerJobApplication | null;
  isMutating: boolean;
  jobListing: FilemakerJobListing | null;
  onClose: () => void;
  onDelete: (applicationId: string) => void;
  onStatusChange: (applicationId: string, status: FilemakerJobApplicationStatus) => void;
}): React.JSX.Element {
  const { toast } = useToast();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCoverLetterPdf, setIsExportingCoverLetterPdf] = useState(false);
  const cvHref = application !== null ? cvApplicationHref(application) : null;
  const jobHref = application !== null ? getApplicationJobHref(application, jobListing) : null;
  const notes = application?.applicationNotes ?? [];
  const missingInformation = application?.missingInformation ?? [];
  const skills = application?.tailoredCv?.skills ?? [];
  const canExportPdf =
    application?.tailoredCvId !== null &&
    application?.tailoredCvId !== undefined &&
    application.tailoredCvId.trim().length > 0;

  const handleExportPdf = async (): Promise<void> => {
    if (!application || !canExportPdf) return;
    setIsExportingPdf(true);
    try {
      const response = await fetch('/api/filemaker/cvs/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvId: application.tailoredCvId }),
      });
      if (!response.ok) throw new Error(`Failed to export CV (${response.status}).`);
      const fallbackTitle = formatNullableText(application.tailoredCv?.title, application.id);
      const filename = readDownloadFilename(response, `${fallbackTitle}.pdf`);
      downloadBlob(await response.blob(), filename);
      toast('CV PDF exported.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to export CV PDF.', {
        variant: 'error',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadCoverLetterText = (): void => {
    if (!application) return;
    const fallbackTitle = createDownloadFilename(application.coverLetter?.subject, application.id);
    downloadBlob(
      new Blob([composeCoverLetterText(application)], { type: 'text/plain;charset=utf-8' }),
      `${fallbackTitle}.txt`
    );
    toast('Cover letter text downloaded.', { variant: 'success' });
  };

  const handleExportCoverLetterPdf = async (): Promise<void> => {
    if (!application) return;
    setIsExportingCoverLetterPdf(true);
    try {
      const response = await fetch(
        `/api/filemaker/job-applications/${encodeURIComponent(application.id)}/cover-letter-pdf`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error(`Failed to export cover letter (${response.status}).`);
      const fallbackTitle = createDownloadFilename(application.coverLetter?.subject, application.id);
      const filename = readDownloadFilename(response, `${fallbackTitle}.pdf`);
      downloadBlob(await response.blob(), filename);
      toast('Cover letter PDF exported.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to export cover letter PDF.', {
        variant: 'error',
      });
    } finally {
      setIsExportingCoverLetterPdf(false);
    }
  };

  return (
    <DetailModal
      isOpen={application !== null}
      onClose={onClose}
      title='Prepared application'
      subtitle={application !== null ? formatApplicationTitle(application) : undefined}
      size='lg'
      footer={
        <>
          {cvHref !== null ? (
            <a
              href={cvHref}
              className='inline-flex h-9 items-center rounded-md border border-border/70 px-3 text-sm text-gray-100 hover:bg-white/5'
            >
              Open CV
            </a>
          ) : null}
          {canExportPdf ? (
            <Button
              type='button'
              variant='outline'
              onClick={(): void => {
                void handleExportPdf();
              }}
              disabled={isMutating || isExportingPdf}
              className='gap-1.5'
            >
              {!isExportingPdf ? <Download className='h-3.5 w-3.5' aria-hidden='true' /> : null}
              {isExportingPdf ? 'Exporting...' : 'Export CV PDF'}
            </Button>
          ) : null}
          {jobHref !== null ? (
            <a
              href={jobHref}
              target='_blank'
              rel='noreferrer'
              className='inline-flex h-9 items-center gap-1.5 rounded-md border border-border/70 px-3 text-sm text-gray-100 hover:bg-white/5'
            >
              <ExternalLink className='h-3.5 w-3.5' aria-hidden='true' />
              Apply
            </a>
          ) : null}
          {application !== null ? (
            <Button
              type='button'
              variant='outline'
              onClick={(): void => onDelete(application.id)}
              disabled={isMutating}
            >
              Delete
            </Button>
          ) : null}
          <Button type='button' onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {application !== null ? (
        <div className='space-y-4'>
          <div className='flex flex-wrap gap-2 text-xs text-gray-400'>
            <Badge variant='outline'>{application.status}</Badge>
            <Badge variant='outline'>{formatApplicationConfidence(application)}</Badge>
            <Badge variant='outline'>{formatApplicationPerson(application)}</Badge>
            <Badge variant='outline'>{formatTimestamp(application.createdAt)}</Badge>
          </div>

          <FormField label='Application status'>
            <SelectSimple
              value={application.status}
              onValueChange={(value: string): void => {
                onStatusChange(application.id, value as FilemakerJobApplicationStatus);
              }}
              options={APPLICATION_STATUS_OPTIONS}
              ariaLabel='Application status'
              disabled={isMutating}
            />
          </FormField>

          <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]'>
            <div className='space-y-3'>
              <section className='space-y-2'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <h4 className='text-sm font-semibold text-white'>Cover letter</h4>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 gap-1.5'
                      onClick={handleDownloadCoverLetterText}
                      disabled={isMutating}
                    >
                      <Download className='h-3.5 w-3.5' aria-hidden='true' />
                      Download Text
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 gap-1.5'
                      onClick={(): void => {
                        void handleExportCoverLetterPdf();
                      }}
                      disabled={isMutating || isExportingCoverLetterPdf}
                    >
                      {!isExportingCoverLetterPdf ? (
                        <Download className='h-3.5 w-3.5' aria-hidden='true' />
                      ) : null}
                      {isExportingCoverLetterPdf ? 'Exporting...' : 'Export PDF'}
                    </Button>
                  </div>
                </div>
                <div className='rounded-md border border-border/50 bg-background/30 p-3'>
                  <div className='mb-2 text-sm font-medium text-gray-100'>
                    {formatNullableText(application.coverLetter?.subject, 'Cover letter')}
                  </div>
                  <pre className='whitespace-pre-wrap text-xs leading-5 text-gray-300'>
                    {formatNullableText(
                      application.coverLetter?.bodyMarkdown,
                      'No cover letter content was generated.'
                    )}
                  </pre>
                </div>
              </section>

              <section className='space-y-2'>
                <h4 className='text-sm font-semibold text-white'>Tailored CV</h4>
                <div className='rounded-md border border-border/50 bg-background/30 p-3'>
                  <div className='mb-2 text-sm font-medium text-gray-100'>
                    {formatNullableText(application.tailoredCv?.title, 'Tailored CV')}
                  </div>
                  <p className='text-xs leading-5 text-gray-300'>
                    {formatNullableText(
                      application.tailoredCv?.professionalSummary,
                      'No professional summary was generated.'
                    )}
                  </p>
                  {skills.length > 0 ? (
                    <div className='mt-3 flex flex-wrap gap-1'>
                      {skills.map((skill: string) => (
                        <Badge key={skill} variant='outline'>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            <aside className='space-y-3'>
              <section className='space-y-2'>
                <h4 className='text-sm font-semibold text-white'>Notes</h4>
                {notes.length > 0 ? (
                  <ul className='space-y-1 text-xs text-gray-300'>
                    {notes.map((note: string) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-xs text-gray-500'>No application notes.</p>
                )}
              </section>

              <section className='space-y-2'>
                <h4 className='text-sm font-semibold text-white'>Missing information</h4>
                {missingInformation.length > 0 ? (
                  <ul className='space-y-1 text-xs text-gray-300'>
                    {missingInformation.map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-xs text-gray-500'>No missing information flagged.</p>
                )}
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </DetailModal>
  );
}

export function OrganizationJobListingsSection(): React.JSX.Element | null {
  const settingsStore = useSettingsStore();
  const { jobListings, organization } = useAdminFilemakerOrganizationEditPageStateContext();
  const { setJobListings } = useAdminFilemakerOrganizationEditPageActionsContext();
  const [applicationListingId, setApplicationListingId] = useState<string | null>(null);
  const [selectedPreparedApplicationId, setSelectedPreparedApplicationId] = useState<string | null>(
    null
  );
  const [isMutatingApplication, setIsMutatingApplication] = useState(false);
  const [applicationsState, setApplicationsState] = useState<JobApplicationsState>({
    applications: [],
    error: null,
    isLoading: false,
  });
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawJobApplicationSettings = settingsStore.get(FILEMAKER_JOB_APPLICATION_SETTINGS_KEY);
  const organizationId = organization?.id ?? '';
  const filemakerDatabase = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const jobApplicationSettings = useMemo(
    () => parseFilemakerJobApplicationSettings(rawJobApplicationSettings),
    [rawJobApplicationSettings]
  );
  const lexiconTypeMetadata = useMemo(
    () => buildFilemakerLexiconTypeMetadata(filemakerDatabase),
    [filemakerDatabase]
  );

  const campaignOptions = useMemo<MultiSelectOption[]>(() => {
    const registry = parseFilemakerEmailCampaignRegistry(rawCampaigns);
    return registry.campaigns.map(toCampaignOption);
  }, [rawCampaigns]);
  const lexiconOptions = useMemo<MultiSelectOption[]>(
    () => buildLexiconOptions(filemakerDatabase, lexiconTypeMetadata),
    [filemakerDatabase, lexiconTypeMetadata]
  );
  const lexiconTermsById = useMemo(() => {
    return new Map(
      filemakerDatabase.lexiconTerms.map(
        (term: FilemakerLexiconTerm): [string, FilemakerLexiconTerm] => [term.id, term]
      )
    );
  }, [filemakerDatabase]);

  const targetedCount = jobListings.filter(
    (listing: FilemakerJobListing): boolean => listing.targetedCampaignIds.length > 0
  ).length;
  const applicationsByJobListingId = useMemo(
    () => groupApplicationsByJobListing(applicationsState.applications),
    [applicationsState.applications]
  );
  const selectedPreparedApplication = useMemo(
    () =>
      applicationsState.applications.find(
        (application: FilemakerJobApplication): boolean =>
          application.id === selectedPreparedApplicationId
      ) ?? null,
    [applicationsState.applications, selectedPreparedApplicationId]
  );
  const selectedPreparedJobListing = useMemo(
    () =>
      selectedPreparedApplication !== null
        ? jobListings.find(
            (listing: FilemakerJobListing): boolean =>
              listing.id === selectedPreparedApplication.jobListingId
          ) ?? null
        : null,
    [jobListings, selectedPreparedApplication]
  );

  const loadApplications = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (organizationId.trim().length === 0) {
        setApplicationsState({ applications: [], error: null, isLoading: false });
        return;
      }
      setApplicationsState((current: JobApplicationsState): JobApplicationsState => ({
        ...current,
        error: null,
        isLoading: true,
      }));
      try {
        const response = await fetch(
          `/api/filemaker/job-applications?organizationId=${encodeURIComponent(
            organizationId
          )}&limit=100`,
          signal ? { signal } : undefined
        );
        if (!response.ok) throw new Error(`Failed to load applications (${response.status}).`);
        const payload = (await response.json()) as { applications?: FilemakerJobApplication[] };
        setApplicationsState({
          applications: Array.isArray(payload.applications) ? payload.applications : [],
          error: null,
          isLoading: false,
        });
      } catch (error: unknown) {
        if (signal?.aborted === true) return;
        logClientError(error);
        setApplicationsState({
          applications: [],
          error: error instanceof Error ? error.message : 'Failed to load applications.',
          isLoading: false,
        });
      }
    },
    [organizationId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadApplications(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadApplications]);

  const addListing = useCallback((): void => {
    if (!organization) return;
    setJobListings((current: FilemakerJobListing[]) => [
      ...current,
      createBlankJobListing(organization.id),
    ]);
  }, [organization, setJobListings]);

  const updateListing = useCallback(
    (listingId: string, patch: Record<string, unknown>): void => {
      setJobListings((current: FilemakerJobListing[]) =>
        current.map((listing: FilemakerJobListing): FilemakerJobListing => {
          if (listing.id !== listingId) return listing;
          return createFilemakerJobListing({
            ...listing,
            ...patch,
            updatedAt: new Date().toISOString(),
          });
        })
      );
    },
    [setJobListings]
  );

  const removeListing = useCallback(
    (listingId: string): void => {
      setJobListings((current: FilemakerJobListing[]) =>
        current.filter((listing: FilemakerJobListing): boolean => listing.id !== listingId)
      );
    },
    [setJobListings]
  );

  const handleApplicationStatusChange = useCallback(
    async (
      applicationId: string,
      status: FilemakerJobApplicationStatus
    ): Promise<void> => {
      setIsMutatingApplication(true);
      try {
        const response = await fetch(
          `/api/filemaker/job-applications/${encodeURIComponent(applicationId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to update application (${response.status}).`);
        }
        const payload = (await response.json()) as {
          application?: FilemakerJobApplication;
        };
        const nextApplication = payload.application;
        if (nextApplication !== undefined) {
          setApplicationsState((current: JobApplicationsState): JobApplicationsState => ({
            ...current,
            applications: current.applications.map(
              (application: FilemakerJobApplication): FilemakerJobApplication =>
                application.id === nextApplication.id ? nextApplication : application
            ),
          }));
        }
      } catch (error: unknown) {
        logClientError(error);
        setApplicationsState((current: JobApplicationsState): JobApplicationsState => ({
          ...current,
          error: error instanceof Error ? error.message : 'Failed to update application.',
        }));
      } finally {
        setIsMutatingApplication(false);
      }
    },
    []
  );

  const handleApplicationDelete = useCallback(async (applicationId: string): Promise<void> => {
    setIsMutatingApplication(true);
    try {
      const response = await fetch(
        `/api/filemaker/job-applications/${encodeURIComponent(applicationId)}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete application (${response.status}).`);
      }
      setApplicationsState((current: JobApplicationsState): JobApplicationsState => ({
        ...current,
        applications: current.applications.filter(
          (application: FilemakerJobApplication): boolean => application.id !== applicationId
        ),
      }));
      setSelectedPreparedApplicationId(null);
    } catch (error: unknown) {
      logClientError(error);
      setApplicationsState((current: JobApplicationsState): JobApplicationsState => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to delete application.',
      }));
    } finally {
      setIsMutatingApplication(false);
    }
  }, []);

  if (!organization) return null;

  return (
    <FormSection
      id='organization-job-listings'
      title={
        <span className='flex items-center gap-2'>
          <BriefcaseBusiness className='h-3.5 w-3.5 text-gray-400' aria-hidden='true' />
          Job listings
        </span>
      }
      className='space-y-4 p-4'
    >
      <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400'>
        <div>
          {jobListings.length} listing{jobListings.length === 1 ? '' : 's'} · {targetedCount}{' '}
          targeted
          {applicationsState.applications.length > 0
            ? ` · ${applicationsState.applications.length} applications`
            : ''}
          {applicationsState.isLoading ? ' · loading applications' : ''}
          {applicationsState.error !== null ? ` · ${applicationsState.error}` : ''}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={(): void => {
              void loadApplications();
            }}
            disabled={applicationsState.isLoading}
            className='h-8 gap-1.5'
          >
            {applicationsState.isLoading ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
            ) : (
              <RefreshCw className='h-3.5 w-3.5' aria-hidden='true' />
            )}
            Applications
          </Button>
          <Button type='button' size='sm' onClick={addListing} className='h-8 gap-1.5'>
            <Plus className='h-3.5 w-3.5' aria-hidden='true' />
            Add listing
          </Button>
        </div>
      </div>

      {jobListings.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-gray-500'>
          No job listings are attached to this organization.
        </div>
      ) : (
        <div className='space-y-3'>
          {jobListings.map((listing: FilemakerJobListing, index: number) => {
            const campaignSelectOptions = addMissingCampaignOptions(
              campaignOptions,
              listing.targetedCampaignIds
            );
            const selectedLexiconTerms = listing.lexiconTermIds
              .map((termId: string): FilemakerLexiconTerm | undefined => lexiconTermsById.get(termId))
              .filter(
                (term): term is FilemakerLexiconTerm =>
                  term !== undefined && term.typeKey !== 'address'
              );
            const editableLexiconTermIds = selectedLexiconTerms.map(
              (term: FilemakerLexiconTerm): string => term.id
            );
            const lexiconSelectOptions = addMissingLexiconOptions(
              lexiconOptions,
              editableLexiconTermIds
            );
            const applications = applicationsByJobListingId.get(listing.id) ?? [];
            const targeted = listing.targetedCampaignIds.length > 0;
            return (
              <div
                key={listing.id}
                id={`job-listing-${encodeURIComponent(listing.id)}`}
                className='space-y-4 rounded-md border border-border/60 bg-card/20 p-4'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='flex min-w-0 flex-wrap items-center gap-2'>
                    <Badge variant={targeted ? 'success' : 'warning'}>
                      {targeted ? 'Targeted' : 'Not targeted'}
                    </Badge>
                    <span className='min-w-0 text-sm font-medium text-gray-100'>
                      {listing.title.trim().length > 0
                        ? listing.title
                        : `Job listing ${index + 1}`}
                    </span>
                    <span className='text-xs text-gray-500'>{formatSalary(listing)}</span>
                    {(listing.postedAt ?? '').trim().length > 0 ? (
                      <Badge variant='outline'>Posted {listing.postedAt}</Badge>
                    ) : null}
                    {(listing.expiresAt ?? '').trim().length > 0 ? (
                      <Badge variant='outline'>Expires {listing.expiresAt}</Badge>
                    ) : null}
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 gap-1.5'
                      onClick={(): void => setApplicationListingId(listing.id)}
                      aria-label={`Prepare application for ${
                        listing.title.trim().length > 0
                          ? listing.title
                          : `Job listing ${index + 1}`
                      }`}
                      title='Prepare application'
                    >
                      <FileText className='h-3.5 w-3.5' aria-hidden='true' />
                      Prepare
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-8 w-8 p-0'
                          aria-label={`Open actions for ${
                            listing.title.trim().length > 0
                              ? listing.title
                              : `Job listing ${index + 1}`
                          }`}
                          title='Job listing actions'
                        >
                          <MoreVertical className='h-3.5 w-3.5' aria-hidden='true' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='z-[95] w-44'>
                        <DropdownMenuItem
                          className='gap-2 text-rose-300 focus:text-rose-200'
                          onSelect={(): void => removeListing(listing.id)}
                        >
                          <Trash2 className='h-3.5 w-3.5' aria-hidden='true' />
                          Remove listing
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className='grid gap-3 md:grid-cols-2'>
                  <FormField label='Job title'>
                    <Input
                      value={listing.title}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { title: event.target.value })
                      }
                      placeholder='e.g. Senior FileMaker Developer'
                      aria-label={`Job listing ${index + 1} title`}
                    />
                  </FormField>
                  <FormField label='Status'>
                    <SelectSimple
                      value={listing.status}
                      onValueChange={(value: string): void =>
                        updateListing(listing.id, {
                          status: value as FilemakerJobListingStatus,
                        })
                      }
                      options={JOB_STATUS_OPTIONS}
                      placeholder='Select status'
                      ariaLabel={`Job listing ${index + 1} status`}
                      title={`Job listing ${index + 1} status`}
                    />
                  </FormField>
                  <FormField label='Location'>
                    <Input
                      value={listing.location ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { location: event.target.value })
                      }
                      placeholder='e.g. Warsaw / Remote'
                      aria-label={`Job listing ${index + 1} location`}
                    />
                  </FormField>
                  <FormField label='City'>
                    <Input
                      value={listing.city ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { city: event.target.value })
                      }
                      placeholder='e.g. Warsaw'
                      aria-label={`Job listing ${index + 1} city`}
                    />
                  </FormField>
                  <FormField label='Street'>
                    <Input
                      value={listing.street ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { street: event.target.value })
                      }
                      placeholder='Street'
                      aria-label={`Job listing ${index + 1} street`}
                    />
                  </FormField>
                  <FormField label='Street number'>
                    <Input
                      value={listing.streetNumber ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { streetNumber: event.target.value })
                      }
                      placeholder='No.'
                      aria-label={`Job listing ${index + 1} street number`}
                    />
                  </FormField>
                  <FormField label='Postal code'>
                    <Input
                      value={listing.postalCode ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { postalCode: event.target.value })
                      }
                      placeholder='00-000'
                      aria-label={`Job listing ${index + 1} postal code`}
                    />
                  </FormField>
                  <FormField label='Country'>
                    <Input
                      value={listing.country ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { country: event.target.value })
                      }
                      placeholder='Poland'
                      aria-label={`Job listing ${index + 1} country`}
                    />
                  </FormField>
                  <FormField label='Country ID'>
                    <Input
                      value={listing.countryId ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { countryId: event.target.value })
                      }
                      placeholder='PL'
                      aria-label={`Job listing ${index + 1} country ID`}
                    />
                  </FormField>
                  <FormField label='Salary period'>
                    <SelectSimple
                      value={listing.salaryPeriod}
                      onValueChange={(value: string): void =>
                        updateListing(listing.id, {
                          salaryPeriod: value as FilemakerJobListingSalaryPeriod,
                        })
                      }
                      options={SALARY_PERIOD_OPTIONS}
                      placeholder='Select salary period'
                      ariaLabel={`Job listing ${index + 1} salary period`}
                      title={`Job listing ${index + 1} salary period`}
                    />
                  </FormField>
                  <FormField label='Posted at'>
                    <Input
                      value={listing.postedAt ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { postedAt: event.target.value })
                      }
                      placeholder='2026-04-28T10:00:00.000Z'
                      aria-label={`Job listing ${index + 1} posted date`}
                    />
                  </FormField>
                  <FormField label='Expires at'>
                    <Input
                      value={listing.expiresAt ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { expiresAt: event.target.value })
                      }
                      placeholder='2026-05-28T23:59:59.000Z'
                      aria-label={`Job listing ${index + 1} expiry date`}
                    />
                  </FormField>
                  <FormField label='Salary min'>
                    <Input
                      type='number'
                      min='0'
                      step='1'
                      value={listing.salaryMin ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { salaryMin: event.target.value })
                      }
                      aria-label={`Job listing ${index + 1} salary min`}
                    />
                  </FormField>
                  <FormField label='Salary max'>
                    <Input
                      type='number'
                      min='0'
                      step='1'
                      value={listing.salaryMax ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { salaryMax: event.target.value })
                      }
                      aria-label={`Job listing ${index + 1} salary max`}
                    />
                  </FormField>
                  <FormField label='Currency'>
                    <Input
                      value={listing.salaryCurrency ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { salaryCurrency: event.target.value })
                      }
                      placeholder='PLN'
                      aria-label={`Job listing ${index + 1} salary currency`}
                    />
                  </FormField>
                  <FormField label='Salary text'>
                    <Input
                      value={listing.salaryText ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { salaryText: event.target.value })
                      }
                      placeholder='e.g. 16 000 - 24 000 PLN net + VAT / month'
                      aria-label={`Job listing ${index + 1} salary text`}
                    />
                  </FormField>
                  <FormField label='Lexicon tags'>
                    <MultiSelect
                      selected={editableLexiconTermIds}
                      options={lexiconSelectOptions}
                      onChange={(termIds: string[]): void =>
                        updateListing(listing.id, { lexiconTermIds: termIds })
                      }
                      placeholder='Select tags'
                      searchPlaceholder='Search tags'
                      emptyMessage='No lexicon terms found.'
                      disabled={lexiconSelectOptions.length === 0}
                      ariaLabel={`Job listing ${index + 1} lexicon tags`}
                    />
                    {selectedLexiconTerms.length > 0 ? (
                      <div className='mt-2 space-y-1'>
                        {groupLexiconTermsByCategory(
                          selectedLexiconTerms,
                          lexiconTypeMetadata
                        ).map((group) => (
                          <div
                            key={group.typeKey}
                            className={
                              group.typeKey === 'responsibility'
                                ? 'space-y-1'
                                : 'flex flex-wrap items-center gap-1'
                            }
                          >
                            <span className='text-[11px] font-medium uppercase text-muted-foreground'>
                              {formatFilemakerLexiconCategory(group.typeKey, lexiconTypeMetadata)}
                            </span>
                            {group.typeKey === 'responsibility' ? (
                              <ResponsibilityLexiconTerms terms={group.terms} />
                            ) : (
                              group.terms.map((term: FilemakerLexiconTerm) => (
                                <Badge key={term.id} variant='outline'>
                                  <a
                                    href={lexiconTermHref(term)}
                                    className='hover:underline'
                                    title={`Open ${formatFilemakerLexiconCategory(
                                      term.typeKey,
                                      lexiconTypeMetadata
                                    )} lexicon term: ${term.label}`}
                                  >
                                    {term.label}
                                  </a>
                                </Badge>
                              ))
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </FormField>
                  <FormField
                    label='Targeted campaigns'
                    description={
                      targeted
                        ? `Last marked targeted: ${formatTimestamp(listing.lastTargetedAt)}`
                        : 'No campaign targeting recorded.'
                    }
                  >
                    <MultiSelect
                      selected={listing.targetedCampaignIds}
                      options={campaignSelectOptions}
                      onChange={(campaignIds: string[]): void =>
                        updateListing(listing.id, {
                          targetedCampaignIds: campaignIds,
                          lastTargetedAt:
                            campaignIds.length > 0
                              ? listing.lastTargetedAt ?? new Date().toISOString()
                              : undefined,
                        })
                      }
                      placeholder='Select campaigns'
                      searchPlaceholder='Search campaigns'
                      emptyMessage='No campaigns found.'
                      disabled={campaignSelectOptions.length === 0}
                      ariaLabel={`Job listing ${index + 1} targeted campaigns`}
                    />
                  </FormField>
                  <FormField label='Description' className='md:col-span-2'>
                    <Textarea
                      value={listing.description}
                      rows={5}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                        updateListing(listing.id, { description: event.target.value })
                      }
                      placeholder='Role responsibilities, requirements, benefits, and hiring notes.'
                      aria-label={`Job listing ${index + 1} description`}
                    />
                  </FormField>
                  <FormField label='Job requirements' className='md:col-span-2'>
                    <Textarea
                      value={listing.requirements ?? ''}
                      rows={5}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                        updateListing(listing.id, { requirements: event.target.value })
                      }
                      placeholder='Candidate requirements, qualifications, and must-have skills.'
                      aria-label={`Job listing ${index + 1} requirements`}
                    />
                  </FormField>
                  <FormField label='Responsibilities' className='md:col-span-2'>
                    <Textarea
                      value={listing.responsibilities ?? ''}
                      rows={5}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                        updateListing(listing.id, { responsibilities: event.target.value })
                      }
                      placeholder='Role duties and recurring responsibilities.'
                      aria-label={`Job listing ${index + 1} responsibilities`}
                    />
                  </FormField>
                </div>
                <JobApplicationsInline
                  applications={applications}
                  jobListing={listing}
                  onOpenApplication={setSelectedPreparedApplicationId}
                />
              </div>
            );
          })}
        </div>
      )}
      <JobApplicationPreparationModal
        initialJobListingId={applicationListingId}
        isOpen={applicationListingId !== null}
        jobListings={jobListings}
        jobApplicationSettings={jobApplicationSettings}
        onClose={(): void => setApplicationListingId(null)}
        onCreated={(): void => {
          void loadApplications();
        }}
        organization={organization}
      />
      <ApplicationPackageModal
        application={selectedPreparedApplication}
        isMutating={isMutatingApplication}
        jobListing={selectedPreparedJobListing}
        onClose={(): void => setSelectedPreparedApplicationId(null)}
        onDelete={(applicationId: string): void => {
          void handleApplicationDelete(applicationId);
        }}
        onStatusChange={(applicationId: string, status: FilemakerJobApplicationStatus): void => {
          void handleApplicationStatusChange(applicationId, status);
        }}
      />
    </FormSection>
  );
}
