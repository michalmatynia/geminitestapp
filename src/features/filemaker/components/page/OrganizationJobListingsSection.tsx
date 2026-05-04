'use client';

/* eslint-disable complexity, max-lines, max-lines-per-function */

import {
  BriefcaseBusiness,
  CheckCircle2,
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { safeSetInterval, safeClearInterval } from '@/shared/lib/timers';

import type { MultiSelectOption } from '@/shared/ui/forms-and-actions.public';
import {
  FormActions,
  FormField,
  FormSection,
  MultiSelect,
  SelectSimple,
  ToggleRow,
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
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { getAiPathRun } from '@/shared/lib/ai-paths/api/client';
import { TriggerButtonBar } from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_LOCATION } from '@/shared/lib/ai-paths/job-application-prepare';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';

import { compileCvBlocksToHtml } from '../cv-builder/compile-cv-blocks';
import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';
import { JobBoardOriginBadge } from '../shared/JobBoardOriginBadge';
import {
  JobApplicationPreparationModal,
  type JobApplicationRunEntry,
} from './JobApplicationPreparationModal';
import { useJobApplicationApplyBrowserModeSetting } from './useJobApplicationApplyBrowserModeSetting';
import { openFilemakerCvPdfPreview } from '../../cv-pdf-preview';
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
  FilemakerCv,
  FilemakerEmailCampaign,
  FilemakerJobApplication,
  FilemakerJobApplicationApplyRun,
  FilemakerJobApplicationApplyRunResponse,
  FilemakerJobApplicationApplyRunStep,
  FilemakerJobApplicationLogEntry,
  FilemakerJobApplicationStatus,
  FilemakerJobListing,
  FilemakerJobListingSalaryPeriod,
  FilemakerJobListingStatus,
  FilemakerLexiconTerm,
} from '../../types';
import type {
  FilemakerJobApplicationActiveArtifacts,
  FilemakerJobApplicationArtifactVersion,
} from '../../filemaker-job-application.types';

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

type ManualAppliedJobApplicationResponse = {
  application?: FilemakerJobApplication;
};

type ManualAppliedLogRemovalTarget = {
  applicationId: string;
  logEntryId?: string;
};

type PreparedApplicationArtifactVersions = {
  applicationEmail: FilemakerJobApplication[];
  coverLetter: FilemakerJobApplication[];
  tailoredCv: FilemakerJobApplication[];
};

type PreparedJobApplication = FilemakerJobApplication & {
  applicationIds: string[];
  artifactVersions: PreparedApplicationArtifactVersions;
  baseApplicationId: string;
  canonicalApplicationKey: string;
};

const formatApplicationTitle = (application: FilemakerJobApplication): string => {
  const subject = application.coverLetter?.subject?.trim() ?? '';
  if (subject.length > 0) return subject;
  const emailSubject = application.applicationEmail?.subject?.trim() ?? '';
  if (emailSubject.length > 0) return emailSubject;
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
  if (body.length > 0) {
    return body.length > 180 ? `${body.slice(0, 180).trim()}...` : body;
  }
  const emailBody = (
    application.applicationEmail?.bodyText ??
    application.applicationEmail?.bodyMarkdown ??
    ''
  ).trim();
  if (emailBody.length > 0) {
    return emailBody.length > 180 ? `${emailBody.slice(0, 180).trim()}...` : emailBody;
  }
  const cvSummary = application.tailoredCv?.professionalSummary?.trim() ?? '';
  if (cvSummary.length > 0) {
    return cvSummary.length > 180 ? `${cvSummary.slice(0, 180).trim()}...` : cvSummary;
  }
  if (application.applicationEmail !== null) return 'Application email draft created.';
  if (application.tailoredCv !== null) return 'Tailored CV draft created.';
  return 'Application draft created.';
};

const formatApplicationConfidence = (application: FilemakerJobApplication): string => {
  if (application.confidence === null) return 'Confidence not set';
  return `${Math.round(application.confidence * 100)}% confidence`;
};

const toApplicationTimestamp = (application: FilemakerJobApplication): number => {
  const updatedAt = Date.parse(application.updatedAt);
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = Date.parse(application.createdAt);
  return Number.isFinite(createdAt) ? createdAt : 0;
};

const compareApplicationsByFreshness = (
  left: FilemakerJobApplication,
  right: FilemakerJobApplication
): number => toApplicationTimestamp(right) - toApplicationTimestamp(left);

const groupApplicationsByJobListingId = (
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

const toApplicationLogTimestamp = (entry: FilemakerJobApplicationLogEntry): number => {
  const value = Date.parse(entry.appliedAt);
  return Number.isFinite(value) ? value : 0;
};

const getManualAppliedLogRemovalTarget = (
  applications: FilemakerJobApplication[],
  personId: string
): ManualAppliedLogRemovalTarget | null => {
  const normalizedPersonId = personId.trim();
  if (normalizedPersonId.length === 0) return null;

  const targets = applications.flatMap(
    (
      application: FilemakerJobApplication
    ): Array<{ applicationId: string; logEntry: FilemakerJobApplicationLogEntry }> => {
      if (application.personId.trim() !== normalizedPersonId) return [];
      const manualLogEntries = (application.applicationLog ?? []).filter(
        (entry: FilemakerJobApplicationLogEntry): boolean => {
          if (entry.method !== 'manual') return false;
          if (
            entry.toStatus !== undefined &&
            entry.toStatus !== null &&
            entry.toStatus !== 'applied'
          ) return false;
          const entryPersonId = (entry.personId ?? '').trim();
          return entryPersonId.length === 0 || entryPersonId === normalizedPersonId;
        }
      );
      return manualLogEntries.map((logEntry: FilemakerJobApplicationLogEntry) => ({
        applicationId: application.id,
        logEntry,
      }));
    }
  );
  if (targets.length === 0) return null;

  const sortedTargets = targets.slice().sort(
    (
      left: { applicationId: string; logEntry: FilemakerJobApplicationLogEntry },
      right: { applicationId: string; logEntry: FilemakerJobApplicationLogEntry }
    ): number => toApplicationLogTimestamp(right.logEntry) - toApplicationLogTimestamp(left.logEntry)
  );
  const latestTarget = sortedTargets[0];
  return latestTarget === undefined
    ? null
    : { applicationId: latestTarget.applicationId, logEntryId: latestTarget.logEntry.id };
};

const getManualAppliedStatusOnlyTarget = (
  applications: FilemakerJobApplication[],
  personId: string
): ManualAppliedLogRemovalTarget | null => {
  const normalizedPersonId = personId.trim();
  if (normalizedPersonId.length === 0) return null;

  const applicableApplications = applications
    .filter(
      (application: FilemakerJobApplication): boolean =>
        application.personId.trim() === normalizedPersonId && application.status === 'applied'
    )
    .map((application: FilemakerJobApplication): ManualAppliedLogRemovalTarget => ({
      applicationId: application.id,
    }))
    .sort(
      (
        left: ManualAppliedLogRemovalTarget,
        right: ManualAppliedLogRemovalTarget
      ): number => {
        const leftApplication = applications.find(
          (application: FilemakerJobApplication): boolean => application.id === left.applicationId
        );
        const rightApplication = applications.find(
          (application: FilemakerJobApplication): boolean => application.id === right.applicationId
        );
        if (leftApplication === undefined && rightApplication === undefined) return 0;
        if (leftApplication === undefined) return 1;
        if (rightApplication === undefined) return -1;
        return toApplicationTimestamp(rightApplication) - toApplicationTimestamp(leftApplication);
      }
    );

  return applicableApplications[0] ?? null;
};

const hasTailoredCvArtifact = (application: FilemakerJobApplication): boolean =>
  (application.tailoredCvId?.trim().length ?? 0) > 0 || application.tailoredCv !== null;

const hasCoverLetterArtifact = (application: FilemakerJobApplication): boolean =>
  (application.coverLetter?.subject?.trim().length ?? 0) > 0 ||
  (application.coverLetter?.bodyMarkdown?.trim().length ?? 0) > 0;

const hasApplicationEmailArtifact = (application: FilemakerJobApplication): boolean =>
  (application.applicationEmail?.subject?.trim().length ?? 0) > 0 ||
  (application.applicationEmail?.bodyMarkdown?.trim().length ?? 0) > 0 ||
  (application.applicationEmail?.bodyText?.trim().length ?? 0) > 0 ||
  application.applicationEmail !== null ||
  application.artifactKind === 'application_email' ||
  application.artifactVersions.applicationEmail.length > 0;

const hasApplicationEmailVersionArtifact = (application: FilemakerJobApplication): boolean =>
  (application.applicationEmail?.subject?.trim().length ?? 0) > 0 ||
  (application.applicationEmail?.bodyMarkdown?.trim().length ?? 0) > 0 ||
  (application.applicationEmail?.bodyText?.trim().length ?? 0) > 0 ||
  application.applicationEmail !== null ||
  application.artifactKind === 'application_email';

const normalizePayloadString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeTrimmedString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const normalizePayloadStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry: unknown): string | null => normalizePayloadString(entry))
        .filter((entry): entry is string => entry !== null)
    : [];

const TAILORED_CV_ALLOWED_SECTIONS = [
  'Professional Summary',
  'Core Strengths',
  'Selected Technical Environment',
  'Experience Highlights',
];

const formatExperiencePatchLabel = (patch: {
  company?: string | null;
  experienceId?: string | null;
  experienceKey?: string | null;
  experienceTitle?: string | null;
  role?: string | null;
}): string => {
  const roleCompany = [patch.role, patch.company]
    .filter((value: string | null | undefined): value is string =>
      typeof value === 'string' && value.trim().length > 0
    )
    .join(' | ');
  return (
    patch.experienceTitle ??
    (roleCompany.length > 0 ? roleCompany : null) ??
    patch.experienceKey ??
    patch.experienceId ??
    'Experience'
  );
};

const normalizeTailoredCvPayload = (
  value: unknown
): FilemakerJobApplication['tailoredCv'] => {
  const payload = readRecord(value);
  const record = readRecord(payload?.['tailoredCv']) ?? payload;
  if (record === null) return null;
  const tailoringScope = readRecord(record['tailoringScope']);
  const tailoringPatch = readRecord(record['tailoringPatch']);
  const allowedSections =
    tailoringScope !== null && normalizePayloadStringArray(tailoringScope['allowedSections']).length > 0
      ? normalizePayloadStringArray(tailoringScope['allowedSections'])
      : TAILORED_CV_ALLOWED_SECTIONS;
  return {
    bodyMarkdown: normalizePayloadString(record['bodyMarkdown']),
    bodyText: normalizePayloadString(record['bodyText']),
    coreStrengths: normalizePayloadStringArray(record['coreStrengths']),
    educationHighlights: normalizePayloadStringArray(record['educationHighlights']),
    experienceHighlightPatches: Array.isArray(record['experienceHighlightPatches'])
      ? record['experienceHighlightPatches']
          .map((entry: unknown) => {
            const patch = readRecord(entry);
            if (patch === null) return null;
            const highlights = normalizePayloadStringArray(patch['highlights']);
            if (highlights.length === 0) return null;
            return {
              experienceKey: normalizePayloadString(patch['experienceKey']),
              experienceId: normalizePayloadString(patch['experienceId']),
              experienceTitle: normalizePayloadString(patch['experienceTitle']),
              company: normalizePayloadString(patch['company']),
              role: normalizePayloadString(patch['role']),
              highlights,
            };
          })
          .filter(
            (
              entry
            ): entry is {
              experienceKey?: string | null;
              experienceId: string | null;
              experienceTitle: string | null;
              company?: string | null;
              role?: string | null;
              highlights: string[];
            } => entry !== null
          )
      : [],
    experienceHighlights: normalizePayloadStringArray(record['experienceHighlights']),
    preferencesMatch: normalizePayloadStringArray(record['preferencesMatch']),
    professionalSummary: normalizePayloadString(record['professionalSummary']),
    selectedTechnicalEnvironment: normalizePayloadStringArray(
      record['selectedTechnicalEnvironment']
    ),
    skills: normalizePayloadStringArray(record['skills']),
    sourceCvRecordId: normalizePayloadString(record['sourceCvRecordId']),
    sourceCvTitle: normalizePayloadString(record['sourceCvTitle']),
    tailoringPatch:
      tailoringPatch !== null
        ? {
            professionalSummary: normalizePayloadString(tailoringPatch['professionalSummary']),
            coreStrengths: normalizePayloadStringArray(tailoringPatch['coreStrengths']),
            selectedTechnicalEnvironment: normalizePayloadStringArray(
              tailoringPatch['selectedTechnicalEnvironment']
            ),
            experienceHighlightPatches: Array.isArray(
              tailoringPatch['experienceHighlightPatches']
            )
              ? tailoringPatch['experienceHighlightPatches']
                  .map((entry: unknown) => {
                    const patch = readRecord(entry);
                    if (patch === null) return null;
                    const highlights = normalizePayloadStringArray(patch['highlights']);
                    if (highlights.length === 0) return null;
                    return {
                      experienceKey: normalizePayloadString(patch['experienceKey']),
                      experienceId: normalizePayloadString(patch['experienceId']),
                      experienceTitle: normalizePayloadString(patch['experienceTitle']),
                      company: normalizePayloadString(patch['company']),
                      role: normalizePayloadString(patch['role']),
                      highlights,
                    };
                  })
                  .filter(
                    (
                      entry
                    ): entry is {
                      experienceKey?: string | null;
                      experienceId: string | null;
                      experienceTitle: string | null;
                      company?: string | null;
                      role?: string | null;
                      highlights: string[];
                    } => entry !== null
                  )
              : [],
          }
        : null,
    tailoringScope:
      {
        allowedSections,
        lockedFieldsPreserved:
          tailoringScope !== null && typeof tailoringScope['lockedFieldsPreserved'] === 'boolean'
            ? tailoringScope['lockedFieldsPreserved']
            : true,
      },
    title: normalizePayloadString(record['title']),
  };
};

const normalizeCoverLetterPayload = (
  value: unknown
): FilemakerJobApplication['coverLetter'] => {
  const payload = readRecord(value);
  const record = readRecord(payload?.['coverLetter']) ?? payload;
  if (record === null) return null;
  return {
    bodyMarkdown: normalizePayloadString(record['bodyMarkdown']),
    subject: normalizePayloadString(record['subject']),
  };
};

const normalizeApplicationEmailPayload = (
  value: unknown
): FilemakerJobApplication['applicationEmail'] => {
  const payload = readRecord(value);
  const record = readRecord(payload?.['applicationEmail']) ?? payload;
  if (record === null) return null;
  return {
    bodyMarkdown: normalizePayloadString(record['bodyMarkdown']),
    bodyText: normalizePayloadString(record['bodyText']),
    subject: normalizePayloadString(record['subject']),
  };
};

const createArtifactApplicationFromPersistedVersion = (
  application: FilemakerJobApplication,
  version: FilemakerJobApplicationArtifactVersion
): FilemakerJobApplication => {
  const normalizedCreatedAt = version.createdAt ?? application.createdAt;
  const storageApplicationId = application.storageApplicationId ?? application.id;
  const baseVersionFields: FilemakerJobApplication = {
    ...application,
    id: version.id,
    applicationEmail: null,
    applicationNotes: version.applicationNotes,
    artifactKind: version.kind,
    artifactVersionCreatedAt: version.createdAt,
    artifactVersionId: version.id,
    artifactVersionNumber: version.version,
    confidence: version.confidence,
    coverLetter: null,
    createdAt: normalizedCreatedAt,
    missingInformation: version.missingInformation,
    storageApplicationId,
    tailoredCv: null,
    tailoredCvId: null,
    updatedAt: normalizedCreatedAt,
  };
  if (version.kind === 'tailored_cv') {
    return {
      ...baseVersionFields,
      tailoredCv: normalizeTailoredCvPayload(version.payload),
      tailoredCvId:
        version.linkedRecordId ??
        normalizePayloadString(readRecord(version.payload)?.['tailoredCvId']),
    };
  }
  if (version.kind === 'cover_letter') {
    return {
      ...baseVersionFields,
      coverLetter: normalizeCoverLetterPayload(version.payload),
    };
  }
  return {
    ...baseVersionFields,
    applicationEmail: normalizeApplicationEmailPayload(version.payload),
  };
};

const expandApplicationForVersionGrouping = (
  application: FilemakerJobApplication
): FilemakerJobApplication[] => {
  const persistedVersions = application.artifactVersions ?? application.persistedArtifactVersions;
  if (persistedVersions === null || persistedVersions === undefined) return [application];
  const versionApplications = [
    ...persistedVersions.tailoredCv.map(
      (version: FilemakerJobApplicationArtifactVersion): FilemakerJobApplication =>
        createArtifactApplicationFromPersistedVersion(application, version)
    ),
    ...persistedVersions.coverLetter.map(
      (version: FilemakerJobApplicationArtifactVersion): FilemakerJobApplication =>
        createArtifactApplicationFromPersistedVersion(application, version)
    ),
    ...persistedVersions.applicationEmail.map(
      (version: FilemakerJobApplicationArtifactVersion): FilemakerJobApplication =>
        createArtifactApplicationFromPersistedVersion(application, version)
    ),
  ];
  if (versionApplications.length === 0) return [application];
  return [
    {
      ...application,
      applicationEmail: null,
      coverLetter: null,
      storageApplicationId: application.storageApplicationId ?? application.id,
      tailoredCv: null,
      tailoredCvId: null,
    },
    ...versionApplications,
  ];
};

const mergeUniqueStringArrays = (...arrays: string[][]): string[] => {
  const values = new Set<string>();
  arrays.forEach((array: string[]): void => {
    array.forEach((value: string): void => {
      const normalized = value.trim();
      if (normalized.length > 0) values.add(normalized);
    });
  });
  return Array.from(values);
};

const isNonEmptyString = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim().length > 0;

const buildPreparedApplicationKey = (application: FilemakerJobApplication): string => {
  const canonicalApplicationKey = application.canonicalApplicationKey?.trim() ?? '';
  if (canonicalApplicationKey.length > 0) return canonicalApplicationKey;
  const personId = application.personId.trim();
  const organizationId = application.organizationId.trim();
  const jobListingId = application.jobListingId.trim();
  if (personId.length === 0 || organizationId.length === 0 || jobListingId.length === 0) {
    return `legacy:${application.id}`;
  }
  const integrationSlug = normalizeTrimmedString(application.integrationSlug);
  const integrationId = normalizeTrimmedString(application.integrationId);
  const connectionId = normalizeTrimmedString(application.connectionId);
  const integrationKey = integrationSlug ?? integrationId ?? connectionId ?? 'default';
  return [personId, organizationId, jobListingId, integrationKey].join('::');
};

const createPreparedJobApplication = (
  canonicalApplicationKey: string,
  applications: FilemakerJobApplication[]
): PreparedJobApplication | null => {
  const sortedApplications = applications.slice().sort(compareApplicationsByFreshness);
  const storageApplication =
    applications.find((application: FilemakerJobApplication): boolean => {
      const persistedVersions = application.artifactVersions ?? application.persistedArtifactVersions;
      return persistedVersions !== null && persistedVersions !== undefined;
    }) ?? null;
  const baseApplication = storageApplication ?? sortedApplications[0] ?? null;
  if (baseApplication === null) return null;
  const artifactVersions: PreparedApplicationArtifactVersions = {
    applicationEmail: sortedApplications.filter(hasApplicationEmailVersionArtifact),
    coverLetter: sortedApplications.filter(hasCoverLetterArtifact),
    tailoredCv: sortedApplications.filter(hasTailoredCvArtifact),
  };
  const latestCv =
    artifactVersions.tailoredCv.find(
      (application: FilemakerJobApplication): boolean =>
        application.id === baseApplication.activeArtifacts?.tailoredCvVersionId
    ) ??
    artifactVersions.tailoredCv[0] ??
    null;
  const latestCoverLetter =
    artifactVersions.coverLetter.find(
      (application: FilemakerJobApplication): boolean =>
        application.id === baseApplication.activeArtifacts?.coverLetterVersionId
    ) ??
    artifactVersions.coverLetter[0] ??
    null;
  const latestApplicationEmail =
    artifactVersions.applicationEmail.find(
      (application: FilemakerJobApplication): boolean =>
        application.id === baseApplication.activeArtifacts?.applicationEmailVersionId
    ) ??
    artifactVersions.applicationEmail[0] ??
    null;
  const earliestApplication = sortedApplications[sortedApplications.length - 1] ?? baseApplication;

  const storageApplicationIds = Array.from(
    new Set(
      sortedApplications.map((application: FilemakerJobApplication): string =>
        normalizeTrimmedString(application.storageApplicationId) ?? application.id
      )
    )
  );

  return {
    ...baseApplication,
    id: `prepared:${canonicalApplicationKey}`,
    applicationIds: storageApplicationIds,
    baseApplicationId: baseApplication.id,
    artifactVersions,
    canonicalApplicationKey,
    applicationEmail: latestApplicationEmail?.applicationEmail ?? null,
    applicationNotes: mergeUniqueStringArrays(
      ...sortedApplications.map((application: FilemakerJobApplication): string[] => application.applicationNotes)
    ),
    confidence:
      latestCv?.confidence ??
      latestCoverLetter?.confidence ??
      latestApplicationEmail?.confidence ??
      baseApplication.confidence,
    coverLetter: latestCoverLetter?.coverLetter ?? null,
    createdAt: earliestApplication.createdAt,
    missingInformation: mergeUniqueStringArrays(
      ...sortedApplications.map((application: FilemakerJobApplication): string[] => application.missingInformation)
    ),
    tailoredCv: latestCv?.tailoredCv ?? null,
    tailoredCvId: latestCv?.tailoredCvId ?? null,
    updatedAt: sortedApplications[0]?.updatedAt ?? baseApplication.updatedAt,
  };
};

const formatNullableText = (value: string | null | undefined, fallback: string): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : fallback;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const composePlainDocumentPreviewHtml = (input: {
  body: string;
  meta: string;
  title: string;
}): string => {
  const bodyLines = input.body
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0)
    .map((line: string): string => `<p>${escapeHtml(line)}</p>`)
    .join('');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      @page{size:A4;margin:22mm;}
      body{color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;}
      h1{font-size:20px;line-height:1.25;margin:0 0 8px;}
      .meta{border-bottom:1px solid #d1d5db;color:#4b5563;margin-bottom:22px;padding-bottom:12px;}
      p{margin:0 0 9px;}
    </style>
  </head>
  <body>
    <h1>${escapeHtml(input.title)}</h1>
    <div class="meta">${escapeHtml(input.meta)}</div>
    <main>${bodyLines.length > 0 ? bodyLines : '<p>No content was generated.</p>'}</main>
  </body>
</html>`;
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

const composeApplicationEmailText = (application: FilemakerJobApplication): string => {
  const subject = formatNullableText(application.applicationEmail?.subject, 'Application email');
  const body = formatNullableText(
    application.applicationEmail?.bodyText ?? application.applicationEmail?.bodyMarkdown,
    'No application email content was generated.'
  );
  return [subject, body].filter((value: string): boolean => value.length > 0).join('\n\n');
};

const composeApplicationMeta = (application: FilemakerJobApplication): string =>
  [formatApplicationPerson(application), application.jobTitle, application.organizationName]
    .map((value: string | null | undefined): string => value?.trim() ?? '')
    .filter((value: string): boolean => value.length > 0)
    .join(' · ');

const isActiveApplicationApplyRun = (run: FilemakerJobApplicationApplyRun | null): boolean =>
  run?.status === 'queued' || run?.status === 'running';

const formatStatusToken = (status: string): string =>
  status
    .split('_')
    .map((part: string): string => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const formatApplicationApplyRunStatus = (
  status: FilemakerJobApplicationApplyRun['status']
): string => formatStatusToken(status);

const formatApplicationApplyRunStepStatus = (
  status: FilemakerJobApplicationApplyRunStep['status']
): string => (status === 'ok' ? 'Done' : formatStatusToken(status));

const resolveApplicationApplyButtonLabel = (
  run: FilemakerJobApplicationApplyRun | null,
  isApplying: boolean
): string => {
  if (isApplying) return 'Starting...';
  if (run?.status === 'auth_required') return 'Auth required';
  if (run?.status === 'awaiting_review') return 'Awaiting review';
  if (run?.status === 'submitted') return 'Submitted';
  if (run?.status === 'failed') return 'Retry apply';
  return isActiveApplicationApplyRun(run) ? 'Applying...' : 'Apply';
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
): Map<string, PreparedJobApplication[]> => {
  const canonicalGroups = new Map<string, FilemakerJobApplication[]>();
  applications.flatMap(expandApplicationForVersionGrouping).forEach((application: FilemakerJobApplication): void => {
    const canonicalKey = buildPreparedApplicationKey(application);
    const group = canonicalGroups.get(canonicalKey) ?? [];
    group.push(application);
    canonicalGroups.set(canonicalKey, group);
  });

  const preparedApplications = Array.from(canonicalGroups.entries())
    .map(([canonicalKey, groupApplications]): PreparedJobApplication | null =>
      createPreparedJobApplication(canonicalKey, groupApplications)
    )
    .filter((application): application is PreparedJobApplication => application !== null)
    .sort(compareApplicationsByFreshness);

  const groups = new Map<string, PreparedJobApplication[]>();
  preparedApplications.forEach((application: PreparedJobApplication): void => {
    const jobListingId = application.jobListingId.trim();
    if (jobListingId.length === 0) return;
    const group = groups.get(jobListingId) ?? [];
    group.push(application);
    groups.set(jobListingId, group);
  });
  return groups;
};

const formatJobApplicationArtifactKind = (
  artifactKind: JobApplicationRunEntry['artifactKind']
): string =>
  artifactKind
    .split('_')
    .map((part: string): string => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const resolveJobApplicationArtifactLabel = (entry: JobApplicationRunEntry): string => {
  const artifactLabel = entry.artifactLabel?.trim() ?? '';
  return artifactLabel.length > 0
    ? artifactLabel
    : formatJobApplicationArtifactKind(entry.artifactKind);
};
const JOB_APPLICATION_ARTIFACT_SORT_ORDER: Record<JobApplicationRunEntry['artifactKind'], number> = {
  tailored_cv: 0,
  application_email: 1,
  cover_letter: 2,
};

const JOB_APPLICATION_RUN_STATUS_LABELS: Record<JobApplicationRunEntry['status'], string> = {
  completed: 'completed',
  error: 'failed',
  queued: 'queued',
  running: 'running',
  starting: 'starting',
};

const JOB_APPLICATION_RUN_ENTRIES_STORAGE_KEY = 'filemaker_job_application_run_entries_v1';
const JOB_APPLICATION_RUN_ENTRY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const JOB_APPLICATION_RUN_ENTRY_LIMIT = 100;
const JOB_APPLICATION_RUN_ARTIFACTS = new Set<JobApplicationRunEntry['artifactKind']>([
  'application_email',
  'cover_letter',
  'tailored_cv',
]);
const JOB_APPLICATION_RUN_STATUSES = new Set<JobApplicationRunEntry['status']>([
  'completed',
  'error',
  'queued',
  'running',
  'starting',
]);
const JOB_APPLICATION_ACTIVE_RUN_STATUSES = new Set<JobApplicationRunEntry['status']>([
  'queued',
  'running',
  'starting',
]);
const JOB_APPLICATION_RUN_POLL_INTERVAL_MS = 4_000;

const normalizePolledAiPathRunStatus = (
  status: unknown
): JobApplicationRunEntry['status'] | null => {
  if (typeof status !== 'string') return null;
  const normalized = status.trim().toLowerCase();
  if (['completed', 'success', 'succeeded'].includes(normalized)) return 'completed';
  if (['canceled', 'cancelled', 'error', 'failed', 'failure'].includes(normalized)) return 'error';
  if (['active', 'in_progress', 'processing', 'running', 'started'].includes(normalized)) {
    return 'running';
  }
  if (['created', 'pending', 'queued', 'scheduled'].includes(normalized)) return 'queued';
  return null;
};

const readPolledAiPathRunError = (run: Record<string, unknown>): string | null => {
  const directError = run.error ?? run.errorMessage ?? run.failureReason;
  if (typeof directError === 'string' && directError.trim().length > 0) return directError.trim();
  const meta = readRecord(run.meta);
  const metaError = meta?.error ?? meta?.errorMessage ?? meta?.failureReason;
  return typeof metaError === 'string' && metaError.trim().length > 0 ? metaError.trim() : null;
};

const resolvePolledJobApplicationRunEntry = (
  entry: JobApplicationRunEntry,
  run: Record<string, unknown>
): JobApplicationRunEntry | null => {
  const status = normalizePolledAiPathRunStatus(run.status);
  if (status === null) return null;
  const runUpdatedAt = typeof run.updatedAt === 'string' ? run.updatedAt : null;
  return {
    ...entry,
    error:
      status === 'error' ? readPolledAiPathRunError(run) ?? entry.error ?? 'AI Path run failed.' : null,
    status,
    updatedAt: runUpdatedAt ?? (status !== entry.status ? new Date().toISOString() : entry.updatedAt),
  };
};

const isStoredJobApplicationRunEntry = (value: unknown): value is JobApplicationRunEntry => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Partial<JobApplicationRunEntry>;
  const context = entry.context;
  return (
    typeof entry.id === 'string' &&
    JOB_APPLICATION_RUN_ARTIFACTS.has(entry.artifactKind as JobApplicationRunEntry['artifactKind']) &&
    JOB_APPLICATION_RUN_STATUSES.has(entry.status as JobApplicationRunEntry['status']) &&
    (entry.artifactLabel === undefined ||
      entry.artifactLabel === null ||
      typeof entry.artifactLabel === 'string') &&
    (entry.runId === null || typeof entry.runId === 'string') &&
    (entry.error === null || typeof entry.error === 'string') &&
    typeof entry.updatedAt === 'string' &&
    context !== undefined &&
    typeof context.jobListingId === 'string' &&
    typeof context.jobTitle === 'string' &&
    typeof context.organizationId === 'string' &&
    typeof context.personId === 'string'
  );
};

const readStoredJobApplicationRunEntries = (): JobApplicationRunEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(JOB_APPLICATION_RUN_ENTRIES_STORAGE_KEY);
    if (raw === null || raw.trim().length === 0) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed
      .filter(isStoredJobApplicationRunEntry)
      .filter((entry: JobApplicationRunEntry): boolean => {
        const updatedAt = Date.parse(entry.updatedAt);
        return !Number.isFinite(updatedAt) || now - updatedAt <= JOB_APPLICATION_RUN_ENTRY_MAX_AGE_MS;
      })
      .slice(0, JOB_APPLICATION_RUN_ENTRY_LIMIT);
  } catch (error) {
    logClientError(error);
    return [];
  }
};

function JobApplicationRunStatusBadges({
  entries,
}: {
  entries: JobApplicationRunEntry[];
}): React.JSX.Element | null {
  if (entries.length === 0) return null;
  const sortedEntries = entries
    .slice()
    .sort(
      (left: JobApplicationRunEntry, right: JobApplicationRunEntry): number =>
        JOB_APPLICATION_ARTIFACT_SORT_ORDER[left.artifactKind] -
        JOB_APPLICATION_ARTIFACT_SORT_ORDER[right.artifactKind]
    );
  return (
    <div className='flex flex-wrap items-center gap-1'>
      {sortedEntries.map((entry: JobApplicationRunEntry) => {
        const label = resolveJobApplicationArtifactLabel(entry);
        const status = JOB_APPLICATION_RUN_STATUS_LABELS[entry.status];
        const runId = entry.runId?.trim() ?? '';
        const runStatusBadgeVariant: Record<
          JobApplicationRunEntry['status'],
          'success' | 'error' | 'outline' | 'pending' | 'processing'
        > = {
          completed: 'success',
          error: 'error',
          running: 'processing',
          completed_with_errors: 'error',
          queued: 'outline',
          failed: 'error',
          canceled: 'outline',
          pending: 'pending',
          auth_required: 'outline',
          awaiting_review: 'outline',
          submitted: 'success',
        };
        const title = [label, status, runId.length > 0 ? `Run ${runId}` : null, entry.error]
          .filter((value: string | null): value is string => value !== null && value.length > 0)
          .join(' · ');
        const variant = runStatusBadgeVariant[entry.status];
        return (
          <Badge key={entry.id} variant={variant} title={title}>
            {label} {status}
          </Badge>
        );
      })}
    </div>
  );
}

function JobApplicationsInline({
  applications,
  jobListing,
  isCollapsingLegacy,
  onCollapseLegacy,
  onDelete,
  onOpenApplication,
  onRemoveLogEntry,
}: {
  applications: PreparedJobApplication[];
  isCollapsingLegacy: boolean;
  jobListing: FilemakerJobListing;
  onCollapseLegacy: (jobListingId: string) => void;
  onDelete: (applicationId: string) => void;
  onOpenApplication: (applicationId: string) => void;
  onRemoveLogEntry: (applicationId: string, logEntryId: string) => void;
}): React.JSX.Element | null {
  if (applications.length === 0) return null;
  const hasCollapsibleLegacyApplications = applications.some(
    (application: PreparedJobApplication): boolean => application.applicationIds.length > 1
  );
  return (
    <div className='rounded-md border border-border/40 bg-background/20 p-3'>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2 text-xs font-semibold text-gray-200'>
          <FileText className='h-3.5 w-3.5 text-emerald-300' aria-hidden='true' />
          Prepared applications
        </div>
        {hasCollapsibleLegacyApplications ? (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 gap-1.5 text-[11px]'
            disabled={isCollapsingLegacy}
            onClick={(): void => onCollapseLegacy(jobListing.id)}
            title='Collapse legacy separate generated rows into one application container'
          >
            {isCollapsingLegacy ? (
              <Loader2 className='h-3 w-3 animate-spin' aria-hidden='true' />
            ) : null}
            Collapse legacy
          </Button>
        ) : null}
      </div>
      <div className='space-y-2'>
        {applications.slice(0, 3).map((application: PreparedJobApplication) => {
          const cvHref = cvApplicationHref(application);
          const jobHref = getApplicationJobHref(application, jobListing);
          const cvVersionCount = application.artifactVersions.tailoredCv.length;
          const coverLetterVersionCount = application.artifactVersions.coverLetter.length;
          const emailVersionCount = application.artifactVersions.applicationEmail.length;
          const hasMatchAnalysis = application.matchAnalysis !== null;
          const matchAnalysisStatus = application.matchAnalysisStatus ?? null;
          const latestMatchScore = application.matchAnalysis?.score ?? null;
  const previousMatchScore =
    (application.matchAnalysisHistory?.length ?? 0) > 1
      ? application.matchAnalysisHistory?.[application.matchAnalysisHistory.length - 2]?.payload?.score ?? null
      : null;
          const matchScoreDelta =
            latestMatchScore !== null && previousMatchScore !== null
              ? latestMatchScore - previousMatchScore
              : null;
          const matchDecision = application.matchAnalysis?.recommendedDecision ?? null;
          const matchDecisionReason = application.matchAnalysis?.recommendedDecisionReason ?? null;
          const matchDecisionTitle = (() => {
            if (matchDecisionReason !== null && matchDecisionReason.trim().length > 0) {
              return `AI recommendation: ${matchDecisionReason}`;
            }
            if (matchDecision !== null) return 'AI recommendation';
            return undefined;
          })();
          const matchAnalysisUpdatedAtMs = Date.parse(application.matchAnalysisUpdatedAt ?? '');
          const applicationUpdatedAtMs = Date.parse(application.updatedAt);
          const latestHistoryApplicationSnapshotMs = Date.parse(
            application.matchAnalysisHistory?.[application.matchAnalysisHistory.length - 1]
              ?.applicationUpdatedAtSnapshot ?? ''
          );
          const matchAnalysisBaselineMs = Number.isFinite(latestHistoryApplicationSnapshotMs)
            ? latestHistoryApplicationSnapshotMs
            : matchAnalysisUpdatedAtMs;
          const isMatchAnalysisStale =
            hasMatchAnalysis &&
            Number.isFinite(matchAnalysisBaselineMs) &&
            Number.isFinite(applicationUpdatedAtMs) &&
            applicationUpdatedAtMs > matchAnalysisBaselineMs + 60_000;
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
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-7 w-7 p-0 text-gray-500 hover:text-red-400'
                    title='Delete application record'
                    aria-label='Delete application record'
                    onClick={(): void => {
                      if (window.confirm('Delete this application record? This cannot be undone.')) {
                        onDelete(application.id);
                      }
                    }}
                  >
                    <Trash2 className='h-3.5 w-3.5' aria-hidden='true' />
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
              <div className='mt-2 flex flex-wrap gap-1'>
                {cvVersionCount > 0 ? (
                  <Badge variant='outline'>CV v{cvVersionCount}</Badge>
                ) : null}
                {coverLetterVersionCount > 0 ? (
                  <Badge variant='outline'>Cover letter v{coverLetterVersionCount}</Badge>
                ) : null}
                {emailVersionCount > 0 ? (
                  <Badge variant='outline'>Email v{emailVersionCount}</Badge>
                ) : null}
                {application.status === 'applied' ? (
                  <Badge variant='success'>Applied</Badge>
                ) : null}
                {hasMatchAnalysis ? (
                  <Badge variant='success'>
                    Match {latestMatchScore ?? 'analysis'}
                    {matchScoreDelta !== null
                      ? ` ${matchScoreDelta >= 0 ? '+' : ''}${matchScoreDelta}`
                      : ''}
                  </Badge>
                ) : null}
                {matchAnalysisStatus !== null && matchAnalysisStatus !== 'completed' ? (
                  <Badge variant='outline'>Analysis {matchAnalysisStatus}</Badge>
                ) : null}
                {matchDecision !== null ? (
                  <Badge
                    variant={matchDecision === 'Apply now' ? 'success' : 'outline'}
                    title={matchDecisionTitle}
                  >
                    {matchDecision}
                  </Badge>
                ) : null}
                {isMatchAnalysisStale ? (
                  <Badge
                    variant='outline'
                    title='The application changed after the last match analysis. Rerun Analyze Match.'
                  >
                    Analysis stale
                  </Badge>
                ) : null}
              </div>
              {(application.applicationLog?.length ?? 0) > 0 ? (
                <div className='mt-1.5 space-y-0.5'>
                  {(application.applicationLog as FilemakerJobApplicationLogEntry[]).map(
                    (entry: FilemakerJobApplicationLogEntry, i: number) => (
                      <div
                        key={entry.id.length > 0 ? entry.id : String(i)}
                        className='flex items-center gap-1.5 text-[11px] text-gray-500'
                      >
                        <span className='font-medium text-emerald-400'>
                          {entry.method === 'manual' ? 'Manual' : 'Apply script'}
                        </span>
                        {' · '}
                        {formatTimestamp(entry.appliedAt)}
                        {(() => {
                          if (isNonEmptyString(entry.personName)) return ` · ${entry.personName}`;
                          if (isNonEmptyString(entry.personId)) return ` · ${entry.personId}`;
                          return '';
                        })()}
                        <button
                          type='button'
                          className='ml-1 text-gray-700 hover:text-red-400'
                          title='Remove this log entry'
                          onClick={(): void => onRemoveLogEntry(application.baseApplicationId, entry.id)}
                          aria-label='Remove log entry'
                        >
                          <Trash2 className='h-2.5 w-2.5' aria-hidden='true' />
                        </button>
                      </div>
                    )
                  )}
                </div>
              ) : null}
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

const formatPreparedApplicationVersionLabel = (
  application: FilemakerJobApplication,
  index: number,
  total: number
): string => {
  const versionNumber = application.artifactVersionNumber ?? total - index;
  const source = application.source?.replace(/^ai-path-job-application-/u, '').replace(/-/gu, ' ');
  return [
    index === 0 ? `Latest v${versionNumber}` : `v${versionNumber}`,
    formatTimestamp(application.createdAt),
    source,
  ]
    .filter((value: string | null | undefined): value is string => (value ?? '').trim().length > 0)
    .join(' · ');
};

function PreparedArtifactVersionPicker({
  label,
  onValueChange,
  value,
  versions,
}: {
  label: string;
  onValueChange: (value: string) => void;
  value: string;
  versions: FilemakerJobApplication[];
}): React.JSX.Element | null {
  if (versions.length === 0) return null;
  if (versions.length === 1) {
    return (
      <div className='rounded-md border border-border/50 bg-background/30 px-3 py-2'>
        <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500'>
          {label}
        </div>
        <Badge variant='outline'>Latest v1</Badge>
      </div>
    );
  }
  return (
    <FormField label={label}>
      <SelectSimple
        value={value}
        onValueChange={onValueChange}
        options={versions.map((version: FilemakerJobApplication, index: number) => ({
          value: version.id,
          label: formatPreparedApplicationVersionLabel(version, index, versions.length),
        }))}
        ariaLabel={label}
      />
    </FormField>
  );
}

function PreparedArtifactVersionHistoryGroup({
  activeVersionId,
  label,
  onSelect,
  versions,
}: {
  activeVersionId: string;
  label: string;
  onSelect: (value: string) => void;
  versions: FilemakerJobApplication[];
}): React.JSX.Element | null {
  if (versions.length === 0) return null;
  return (
    <div className='space-y-1'>
      <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500'>
        {label}
      </div>
      <div className='space-y-1'>
        {versions.map((version: FilemakerJobApplication, index: number): React.JSX.Element => {
          const isActive = version.id === activeVersionId;
          return (
            <button
              key={version.id}
              type='button'
              className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition ${
                isActive
                  ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-100'
                  : 'border-border/50 bg-background/30 text-gray-300 hover:border-border hover:bg-white/5'
              }`}
              onClick={(): void => onSelect(version.id)}
            >
              <span className='min-w-0 truncate'>
                {formatPreparedApplicationVersionLabel(version, index, versions.length)}
              </span>
              {isActive ? <Badge variant='success'>Active</Badge> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PreparedApplicationVersionHistory({
  applicationEmailVersions,
  coverLetterVersions,
  cvVersions,
  onApplicationEmailSelect,
  onCoverLetterSelect,
  onCvSelect,
  selectedApplicationEmailVersionId,
  selectedCoverLetterVersionId,
  selectedCvVersionId,
}: {
  applicationEmailVersions: FilemakerJobApplication[];
  coverLetterVersions: FilemakerJobApplication[];
  cvVersions: FilemakerJobApplication[];
  onApplicationEmailSelect: (value: string) => void;
  onCoverLetterSelect: (value: string) => void;
  onCvSelect: (value: string) => void;
  selectedApplicationEmailVersionId: string;
  selectedCoverLetterVersionId: string;
  selectedCvVersionId: string;
}): React.JSX.Element | null {
  if (
    applicationEmailVersions.length === 0 &&
    coverLetterVersions.length === 0 &&
    cvVersions.length === 0
  ) {
    return null;
  }
  return (
    <section className='space-y-3'>
      <h4 className='text-sm font-semibold text-white'>Version history</h4>
      <PreparedArtifactVersionHistoryGroup
        activeVersionId={selectedCvVersionId}
        label='CV'
        versions={cvVersions}
        onSelect={onCvSelect}
      />
      <PreparedArtifactVersionHistoryGroup
        activeVersionId={selectedCoverLetterVersionId}
        label='Cover letter'
        versions={coverLetterVersions}
        onSelect={onCoverLetterSelect}
      />
      <PreparedArtifactVersionHistoryGroup
        activeVersionId={selectedApplicationEmailVersionId}
        label='Email'
        versions={applicationEmailVersions}
        onSelect={onApplicationEmailSelect}
      />
    </section>
  );
}

const createVisiblePreparedApplication = ({
  application,
  applicationEmailVersion,
  coverLetterVersion,
  tailoredCvVersion,
}: {
  application: PreparedJobApplication;
  applicationEmailVersion: FilemakerJobApplication | null;
  coverLetterVersion: FilemakerJobApplication | null;
  tailoredCvVersion: FilemakerJobApplication | null;
}): PreparedJobApplication => {
  const applicationNotes = mergeUniqueStringArrays(
    tailoredCvVersion?.applicationNotes ?? [],
    coverLetterVersion?.applicationNotes ?? [],
    applicationEmailVersion?.applicationNotes ?? []
  );
  const missingInformation = mergeUniqueStringArrays(
    tailoredCvVersion?.missingInformation ?? [],
    coverLetterVersion?.missingInformation ?? [],
    applicationEmailVersion?.missingInformation ?? []
  );
  return {
    ...application,
    applicationEmail: applicationEmailVersion?.applicationEmail ?? application.applicationEmail,
    applicationNotes: applicationNotes.length > 0 ? applicationNotes : application.applicationNotes,
    confidence:
      tailoredCvVersion?.confidence ??
      coverLetterVersion?.confidence ??
      applicationEmailVersion?.confidence ??
      application.confidence,
    coverLetter: coverLetterVersion?.coverLetter ?? application.coverLetter,
    missingInformation:
      missingInformation.length > 0 ? missingInformation : application.missingInformation,
    tailoredCv: tailoredCvVersion?.tailoredCv ?? application.tailoredCv,
    tailoredCvId: tailoredCvVersion?.tailoredCvId ?? application.tailoredCvId,
  };
};

type ApplicationMatchAnalysisContextState = {
  cvs: FilemakerCv[];
  error: string | null;
  isLoading: boolean;
  personDetail: Record<string, unknown> | null;
};

const createEmptyApplicationMatchAnalysisContextState = (): ApplicationMatchAnalysisContextState => ({
  cvs: [],
  error: null,
  isLoading: false,
  personDetail: null,
});

const truncateApplicationMatchAnalysisValue = (
  value: unknown,
  maxLength = 18000,
  depth = 0
): unknown => {
  if (typeof value === 'string') {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}\n\n[truncated for match analysis]`;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((entry: unknown): unknown =>
        truncateApplicationMatchAnalysisValue(entry, Math.max(1200, Math.floor(maxLength / 4)), depth + 1)
      );
  }
  if (value !== null && typeof value === 'object' && depth < 4) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 80)
        .map(([key, entry]: [string, unknown]): [string, unknown] => [
          key,
          truncateApplicationMatchAnalysisValue(entry, Math.max(1200, Math.floor(maxLength / 4)), depth + 1),
        ])
    );
  }
  return value;
};

const compactApplicationCvForMatchAnalysis = (cv: FilemakerCv): Record<string, unknown> => {
  const record = cv as unknown as Record<string, unknown>;
  return {
    id: record['id'] ?? null,
    title: record['title'] ?? null,
    status: record['status'] ?? null,
    fullName: record['fullName'] ?? null,
    professionalSummary: record['professionalSummary'] ?? null,
    coreStrengths: record['coreStrengths'] ?? null,
    selectedTechnicalEnvironment: record['selectedTechnicalEnvironment'] ?? null,
    experience:
      record['experience'] ??
      record['jobExperience'] ??
      record['professionalExperience'] ??
      record['experienceTimeline'] ??
      null,
    education: record['education'] ?? record['educationItems'] ?? null,
    languageSkills: record['languageSkills'] ?? null,
    links: record['links'] ?? null,
    bodyText: truncateApplicationMatchAnalysisValue(record['bodyText']),
    bodyMarkdown: truncateApplicationMatchAnalysisValue(record['bodyMarkdown']),
    bodyBlocks: truncateApplicationMatchAnalysisValue(record['bodyBlocks'] ?? null),
    updatedAt: record['updatedAt'] ?? null,
  };
};

const resolvePersonRecordFromPayload = (
  payload: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (payload === null) return null;
  const person = payload['person'];
  return person !== null && typeof person === 'object' && !Array.isArray(person)
    ? (person as Record<string, unknown>)
    : payload;
};

const buildApplicationMatchAnalysisOutputContract = (): Record<string, unknown> => ({
  matchAnalysis: {
    score: 'number from 0 to 100',
    scoreLabel: 'short fit label',
    summary: 'short practical hiring fit summary',
    changeSincePrevious: 'short explanation of what changed compared with previous saved analysis',
    recommendedDecision: 'Apply now | Prepare before applying | Deprioritise or rebuild evidence',
    recommendedDecisionReason: 'short reason for the recommended decision',
    strongMatches: ['CV/job evidence that supports this application'],
    gaps: ['missing or weak areas against the posting'],
    attentionAreas: [
      {
        area: 'skill, experience, evidence, portfolio, language, or domain area',
        whyItMatters: 'why this matters for this job posting',
        recommendedAction: 'specific action before applying or interviewing',
        evidence: 'job or CV evidence behind the recommendation',
      },
    ],
    cvEvidence: ['specific evidence from the selected person profile and CV records'],
    jobEvidence: ['specific evidence from the job posting'],
    riskFlags: ['risks, mismatches, or unclear points'],
    interviewTalkingPoints: ['points to emphasize in interview'],
    learningPlan: ['focused preparation actions'],
  },
});

function ApplicationPackageModal({
  application,
  isMutating,
  jobListing,
  onClose,
  onDelete,
  onActiveArtifactsChange,
  onRemoveLogEntry,
  onStatusChange,
  onAnalysisRunQueued,
}: {
  application: PreparedJobApplication | null;
  isMutating: boolean;
  jobListing: FilemakerJobListing | null;
  onClose: () => void;
  onDelete: (applicationId: string) => void;
  onActiveArtifactsChange: (
    applicationId: string,
    activeArtifacts: FilemakerJobApplicationActiveArtifacts
  ) => void;
  onRemoveLogEntry: (applicationId: string, logEntryId: string) => void;
  onStatusChange: (applicationId: string, status: FilemakerJobApplicationStatus) => void;
  onAnalysisRunQueued?: () => void;
}): React.JSX.Element {
  const { toast } = useToast();
  const [appliedStatusSyncRunId, setAppliedStatusSyncRunId] = useState<string | null>(null);
  const [applyRun, setApplyRun] = useState<FilemakerJobApplicationApplyRun | null>(null);
  const applyRunRequestSeqRef = useRef(0);
  const matchAnalysisRefreshTimeoutsRef = useRef<number[]>([]);
  const toastRef = useRef(toast);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCoverLetterPdf, setIsExportingCoverLetterPdf] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isPreviewingCvPdf, setIsPreviewingCvPdf] = useState(false);
  const applyBrowserMode = useJobApplicationApplyBrowserModeSetting(application !== null);
  const cvVersions = application?.artifactVersions.tailoredCv ?? [];
  const coverLetterVersions = application?.artifactVersions.coverLetter ?? [];
  const applicationEmailVersions = application?.artifactVersions.applicationEmail ?? [];
  const latestCvVersionId = cvVersions[0]?.id ?? '';
  const latestCoverLetterVersionId = coverLetterVersions[0]?.id ?? '';
  const latestApplicationEmailVersionId = applicationEmailVersions[0]?.id ?? '';
  const resolveInitialVersionId = (
    versions: FilemakerJobApplication[],
    preferredVersionId: string | null | undefined,
    fallbackVersionId: string
  ): string =>
    preferredVersionId !== null &&
    preferredVersionId !== undefined &&
    versions.some((version: FilemakerJobApplication): boolean => version.id === preferredVersionId)
      ? preferredVersionId
      : fallbackVersionId;
  const [selectedCvVersionId, setSelectedCvVersionId] = useState('');
  const [selectedCoverLetterVersionId, setSelectedCoverLetterVersionId] = useState('');
  const [selectedApplicationEmailVersionId, setSelectedApplicationEmailVersionId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<FilemakerJobApplicationStatus>('draft');
  const [pendingMatchAnalysisRunId, setPendingMatchAnalysisRunId] = useState<string | null>(null);
  const [matchAnalysisContext, setMatchAnalysisContext] =
    useState<ApplicationMatchAnalysisContextState>(() =>
      createEmptyApplicationMatchAnalysisContextState()
    );

  useEffect(() => {
    if (application === null) {
      setMatchAnalysisContext(createEmptyApplicationMatchAnalysisContextState());
      return undefined;
    }
    const personId = application.personId.trim();
    if (personId.length === 0) {
      setMatchAnalysisContext(createEmptyApplicationMatchAnalysisContextState());
      return undefined;
    }

    let isCancelled = false;
    const controller = new AbortController();
    setMatchAnalysisContext((current: ApplicationMatchAnalysisContextState) => ({
      ...current,
      error: null,
      isLoading: true,
    }));

    const loadMatchAnalysisContext = async (): Promise<void> => {
      try {
        const [personResponse, cvsResponse] = await Promise.all([
          fetch(`/api/filemaker/persons/${encodeURIComponent(personId)}`, {
            signal: controller.signal,
          }),
          fetch(`/api/filemaker/cvs?personId=${encodeURIComponent(personId)}`, {
            signal: controller.signal,
          }),
        ]);
        if (!personResponse.ok) {
          throw new Error(`Failed to load selected person profile (${personResponse.status}).`);
        }
        if (!cvsResponse.ok) {
          throw new Error(`Failed to load selected person CV records (${cvsResponse.status}).`);
        }
        const personPayload = (await personResponse.json()) as Record<string, unknown>;
        const cvsPayload = (await cvsResponse.json()) as { cvs?: FilemakerCv[] };
        if (isCancelled) return;
        setMatchAnalysisContext({
          cvs: Array.isArray(cvsPayload.cvs) ? cvsPayload.cvs : [],
          error: null,
          isLoading: false,
          personDetail: personPayload,
        });
      } catch (error: unknown) {
        if (isCancelled || controller.signal.aborted) return;
        logClientError(error);
        setMatchAnalysisContext({
          cvs: [],
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load selected person data for match analysis.',
          isLoading: false,
          personDetail: null,
        });
      }
    };

    void loadMatchAnalysisContext();
    return (): void => {
      isCancelled = true;
      controller.abort();
    };
  }, [application?.id, application?.personId]);

  useEffect(() => {
    setSelectedCvVersionId(
      resolveInitialVersionId(
        cvVersions,
        application?.activeArtifacts?.tailoredCvVersionId,
        latestCvVersionId
      )
    );
    setSelectedCoverLetterVersionId(
      resolveInitialVersionId(
        coverLetterVersions,
        application?.activeArtifacts?.coverLetterVersionId,
        latestCoverLetterVersionId
      )
    );
    setSelectedApplicationEmailVersionId(
      resolveInitialVersionId(
        applicationEmailVersions,
        application?.activeArtifacts?.applicationEmailVersionId,
        latestApplicationEmailVersionId
      )
    );
    setSelectedStatus(application?.status ?? 'draft');
  }, [
    application?.activeArtifacts?.applicationEmailVersionId,
    application?.activeArtifacts?.coverLetterVersionId,
    application?.activeArtifacts?.tailoredCvVersionId,
    application?.status,
    application?.id,
    applicationEmailVersions,
    coverLetterVersions,
    cvVersions,
    latestApplicationEmailVersionId,
    latestCoverLetterVersionId,
    latestCvVersionId,
  ]);
  const persistActiveArtifacts = (patch: Partial<FilemakerJobApplicationActiveArtifacts>): void => {
    const applicationIds = application?.applicationIds ?? [];
    const applicationId = applicationIds.length === 1 ? (applicationIds[0] ?? null) : null;
    if (applicationId === null) return;
    onActiveArtifactsChange(applicationId, {
      applicationEmailVersionId:
        selectedApplicationEmailVersionId.length > 0 ? selectedApplicationEmailVersionId : null,
      coverLetterVersionId:
        selectedCoverLetterVersionId.length > 0 ? selectedCoverLetterVersionId : null,
      tailoredCvVersionId: selectedCvVersionId.length > 0 ? selectedCvVersionId : null,
      ...patch,
    });
  };
  const handleCvVersionChange = (value: string): void => {
    setSelectedCvVersionId(value);
  };
  const handleCoverLetterVersionChange = (value: string): void => {
    setSelectedCoverLetterVersionId(value);
  };
  const handleApplicationEmailVersionChange = (value: string): void => {
    setSelectedApplicationEmailVersionId(value);
  };
  const handleSavePreparedApplication = (): void => {
    if (application === null) return;
    persistActiveArtifacts({});
    onStatusChange(application.id, selectedStatus);
  };
  const selectedCvVersion =
    cvVersions.find(
      (version: FilemakerJobApplication): boolean => version.id === selectedCvVersionId
    ) ??
    cvVersions[0] ??
    null;
  const selectedCoverLetterVersion =
    coverLetterVersions.find(
      (version: FilemakerJobApplication): boolean => version.id === selectedCoverLetterVersionId
    ) ??
    coverLetterVersions[0] ??
    null;
  const selectedApplicationEmailVersion =
    applicationEmailVersions.find(
      (version: FilemakerJobApplication): boolean =>
        version.id === selectedApplicationEmailVersionId
    ) ??
    applicationEmailVersions[0] ??
    null;
  const visibleApplication =
    application !== null
      ? createVisiblePreparedApplication({
          application,
          applicationEmailVersion: selectedApplicationEmailVersion,
          coverLetterVersion: selectedCoverLetterVersion,
          tailoredCvVersion: selectedCvVersion,
        })
      : null;
  const totalArtifactVersionCount =
    cvVersions.length + coverLetterVersions.length + applicationEmailVersions.length;
  const applyApplicationId =
    application !== null && application.applicationIds.length === 1
      ? application.applicationIds[0] ?? null
      : null;
  const cvHref = visibleApplication !== null ? cvApplicationHref(visibleApplication) : null;
  const jobHref =
    visibleApplication !== null ? getApplicationJobHref(visibleApplication, jobListing) : null;
  const notes = visibleApplication?.applicationNotes ?? [];
  const missingInformation = visibleApplication?.missingInformation ?? [];
  const skills = visibleApplication?.tailoredCv?.skills ?? [];
  const tailoringPatch = visibleApplication?.tailoredCv?.tailoringPatch ?? null;
  const tailoredProfessionalSummary =
    tailoringPatch?.professionalSummary ?? visibleApplication?.tailoredCv?.professionalSummary;
  const coreStrengths = tailoringPatch?.coreStrengths ?? visibleApplication?.tailoredCv?.coreStrengths ?? [];
  const selectedTechnicalEnvironment =
    tailoringPatch?.selectedTechnicalEnvironment ??
    visibleApplication?.tailoredCv?.selectedTechnicalEnvironment ??
    [];
  const experienceHighlightPatches =
    tailoringPatch?.experienceHighlightPatches ??
    visibleApplication?.tailoredCv?.experienceHighlightPatches ??
    [];
  const tailoredCvAllowedSections = visibleApplication?.tailoredCv?.tailoringScope?.allowedSections ?? [];
  const tailoredCvCanonicalPatchField =
    visibleApplication?.tailoredCv?.tailoringScope?.canonicalPatchField ?? 'tailoringPatch';
  const tailoredCvRenderedBodyMode =
    visibleApplication?.tailoredCv?.tailoringScope?.renderedBodyMode ?? 'ai_rendered_full_cv';
  const tailoredCvSourceTitle = visibleApplication?.tailoredCv?.sourceCvTitle?.trim() ?? '';
  const tailoredCvSourceId = visibleApplication?.tailoredCv?.sourceCvRecordId?.trim() ?? '';
  const tailoredCvSourceHref =
    visibleApplication !== null &&
    tailoredCvSourceId.length > 0 &&
    tailoredCvSourceId !== 'profile-fields-only' &&
    tailoredCvSourceId !== visibleApplication.tailoredCvId
      ? `/admin/filemaker/persons/${encodeURIComponent(
          visibleApplication.personId
        )}/cvs/${encodeURIComponent(tailoredCvSourceId)}`
      : null;
  const visibleApplicationForEmail =
    visibleApplication !== null && hasApplicationEmailArtifact(visibleApplication)
      ? visibleApplication
      : null;
  const canExportPdf =
    visibleApplication?.tailoredCvId !== null &&
    visibleApplication?.tailoredCvId !== undefined &&
    visibleApplication.tailoredCvId.trim().length > 0;
  const applyButtonLabel = resolveApplicationApplyButtonLabel(applyRun, isApplying);
  const applyActionHref = resolveStepSequencerActionHref(applyBrowserMode.action?.id);
  const matchAnalysis = visibleApplication?.matchAnalysis ?? null;
  const matchAnalysisHistory = visibleApplication?.matchAnalysisHistory ?? [];
  const visibleMatchAnalysisHistory = matchAnalysisHistory.slice(-4).reverse();
  const matchAnalysisStatus = visibleApplication?.matchAnalysisStatus ?? null;
  const displayedMatchAnalysisStatus =
    pendingMatchAnalysisRunId !== null ? 'queued' : matchAnalysisStatus;
  const matchAnalysisUpdatedAtMs = Date.parse(visibleApplication?.matchAnalysisUpdatedAt ?? '');
  const visibleApplicationUpdatedAtMs = Date.parse(visibleApplication?.updatedAt ?? '');
  const latestMatchAnalysisApplicationSnapshotMs = Date.parse(
    matchAnalysisHistory[matchAnalysisHistory.length - 1]?.applicationUpdatedAtSnapshot ?? ''
  );
  const visibleApplicationMatchAnalysisUpdatedAt = visibleApplication?.matchAnalysisUpdatedAt ?? null;
  const visibleApplicationMatchAnalysisSourceEntityId = visibleApplication?.matchAnalysisSourceEntityId ?? null;
  const matchAnalysisFreshnessBaselineMs = Number.isFinite(latestMatchAnalysisApplicationSnapshotMs)
    ? latestMatchAnalysisApplicationSnapshotMs
    : matchAnalysisUpdatedAtMs;
  const isMatchAnalysisStale =
    matchAnalysis !== null &&
    Number.isFinite(matchAnalysisFreshnessBaselineMs) &&
    Number.isFinite(visibleApplicationUpdatedAtMs) &&
    visibleApplicationUpdatedAtMs > matchAnalysisFreshnessBaselineMs + 60_000;
  const matchAnalysisFreshnessLabel = isMatchAnalysisStale
    ? 'Stale - rerun Analyze Match before relying on this recommendation'
    : 'Current';
  const matchAnalysisSnapshotLabel = Number.isFinite(matchAnalysisFreshnessBaselineMs)
    ? formatTimestamp(new Date(matchAnalysisFreshnessBaselineMs).toISOString())
    : null;
  const visibleApplicationUpdatedLabel = Number.isFinite(visibleApplicationUpdatedAtMs)
    ? formatTimestamp(new Date(visibleApplicationUpdatedAtMs).toISOString())
    : null;
  const canRunMatchAnalysis =
    visibleApplication !== null &&
    jobListing !== null &&
    matchAnalysisContext.isLoading === false &&
    matchAnalysisContext.error === null;
  const matchAnalysisCvCount = matchAnalysisContext.cvs.length;
  const matchAnalysisContextStatus = (() => {
    if (matchAnalysisContext.isLoading) return 'Loading CV context';
    if (matchAnalysisContext.error !== null) return 'Context unavailable';
    const suffix = matchAnalysisCvCount === 1 ? '' : 's';
    return `${matchAnalysisCvCount} CV record${suffix} loaded`;
  })();
  const matchAnalysisDisabledReason = (() => {
    if (visibleApplication === null) return 'Open a prepared application before running match analysis.';
    if (jobListing === null) return 'Job listing context is missing.';
    if (matchAnalysisContext.isLoading) return 'Selected person profile and CV records are still loading.';
    return matchAnalysisContext.error;
  })();
  const matchAnalysisScore = matchAnalysis?.score ?? null;
  const matchAnalysisReadinessLabel = (() => {
    if (matchAnalysisScore === null) return 'Not analyzed';
    if (matchAnalysisScore >= 90) return 'Excellent fit';
    if (matchAnalysisScore >= 75) return 'Strong fit';
    if (matchAnalysisScore >= 60) return 'Workable fit';
    if (matchAnalysisScore >= 40) return 'Partial fit';
    return 'Weak fit';
  })();
  const matchAnalysisReadinessHint = (() => {
    if (matchAnalysisScore === null) return 'Run analysis to estimate application readiness.';
    if (matchAnalysisScore >= 75)
      return 'This application looks worth prioritising. Focus on sharpening evidence and interview talking points.';
    if (matchAnalysisScore >= 60)
      return 'This application may be viable, but the gaps should be addressed before applying.';
    return 'This application needs focused preparation or a stronger evidence story before applying.';
  })();
  const matchAnalysisReadinessClassName = (() => {
    if (matchAnalysisScore === null) return 'border-border/50 bg-background/35 text-gray-300';
    if (matchAnalysisScore >= 75) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
    if (matchAnalysisScore >= 60) return 'border-blue-500/30 bg-blue-500/10 text-blue-100';
    if (matchAnalysisScore >= 40) return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
    return 'border-red-500/30 bg-red-500/10 text-red-100';
  })();
  const previousMatchAnalysisScore =
    matchAnalysisHistory.length > 1
      ? matchAnalysisHistory[matchAnalysisHistory.length - 2]?.payload?.score ?? null
      : null;
  const previousMatchAnalysisDecision =
    matchAnalysisHistory.length > 1
      ? matchAnalysisHistory[matchAnalysisHistory.length - 2]?.payload?.recommendedDecision ?? null
      : null;
  const matchAnalysisScoreDelta =
    matchAnalysisScore !== null && previousMatchAnalysisScore !== null
      ? matchAnalysisScore - previousMatchAnalysisScore
      : null;
  const matchAnalysisScoreDeltaLabel = (() => {
    if (matchAnalysisScoreDelta === null) return null;
    if (matchAnalysisScoreDelta > 0) return `+${matchAnalysisScoreDelta} vs previous`;
    return `${matchAnalysisScoreDelta} vs previous`;
  })();
  const matchAnalysisPrepWorkloadScore =
    (matchAnalysis?.gaps.length ?? 0) +
    (matchAnalysis?.attentionAreas.length ?? 0) +
    (matchAnalysis?.riskFlags.length ?? 0);
  const matchAnalysisPrepWorkloadLabel = (() => {
    if (matchAnalysis === null) return 'Unknown prep workload';
    if (matchAnalysisPrepWorkloadScore <= 3) return 'Low prep workload';
    if (matchAnalysisPrepWorkloadScore <= 7) return 'Medium prep workload';
    return 'High prep workload';
  })();
  const fallbackMatchAnalysisDecisionLabel = (() => {
    if (matchAnalysisScore === null) return 'Analyze before deciding';
    if (matchAnalysisScore >= 75 && matchAnalysisPrepWorkloadScore <= 7) return 'Apply now';
    if (matchAnalysisScore >= 60) return 'Prepare before applying';
    return 'Deprioritise or rebuild evidence';
  })();
  const fallbackMatchAnalysisDecisionHint = (() => {
    if (matchAnalysisScore === null)
      return 'Run Analyze Match to turn the job/CV comparison into an application decision.';
    if (matchAnalysisScore >= 75 && matchAnalysisPrepWorkloadScore <= 7) {
      return 'The fit is strong enough to move forward. Review risks and tailor talking points.';
    }
    if (matchAnalysisScore >= 60) {
      return 'The fit is plausible, but address the listed gaps before sending the application.';
    }
    return 'The current evidence is weak for this posting. Apply only if there is a strategic reason.';
  })();
  const matchAnalysisDecisionLabel =
    matchAnalysis?.recommendedDecision ?? fallbackMatchAnalysisDecisionLabel;
  const matchAnalysisDecisionHint =
    matchAnalysis?.recommendedDecisionReason ?? fallbackMatchAnalysisDecisionHint;
  const matchAnalysisDecisionSource =
    matchAnalysis?.recommendedDecision !== null && matchAnalysis?.recommendedDecision !== undefined
      ? 'AI recommendation'
      : 'Derived from score';
  const matchAnalysisDecisionChanged =
    previousMatchAnalysisDecision !== null &&
    matchAnalysisDecisionLabel !== previousMatchAnalysisDecision;
  const matchAnalysisDecisionClassName = (() => {
    if (matchAnalysisDecisionLabel === 'Apply now')
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
    if (matchAnalysisDecisionLabel === 'Prepare before applying')
      return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
    if (matchAnalysisDecisionLabel === 'Deprioritise or rebuild evidence')
      return 'border-red-500/30 bg-red-500/10 text-red-100';
    if (matchAnalysisScore === null) return 'border-border/50 bg-background/35 text-gray-300';
    if (matchAnalysisScore >= 75 && matchAnalysisPrepWorkloadScore <= 7)
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
    if (matchAnalysisScore >= 60) return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
    return 'border-red-500/30 bg-red-500/10 text-red-100';
  })();

  const getMatchAnalysisEntityJson = useCallback((): Record<string, unknown> | null => {
    if (visibleApplication === null || jobListing === null) return null;
    const canonicalApplicationKey =
      visibleApplication.canonicalApplicationKey;
    return {
      id: `${canonicalApplicationKey}:match-analysis`,
      applicationContext: {
        version: 1,
        applicationRecord: {
          id: visibleApplication.id,
          applicationIds: visibleApplication.applicationIds,
          canonicalApplicationKey,
          status: selectedStatus,
          personId: visibleApplication.personId,
          personName: visibleApplication.personName,
          organizationId: visibleApplication.organizationId,
          organizationName: visibleApplication.organizationName,
          jobListingId: visibleApplication.jobListingId,
          jobTitle: visibleApplication.jobTitle,
          integrationId: visibleApplication.integrationId,
          integrationSlug: visibleApplication.integrationSlug,
          connectionId: visibleApplication.connectionId,
          tailoredCv: truncateApplicationMatchAnalysisValue(visibleApplication.tailoredCv),
          coverLetter: truncateApplicationMatchAnalysisValue(visibleApplication.coverLetter),
          applicationEmail: truncateApplicationMatchAnalysisValue(visibleApplication.applicationEmail),
          applicationNotes: visibleApplication.applicationNotes,
          missingInformation: visibleApplication.missingInformation,
          confidence: visibleApplication.confidence,
          createdAt: visibleApplication.createdAt,
          updatedAt: visibleApplication.updatedAt,
          previousMatchAnalysis: truncateApplicationMatchAnalysisValue(visibleApplication.matchAnalysis),
          previousMatchAnalysisHistory: truncateApplicationMatchAnalysisValue(
            visibleApplication.matchAnalysisHistory
          ),
          previousMatchAnalysisUpdatedAt: visibleApplication.matchAnalysisUpdatedAt,
          previousMatchAnalysisModelId: visibleApplication.matchAnalysisModelId,
        },
        personContext: {
          selectedPersonId: visibleApplication.personId,
          person: truncateApplicationMatchAnalysisValue(
            resolvePersonRecordFromPayload(matchAnalysisContext.personDetail)
          ),
          personPayload: truncateApplicationMatchAnalysisValue(matchAnalysisContext.personDetail),
          education: truncateApplicationMatchAnalysisValue(
            resolvePersonRecordFromPayload(matchAnalysisContext.personDetail)?.['education'] ??
              resolvePersonRecordFromPayload(matchAnalysisContext.personDetail)?.['educationItems'] ??
              matchAnalysisContext.personDetail?.['education'] ??
              matchAnalysisContext.personDetail?.['educationItems'] ??
              null
          ),
          languageSkills: truncateApplicationMatchAnalysisValue(
            resolvePersonRecordFromPayload(matchAnalysisContext.personDetail)?.['languageSkills'] ??
              matchAnalysisContext.personDetail?.['languageSkills'] ??
              null
          ),
          cvs: matchAnalysisContext.cvs.map(compactApplicationCvForMatchAnalysis),
        },
        jobContext: {
          selectedJobListingId: jobListing.id,
          listing: truncateApplicationMatchAnalysisValue(jobListing),
        },
        organizationContext: {
          selectedOrganizationId: visibleApplication.organizationId,
          organization: {
            id: visibleApplication.organizationId,
            name: visibleApplication.organizationName,
          },
        },
        platformContext: {
          integrationId: visibleApplication.integrationId,
          integrationSlug: visibleApplication.integrationSlug,
          connectionId: visibleApplication.connectionId,
        },
        analysisRequest: {
          artifact: 'job_application_match_analysis',
          modelId: 'gpt-oss:120b-cloud',
          includeAllJobPostingAspects: true,
          includeCurrentPersonProfileCvAndEducation: true,
          goal:
            'Score candidate/job fit and identify practical attention areas before applying.',
        },
        outputContract: buildApplicationMatchAnalysisOutputContract(),
      },
    };
  }, [jobListing, matchAnalysisContext.cvs, matchAnalysisContext.personDetail, selectedStatus, visibleApplication]);

  const handleCopyMatchAnalysis = (): void => {
    if (matchAnalysis === null) return;
    const lines: string[] = [];
    const addLine = (line: string | null | undefined): void => {
      if (isNonEmptyString(line)) lines.push(line);
    };
    addLine(`Match score: ${matchAnalysis.score ?? 'n/a'}${
      isNonEmptyString(matchAnalysis.scoreLabel) ? ` (${matchAnalysis.scoreLabel})` : ''
    }`);
    addLine(`Recommended decision: ${matchAnalysisDecisionLabel}`);
    addLine(`Decision source: ${matchAnalysisDecisionSource}`);
    addLine(`Analysis freshness: ${matchAnalysisFreshnessLabel}`);
    if (matchAnalysisSnapshotLabel !== null) addLine(`Analyzed application snapshot: ${matchAnalysisSnapshotLabel}`);
    if (visibleApplicationUpdatedLabel !== null) addLine(`Current application updated: ${visibleApplicationUpdatedLabel}`);
    if (isNonEmptyString(matchAnalysisDecisionHint))
      addLine(`Decision reason: ${matchAnalysisDecisionHint}`);
    if (isNonEmptyString(matchAnalysis.summary)) addLine(`Summary: ${matchAnalysis.summary}`);
    if (isNonEmptyString(matchAnalysis.changeSincePrevious))
      addLine(`Change since previous: ${matchAnalysis.changeSincePrevious}`);
    if (matchAnalysis.strongMatches.length > 0) {
      addLine(`Strong matches:\n${matchAnalysis.strongMatches.map((item: string) => `- ${item}`).join('\n')}`);
    }
    if (matchAnalysis.gaps.length > 0) {
      addLine(`Gaps:\n${matchAnalysis.gaps.map((item: string) => `- ${item}`).join('\n')}`);
    }
    if (matchAnalysis.attentionAreas.length > 0) {
      addLine(
        `Attention areas:\n${matchAnalysis.attentionAreas
          .map((area) => {
            const areaLabel = isNonEmptyString(area.area) ? area.area : 'Attention';
            const recommendation = isNonEmptyString(area.recommendedAction)
              ? `: ${area.recommendedAction}`
              : '';
            return `- ${areaLabel}${recommendation}`;
          })
          .join('\n')}`
      );
    }
    if (matchAnalysis.riskFlags.length > 0) {
      addLine(`Risk flags:\n${matchAnalysis.riskFlags.map((item: string) => `- ${item}`).join('\n')}`);
    }
    if (matchAnalysis.interviewTalkingPoints.length > 0) {
      addLine(
        `Interview talking points:\n${matchAnalysis.interviewTalkingPoints
          .map((item: string) => `- ${item}`)
          .join('\n')}`
      );
    }
    if (matchAnalysis.learningPlan.length > 0) {
      addLine(
        `Preparation plan:\n${matchAnalysis.learningPlan
          .map((item: string) => `- ${item}`)
          .join('\n')}`
      );
    }
    void navigator.clipboard
      .writeText(lines.join('\n\n'))
      .then((): void => {
        toast('Match analysis copied.', { variant: 'success' });
      })
      .catch((error: unknown): void => {
        logClientError(error);
        toast('Failed to copy match analysis.', { variant: 'error' });
      });
  };

  const handleCopyMatchPreparationPlan = (): void => {
    if (matchAnalysis === null) return;
    const lines: string[] = [];
    const addLine = (line: string | null | undefined): void => {
      if (isNonEmptyString(line)) lines.push(line);
    };
    addLine(`Application readiness: ${matchAnalysisReadinessLabel}`);
    addLine(`Recommended decision: ${matchAnalysisDecisionLabel}`);
    addLine(`Decision source: ${matchAnalysisDecisionSource}`);
    addLine(`Analysis freshness: ${matchAnalysisFreshnessLabel}`);
    if (matchAnalysisSnapshotLabel !== null) addLine(`Analyzed application snapshot: ${matchAnalysisSnapshotLabel}`);
    if (visibleApplicationUpdatedLabel !== null) addLine(`Current application updated: ${visibleApplicationUpdatedLabel}`);
    if (isNonEmptyString(matchAnalysisDecisionHint))
      addLine(`Decision reason: ${matchAnalysisDecisionHint}`);
    addLine(`Match score: ${matchAnalysis.score ?? 'n/a'}${
      isNonEmptyString(matchAnalysis.scoreLabel) ? ` (${matchAnalysis.scoreLabel})` : ''
    }`);
    if (matchAnalysis.gaps.length > 0) {
      addLine(`Gaps to address:\n${matchAnalysis.gaps.map((item: string) => `- ${item}`).join('\n')}`);
    }
    if (matchAnalysis.attentionAreas.length > 0) {
      addLine(
        `Action checklist:\n${matchAnalysis.attentionAreas
          .map((area, index: number) => {
            const areaLabel = isNonEmptyString(area.area) ? area.area : 'Attention area';
            const recommendation = isNonEmptyString(area.recommendedAction)
              ? `: ${area.recommendedAction}`
              : '';
            return `${index + 1}. ${areaLabel}${recommendation}`;
          })
          .join('\n')}`
      );
    }
    if (matchAnalysis.riskFlags.length > 0) {
      addLine(`Risks to prepare for:\n${matchAnalysis.riskFlags.map((item: string) => `- ${item}`).join('\n')}`);
    }
    if (matchAnalysis.interviewTalkingPoints.length > 0) {
      addLine(
        `Interview talking points:\n${matchAnalysis.interviewTalkingPoints
          .map((item: string) => `- ${item}`)
          .join('\n')}`
      );
    }
    if (matchAnalysis.learningPlan.length > 0) {
      addLine(`Focused prep:\n${matchAnalysis.learningPlan.map((item: string) => `- ${item}`).join('\n')}`);
    }
    void navigator.clipboard
      .writeText(lines.join('\n\n'))
      .then((): void => {
        toast('Preparation plan copied.', { variant: 'success' });
      })
      .catch((error: unknown): void => {
        logClientError(error);
        toast('Failed to copy preparation plan.', { variant: 'error' });
      });
  };

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (
      pendingMatchAnalysisRunId !== null &&
      visibleApplication?.matchAnalysisSourceEntityId === pendingMatchAnalysisRunId
    ) {
      setPendingMatchAnalysisRunId(null);
    }
  }, [pendingMatchAnalysisRunId, visibleApplication?.matchAnalysisSourceEntityId]);

  useEffect(
    () => (): void => {
      matchAnalysisRefreshTimeoutsRef.current.forEach((timeoutId: number): void => {
        window.clearTimeout(timeoutId);
      });
      matchAnalysisRefreshTimeoutsRef.current = [];
    },
    []
  );

  const scheduleMatchAnalysisRefreshes = useCallback((): void => {
    matchAnalysisRefreshTimeoutsRef.current.forEach((timeoutId: number): void => {
      window.clearTimeout(timeoutId);
    });
    matchAnalysisRefreshTimeoutsRef.current = [0, 3000, 9000, 20000, 45000].map(
      (delay: number): number =>
        window.setTimeout((): void => {
          onAnalysisRunQueued?.();
        }, delay)
    );
  }, [onAnalysisRunQueued]);

  const loadLatestApplyRun = useCallback(
    async (targetApplicationId: string, options?: { silent?: boolean }): Promise<void> => {
      const requestSeq = (applyRunRequestSeqRef.current += 1);
      try {
        const response = await fetch(
          `/api/filemaker/job-applications/${encodeURIComponent(targetApplicationId)}/apply`
        );
        if (!response.ok) throw new Error(`Failed to load apply run (${response.status}).`);
        const payload = (await response.json()) as FilemakerJobApplicationApplyRunResponse;
        if (requestSeq === applyRunRequestSeqRef.current) {
          setApplyRun(payload.run ?? null);
        }
      } catch (error: unknown) {
        logClientError(error);
        if (options?.silent !== true) {
          toastRef.current(
            error instanceof Error ? error.message : 'Failed to load application apply run.',
            {
              variant: 'error',
            }
          );
        }
      }
    },
    []
  );

  useEffect(() => {
    applyRunRequestSeqRef.current += 1;
    setApplyRun(null);
    setAppliedStatusSyncRunId(null);
    if (applyApplicationId === null) return;
    void loadLatestApplyRun(applyApplicationId, { silent: true });
  }, [applyApplicationId, loadLatestApplyRun]);

  useEffect(() => {
    if (applyApplicationId === null || !isActiveApplicationApplyRun(applyRun)) return undefined;
    const intervalId = safeSetInterval(() => {
      void loadLatestApplyRun(applyApplicationId, { silent: true });
    }, 2500);
    return (): void => safeClearInterval(intervalId);
  }, [applyApplicationId, applyRun, loadLatestApplyRun]);

  useEffect(() => {
    if (
      applyApplicationId === null ||
      applyRun?.status !== 'submitted' ||
      appliedStatusSyncRunId === applyRun.id ||
      application?.status === 'applied'
    ) {
      return;
    }
    setAppliedStatusSyncRunId(applyRun.id);
    onStatusChange(applyApplicationId, 'applied');
  }, [
    application?.status,
    appliedStatusSyncRunId,
    applyApplicationId,
    applyRun?.id,
    applyRun?.status,
    onStatusChange,
  ]);

  const handleApply = async (): Promise<void> => {
    if (visibleApplication === null || applyApplicationId === null) return;
    const requestSeq = (applyRunRequestSeqRef.current += 1);
    setIsApplying(true);
    try {
      await applyBrowserMode.persist();
      const response = await fetch(
        `/api/filemaker/job-applications/${encodeURIComponent(applyApplicationId)}/apply`,
        {
          method: 'POST',
          headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            activeArtifacts: {
              applicationEmailVersionId:
                selectedApplicationEmailVersionId.length > 0
                  ? selectedApplicationEmailVersionId
                  : null,
              coverLetterVersionId:
                selectedCoverLetterVersionId.length > 0 ? selectedCoverLetterVersionId : null,
              tailoredCvVersionId: selectedCvVersionId.length > 0 ? selectedCvVersionId : null,
            },
            mode: 'submit',
          }),
        }
      );
      if (!response.ok) throw new Error(`Failed to start application apply run (${response.status}).`);
      const payload = (await response.json()) as FilemakerJobApplicationApplyRunResponse;
      if (requestSeq === applyRunRequestSeqRef.current) {
        setApplyRun(payload.run ?? null);
      }
      toast('Application apply run started.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to start application apply run.', {
        variant: 'error',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handlePreviewCvPdf = async (): Promise<void> => {
    if (!visibleApplication || !canExportPdf) return;
    setIsPreviewingCvPdf(true);
    try {
      const response = await fetch(
        `/api/filemaker/cvs/${encodeURIComponent(visibleApplication.tailoredCvId ?? '')}`
      );
      if (!response.ok) throw new Error(`Failed to load CV preview (${response.status}).`);
      const payload = (await response.json()) as { cv?: FilemakerCv };
      const cv = payload.cv;
      if (!cv) throw new Error('CV preview data was not returned.');
      const html =
        cv.bodyBlocks !== null && cv.bodyBlocks.length > 0
          ? compileCvBlocksToHtml(cv.bodyBlocks, {
              highlightedTechnologyTerms: cv.highlightTechnologyTerms ?? [],
            })
          : cv.bodyHtml;
      if (html === null || html.trim().length === 0) {
        throw new Error('CV preview content is empty.');
      }
      openFilemakerCvPdfPreview(html);
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to preview CV PDF.', {
        variant: 'error',
      });
    } finally {
      setIsPreviewingCvPdf(false);
    }
  };

  const handleExportPdf = async (): Promise<void> => {
    if (!visibleApplication || !canExportPdf) return;
    setIsExportingPdf(true);
    try {
      const response = await fetch('/api/filemaker/cvs/export-pdf', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ cvId: visibleApplication.tailoredCvId }),
      });
      if (!response.ok) throw new Error(`Failed to export CV (${response.status}).`);
      const fallbackTitle = formatNullableText(
        visibleApplication.tailoredCv?.title,
        visibleApplication.id
      );
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

  const handlePreviewCoverLetter = (): void => {
    if (!visibleApplication) return;
    try {
      const subject = formatNullableText(visibleApplication.coverLetter?.subject, 'Cover letter');
      openFilemakerCvPdfPreview(
        composePlainDocumentPreviewHtml({
          title: subject,
          meta: composeApplicationMeta(visibleApplication),
          body: formatNullableText(
            visibleApplication.coverLetter?.bodyMarkdown,
            'No cover letter content was generated.'
          ),
        })
      );
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to preview cover letter.', {
        variant: 'error',
      });
    }
  };

  const handlePreviewApplicationEmail = (): void => {
    if (!visibleApplication) return;
    try {
      const subject = formatNullableText(
        visibleApplication.applicationEmail?.subject,
        'Application email'
      );
      openFilemakerCvPdfPreview(
        composePlainDocumentPreviewHtml({
          title: subject,
          meta: composeApplicationMeta(visibleApplication),
          body: formatNullableText(
            visibleApplication.applicationEmail?.bodyText ??
              visibleApplication.applicationEmail?.bodyMarkdown,
            'No application email content was generated.'
          ),
        })
      );
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to preview application email.', {
        variant: 'error',
      });
    }
  };

  const handleDownloadCoverLetterText = (): void => {
    if (!visibleApplication) return;
    const fallbackTitle = createDownloadFilename(
      visibleApplication.coverLetter?.subject,
      visibleApplication.id
    );
    downloadBlob(
      new Blob([composeCoverLetterText(visibleApplication)], {
        type: 'text/plain;charset=utf-8',
      }),
      `${fallbackTitle}.txt`
    );
    toast('Cover letter text downloaded.', { variant: 'success' });
  };

  const handleExportCoverLetterPdf = async (): Promise<void> => {
    if (!visibleApplication || selectedCoverLetterVersion === null) return;
    setIsExportingCoverLetterPdf(true);
    try {
      const storageCoverLetterApplicationId = selectedCoverLetterVersion.storageApplicationId?.trim() ?? '';
      const coverLetterApplicationId = isNonEmptyString(storageCoverLetterApplicationId)
        ? storageCoverLetterApplicationId
        : selectedCoverLetterVersion.id;
      const artifactVersionId = selectedCoverLetterVersion.artifactVersionId?.trim() ?? '';
      const query = isNonEmptyString(artifactVersionId)
        ? `?coverLetterVersionId=${encodeURIComponent(artifactVersionId)}`
        : '';
      const response = await fetch(
        `/api/filemaker/job-applications/${encodeURIComponent(
          coverLetterApplicationId
        )}/cover-letter-pdf${query}`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error(`Failed to export cover letter (${response.status}).`);
      const fallbackTitle = createDownloadFilename(
        visibleApplication.coverLetter?.subject,
        visibleApplication.id
      );
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
      subtitle={undefined}
      size='xl'
      className='w-[min(96vw,86rem)] max-w-[86rem] md:min-w-[72rem]'
      header={
        <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
          <div className='min-w-0'>
            <div className='flex min-w-0 items-center gap-2'>
              <FormActions
                onSave={handleSavePreparedApplication}
                saveText='Save'
                saveVariant='success'
                isSaving={isMutating}
                isDisabled={application === null || isMutating}
                className='mr-2'
              />
              <h2 className='truncate text-2xl font-bold tracking-tight text-white'>
                Prepared application
              </h2>
            </div>
          </div>
          <Button type='button' onClick={onClose} variant='outline' size='sm'>
            Close
          </Button>
        </div>
      }
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
                void handlePreviewCvPdf();
              }}
              disabled={isMutating || isPreviewingCvPdf}
              className='gap-1.5'
            >
              {!isPreviewingCvPdf ? <Eye className='h-3.5 w-3.5' aria-hidden='true' /> : null}
              {isPreviewingCvPdf ? 'Previewing...' : 'Preview CV PDF'}
            </Button>
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
              Open source
            </a>
          ) : null}
          {application !== null ? (
            <Button
              type='button'
              onClick={(): void => {
                void handleApply();
              }}
              disabled={
                isMutating ||
                isApplying ||
                applyBrowserMode.isSaving ||
                isActiveApplicationApplyRun(applyRun) ||
                applyApplicationId === null
              }
              className='gap-1.5'
            >
              {isApplying || isActiveApplicationApplyRun(applyRun) ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
              ) : null}
              {applyButtonLabel}
            </Button>
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
        </>
      }
    >
      {application !== null ? (
        <div className='space-y-4'>
          <div className='flex flex-wrap gap-2 text-xs text-gray-400'>
            <Badge variant='outline'>{application.status}</Badge>
            <Badge variant='outline'>
              {formatApplicationConfidence(visibleApplication ?? application)}
            </Badge>
            <Badge variant='outline'>{formatApplicationPerson(visibleApplication ?? application)}</Badge>
            <Badge variant='outline'>{formatTimestamp(application.createdAt)}</Badge>
            <Badge variant='outline'>
              {totalArtifactVersionCount} generated version
              {totalArtifactVersionCount === 1 ? '' : 's'}
            </Badge>
          </div>

          {applyRun !== null ? (
            <div className='rounded-md border border-border/70 bg-black/20 p-3 text-sm text-gray-200'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='outline'>{formatApplicationApplyRunStatus(applyRun.status)}</Badge>
                <span className='text-xs text-gray-400'>{formatTimestamp(applyRun.updatedAt)}</span>
                {applyRun.confirmationUrl !== null ? (
                  <a
                    href={applyRun.confirmationUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='text-xs text-primary hover:underline'
                  >
                    Confirmation
                  </a>
                ) : null}
              </div>
              {applyRun.steps.length > 0 ? (
                <div className='mt-3 space-y-2'>
                  <div className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
                    Playwright application steps
                  </div>
                  <ol
                    aria-label='Playwright application steps'
                    className='space-y-2 border-l border-border/70 pl-3'
                  >
                    {applyRun.steps.map(
                      (step: FilemakerJobApplicationApplyRunStep): React.JSX.Element => (
                        <li key={step.id} className='space-y-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <Badge variant='outline'>
                              {formatApplicationApplyRunStepStatus(step.status)}
                            </Badge>
                            <span className='text-xs font-medium text-gray-100'>{step.label}</span>
                            <span className='text-[11px] text-gray-500'>
                              {formatTimestamp(step.createdAt)}
                            </span>
                          </div>
                          {step.detail.trim().length > 0 ? (
                            <p className='text-xs leading-relaxed text-gray-400'>{step.detail}</p>
                          ) : null}
                        </li>
                      )
                    )}
                  </ol>
                </div>
              ) : null}
              {applyRun.error !== null ? (
                <p className='mt-2 text-xs text-red-300'>{applyRun.error}</p>
              ) : null}
            </div>
          ) : null}

          {(application.applicationLog?.length ?? 0) > 0 ? (
            <div className='rounded-md border border-border/70 bg-black/20 p-3'>
              <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400'>
                Status log
              </div>
              <ol className='space-y-1.5 border-l border-border/70 pl-3'>
                {(application.applicationLog as FilemakerJobApplicationLogEntry[]).map(
                  (entry: FilemakerJobApplicationLogEntry): React.JSX.Element => {
                    const personLabel = (() => {
                      if (isNonEmptyString(entry.personName)) return ` · ${entry.personName}`;
                      if (isNonEmptyString(entry.personId)) return ` · ${entry.personId}`;
                      return null;
                    })();
                    return (
                    <li key={entry.id} className='flex flex-wrap items-center gap-x-2 gap-y-0.5'>
                      <span className='text-xs font-medium text-gray-100'>
                        {entry.toStatus !== null && entry.toStatus !== undefined
                          ? entry.toStatus.charAt(0).toUpperCase() + entry.toStatus.slice(1)
                          : 'Applied'}
                      </span>
                      <Badge variant={entry.method === 'apply_script' ? 'success' : 'outline'}>
                        {entry.method === 'apply_script' ? 'Apply script' : 'Manual'}
                      </Badge>
                      <span className='text-[11px] text-gray-500'>
                        {formatTimestamp(entry.appliedAt)}
                      </span>
                      {personLabel !== null ? (
                        <span className='text-[11px] text-gray-500'>
                          {personLabel}
                        </span>
                      ) : null}
                      <button
                        type='button'
                        className='ml-auto text-[10px] text-gray-600 hover:text-red-400'
                        title='Remove this log entry'
                        onClick={(): void => {
                          onRemoveLogEntry(application.baseApplicationId, entry.id);
                        }}
                        aria-label='Remove log entry'
                      >
                        <Trash2 className='h-3 w-3' aria-hidden='true' />
                      </button>
                    </li>
                    );
                  }
                )}
              </ol>
            </div>
          ) : null}

          <div className='space-y-3 rounded-md border border-border/70 bg-black/20 p-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <div className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
                  Settings
                </div>
                <div className='text-sm text-gray-200'>
                  {applyBrowserMode.action?.name ?? 'Job Application Apply'}
                </div>
              </div>
              <a
                href={applyActionHref}
                className='inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 px-2.5 text-xs text-gray-100 hover:bg-white/5'
              >
                <ExternalLink className='h-3.5 w-3.5' aria-hidden='true' />
                Edit action
              </a>
            </div>
            <ToggleRow
              label='Action browser mode'
              description='Synced with the Job Application Apply action sequence.'
              checked={applyBrowserMode.headless}
              onCheckedChange={applyBrowserMode.setHeadless}
              disabled={
                applyBrowserMode.isLoading ||
                isApplying ||
                isActiveApplicationApplyRun(applyRun)
              }
              loading={applyBrowserMode.isLoading || applyBrowserMode.isSaving}
              variant='switch'
              toggleOnRowClick
            >
              <div className='pt-1 text-[11px] font-medium text-foreground'>
                Current: {applyBrowserMode.headless ? 'Headless' : 'Headed'}
                {applyBrowserMode.hasUnsavedChanges ? ' · Unsaved' : ''}
              </div>
            </ToggleRow>
          </div>

          <div className='grid gap-3 md:grid-cols-3'>
            <PreparedArtifactVersionPicker
              label='CV version'
              value={selectedCvVersionId}
              versions={cvVersions}
              onValueChange={handleCvVersionChange}
            />
            <PreparedArtifactVersionPicker
              label='Cover letter version'
              value={selectedCoverLetterVersionId}
              versions={coverLetterVersions}
              onValueChange={handleCoverLetterVersionChange}
            />
            <PreparedArtifactVersionPicker
              label='Email version'
              value={selectedApplicationEmailVersionId}
              versions={applicationEmailVersions}
              onValueChange={handleApplicationEmailVersionChange}
            />
          </div>

          <FormField label='Application status'>
            <SelectSimple
              value={selectedStatus}
              onValueChange={(value: string): void => {
                setSelectedStatus(value as FilemakerJobApplicationStatus);
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
                      onClick={handlePreviewCoverLetter}
                      disabled={isMutating}
                    >
                      <Eye className='h-3.5 w-3.5' aria-hidden='true' />
                      Preview
                    </Button>
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
                    {formatNullableText(visibleApplication?.coverLetter?.subject, 'Cover letter')}
                  </div>
                  <pre className='whitespace-pre-wrap text-xs leading-5 text-gray-300'>
                    {formatNullableText(
                      visibleApplication?.coverLetter?.bodyMarkdown,
                      'No cover letter content was generated.'
                    )}
                  </pre>
                </div>
              </section>

              {visibleApplicationForEmail !== null ? (
                <section className='space-y-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <h4 className='text-sm font-semibold text-white'>Application email</h4>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-8 gap-1.5'
                        onClick={handlePreviewApplicationEmail}
                        disabled={isMutating}
                      >
                        <Eye className='h-3.5 w-3.5' aria-hidden='true' />
                        Preview
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-8 gap-1.5'
                        onClick={(): void => {
                          const filename = createDownloadFilename(
                            visibleApplicationForEmail.applicationEmail?.subject,
                            visibleApplicationForEmail.id
                          );
                          const applicationEmailText = composeApplicationEmailText(
                            visibleApplicationForEmail
                          );
                          downloadBlob(
                            new Blob(
                              [applicationEmailText],
                              {
                                type: 'text/plain;charset=utf-8',
                              }
                            ),
                            `${filename}.txt`
                          );
                          toast('Application email text downloaded.', { variant: 'success' });
                        }}
                        disabled={isMutating}
                      >
                        <Download className='h-3.5 w-3.5' aria-hidden='true' />
                        Download Text
                      </Button>
                    </div>
                  </div>
                  <div className='rounded-md border border-border/50 bg-background/30 p-3'>
                    <div className='mb-2 text-sm font-medium text-gray-100'>
                      {formatNullableText(
                        visibleApplicationForEmail.applicationEmail?.subject,
                        'Application email'
                      )}
                    </div>
                    <pre className='whitespace-pre-wrap text-xs leading-5 text-gray-300'>
                      {formatNullableText(
                        visibleApplicationForEmail.applicationEmail?.bodyText ??
                          visibleApplicationForEmail.applicationEmail?.bodyMarkdown,
                        'No application email content was generated.'
                      )}
                    </pre>
                  </div>
                </section>
              ) : null}

              <section className='space-y-2'>
                <h4 className='text-sm font-semibold text-white'>Tailored CV</h4>
                <div className='rounded-md border border-border/50 bg-background/30 p-3'>
                  <div className='mb-2 text-sm font-medium text-gray-100'>
                    {formatNullableText(visibleApplication?.tailoredCv?.title, 'Tailored CV')}
                  </div>
                  {tailoredCvSourceTitle.length > 0 || tailoredCvSourceId.length > 0 ? (
                    <div className='mb-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-400'>
                      <span>
                        Based on CV:{' '}
                        {tailoredCvSourceTitle.length > 0 ? tailoredCvSourceTitle : tailoredCvSourceId}
                      </span>
                      {tailoredCvSourceHref !== null ? (
                        <a
                          href={tailoredCvSourceHref}
                          className='rounded border border-border/60 px-2 py-0.5 text-[10px] font-medium text-gray-200 transition-colors hover:border-emerald-300/50 hover:text-emerald-100'
                        >
                          Open source CV
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  <p className='text-xs leading-5 text-gray-300'>
                    {formatNullableText(
                      tailoredProfessionalSummary,
                      'No professional summary was generated.'
                    )}
                  </p>
                  {tailoredCvAllowedSections.length > 0 ? (
                    <div className='mt-3 rounded border border-emerald-400/20 bg-emerald-400/5 p-2 text-[11px] leading-4 text-emerald-100'>
                      Tailoring limited to: {tailoredCvAllowedSections.join(', ')}
                      <br />
                      Canonical patch: {tailoredCvCanonicalPatchField}; rendered body:{' '}
                      {tailoredCvRenderedBodyMode}
                    </div>
                  ) : null}
                  {coreStrengths.length > 0 ? (
                    <div className='mt-3'>
                      <div className='mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400'>
                        Core strengths
                      </div>
                      <div className='flex flex-wrap gap-1'>
                        {coreStrengths.map((strength: string) => (
                          <Badge key={strength} variant='outline'>
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {selectedTechnicalEnvironment.length > 0 ? (
                    <div className='mt-3'>
                      <div className='mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400'>
                        Selected technical environment
                      </div>
                      <div className='flex flex-wrap gap-1'>
                        {selectedTechnicalEnvironment.map((technology: string) => (
                          <Badge key={technology} variant='outline'>
                            {technology}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {experienceHighlightPatches.length > 0 ? (
                    <div className='mt-3 space-y-2'>
                      <div className='text-[11px] font-semibold uppercase tracking-wide text-gray-400'>
                        Experience highlight patches
                      </div>
                      {experienceHighlightPatches.map((patch) => (
                        <div
                          key={`${patch.experienceKey ?? patch.experienceId ?? patch.experienceTitle ?? 'experience'}-${patch.highlights.join('|')}`}
                          className='rounded border border-border/40 bg-background/30 p-2'
                        >
                          <div className='mb-1 text-xs font-medium text-gray-200'>
                            {formatExperiencePatchLabel(patch)}
                          </div>
                          <ul className='list-disc space-y-1 pl-4 text-xs leading-5 text-gray-300'>
                            {patch.highlights.map((highlight: string) => (
                              <li key={highlight}>{highlight}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : null}
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
              <section className='space-y-3 rounded-lg border border-border/50 bg-background/35 p-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h4 className='text-sm font-semibold text-white'>AI match analysis</h4>
            <p className='text-[11px] text-gray-500'>
              Uses the selected person profile, CV records, education, and full job posting.
            </p>
            <div className='mt-2 flex flex-wrap gap-1.5'>
              <Badge variant='outline'>
                {visibleApplication?.matchAnalysisModelId ?? 'gpt-oss:120b-cloud'}
              </Badge>
              <Badge variant={canRunMatchAnalysis ? 'success' : 'outline'}>
                {matchAnalysisContextStatus}
              </Badge>
              {displayedMatchAnalysisStatus !== null ? (
                <Badge
                  variant={displayedMatchAnalysisStatus === 'completed' ? 'success' : 'outline'}
                >
                  {displayedMatchAnalysisStatus}
                </Badge>
              ) : null}
              <Badge variant='outline'>Analysis only</Badge>
            </div>
            {!canRunMatchAnalysis && matchAnalysisDisabledReason !== null ? (
              <p className='mt-2 text-[11px] text-amber-200'>{matchAnalysisDisabledReason}</p>
            ) : null}
            {pendingMatchAnalysisRunId !== null ? (
              <p className='mt-1 text-[11px] text-blue-300'>
                Analysis queued.{' '}
                <a
                  href={`/admin/ai-paths/queue?tab=paths-all&query=${encodeURIComponent(
                    pendingMatchAnalysisRunId
                  )}&runId=${encodeURIComponent(pendingMatchAnalysisRunId)}&status=all`}
                  className='underline-offset-2 hover:underline'
                >
                  Open running run
                </a>
              </p>
            ) : null}
            {visibleApplicationMatchAnalysisUpdatedAt !== null &&
            visibleApplicationMatchAnalysisUpdatedAt.length > 0 ? (
              <p className='mt-1 text-[11px] text-emerald-300'>
                Last analysis: {formatTimestamp(visibleApplicationMatchAnalysisUpdatedAt)}
                {matchAnalysisHistory.length > 0 ? ` · ${matchAnalysisHistory.length} saved` : ''}
                {visibleApplicationMatchAnalysisSourceEntityId !== null &&
                visibleApplicationMatchAnalysisSourceEntityId.length > 0 ? (
                  <>
                    {' · '}
                    <a
                      href={`/admin/ai-paths/queue?tab=paths-all&query=${encodeURIComponent(
                        visibleApplicationMatchAnalysisSourceEntityId
                      )}&runId=${encodeURIComponent(
                        visibleApplicationMatchAnalysisSourceEntityId
                      )}&status=all`}
                      className='text-blue-300 underline-offset-2 hover:underline'
                    >
                      Open run
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <TriggerButtonBar
              location={JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_LOCATION}
              entityType='custom'
              entityId={
                visibleApplication?.canonicalApplicationKey ?? visibleApplication?.id ?? null
              }
              getEntityJson={getMatchAnalysisEntityJson}
              disabled={!canRunMatchAnalysis}
              showRunFeedback
              onRunQueued={({ runId }): void => {
                setPendingMatchAnalysisRunId(runId);
                scheduleMatchAnalysisRefreshes();
                toast('Match analysis queued.', { variant: 'success' });
              }}
              className='[&_button]:h-8 [&_button]:px-2 [&_button]:text-[11px] [&_button]:font-semibold'
            />
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 gap-1.5 px-2 text-[11px]'
              disabled={visibleApplication === null}
              onClick={(): void => onAnalysisRunQueued?.()}
              title={
                isMatchAnalysisStale
                  ? 'Refresh the application data, then rerun Analyze Match'
                  : 'Refresh prepared application analysis from database'
              }
            >
              <RefreshCw className='h-3.5 w-3.5' aria-hidden='true' />
              {isMatchAnalysisStale ? 'Refresh stale analysis' : 'Refresh'}
            </Button>
          </div>
        </div>
        {matchAnalysisContext.isLoading ? (
          <div className='flex items-center gap-2 rounded-md border border-border/50 bg-background/40 px-3 py-2 text-xs text-gray-400'>
            <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
            Loading selected person CV context...
          </div>
        ) : null}
        {matchAnalysisContext.error !== null ? (
          <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'>
            {matchAnalysisContext.error}
          </div>
        ) : null}
        {matchAnalysis !== null ? (
          <div className='space-y-3 rounded-md border border-emerald-500/25 bg-emerald-500/10 p-3'>
            <div className='flex flex-wrap items-end gap-2'>
              <span className='text-3xl font-semibold text-emerald-100'>
                {matchAnalysis.score ?? 'n/a'}
              </span>
              <span className='pb-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300'>
                {matchAnalysis.scoreLabel ?? 'Match score'}
              </span>
              {matchAnalysisScoreDeltaLabel !== null ? (
                <Badge variant={matchAnalysisScoreDelta !== null && matchAnalysisScoreDelta >= 0 ? 'success' : 'outline'}>
                  {matchAnalysisScoreDeltaLabel}
                </Badge>
              ) : null}
              <div className='flex flex-wrap gap-1 pb-1'>
                <Badge variant='outline'>{matchAnalysis.gaps.length} gaps</Badge>
                <Badge variant='outline'>{matchAnalysis.attentionAreas.length} actions</Badge>
                <Badge variant='outline'>{matchAnalysis.riskFlags.length} risks</Badge>
                <Badge variant='outline'>{matchAnalysisPrepWorkloadLabel}</Badge>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='ml-auto h-7 px-2 text-[11px]'
                onClick={handleCopyMatchAnalysis}
              >
                Copy summary
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-7 px-2 text-[11px]'
                onClick={handleCopyMatchPreparationPlan}
              >
                Copy prep plan
              </Button>
            </div>
            <div className='flex flex-wrap gap-1.5 text-[11px]'>
              <Badge variant='outline'>
                Model {visibleApplication?.matchAnalysisModelId ?? 'gpt-oss:120b-cloud'}
              </Badge>
              {displayedMatchAnalysisStatus !== null ? (
                <Badge variant={displayedMatchAnalysisStatus === 'completed' ? 'success' : 'outline'}>
                  {displayedMatchAnalysisStatus}
                </Badge>
              ) : null}
              {isMatchAnalysisStale ? (
                <Badge
                  variant='outline'
                  title='The prepared application changed after this analysis was generated.'
                >
                  stale
                </Badge>
              ) : null}
              {visibleApplicationMatchAnalysisUpdatedAt !== null &&
              visibleApplicationMatchAnalysisUpdatedAt.length > 0 ? (
                <Badge variant='outline'>
                  Updated {formatTimestamp(visibleApplicationMatchAnalysisUpdatedAt)}
                </Badge>
              ) : null}
              {matchAnalysisSnapshotLabel !== null ? (
                <Badge
                  variant='outline'
                  title='Prepared application timestamp used by this analysis'
                >
                  Snapshot {matchAnalysisSnapshotLabel}
                </Badge>
              ) : null}
              {visibleApplicationUpdatedLabel !== null ? (
                <Badge variant='outline' title='Current prepared application update timestamp'>
                  App {visibleApplicationUpdatedLabel}
                </Badge>
              ) : null}
            </div>
            <div className={`rounded-md border px-3 py-2 text-xs ${matchAnalysisReadinessClassName}`}>
              <div className='font-semibold uppercase tracking-[0.16em]'>
                Application readiness: {matchAnalysisReadinessLabel}
              </div>
              <p className='mt-1 leading-relaxed'>{matchAnalysisReadinessHint}</p>
            </div>
            <div className={`rounded-md border px-3 py-2 text-xs ${matchAnalysisDecisionClassName}`}>
              <div className='font-semibold uppercase tracking-[0.16em]'>
                Recommended decision: {matchAnalysisDecisionLabel}
              </div>
              <Badge variant='outline' className='mt-2'>
                {matchAnalysisDecisionSource}
              </Badge>
              {matchAnalysisDecisionChanged ? (
                <Badge variant='outline' className='mt-2'>
                  Changed from {previousMatchAnalysisDecision}
                </Badge>
              ) : null}
              <p className='mt-1 leading-relaxed'>{matchAnalysisDecisionHint}</p>
            </div>
            {matchAnalysis.summary !== null ? (
              <p className='text-sm leading-relaxed text-gray-200'>{matchAnalysis.summary}</p>
            ) : null}
            {matchAnalysis.changeSincePrevious !== null ? (
              <div className='rounded-md border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100'>
                <div className='font-semibold uppercase tracking-[0.16em]'>Change since previous</div>
                <p className='mt-1 leading-relaxed'>{matchAnalysis.changeSincePrevious}</p>
              </div>
            ) : null}
            {isMatchAnalysisStale ? (
              <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'>
                <div className='font-semibold uppercase tracking-[0.16em]'>
                  Analysis may be stale
                </div>
                <p className='mt-1 leading-relaxed'>
                  This prepared application was updated after the last match analysis. Rerun
                  Analyze Match before relying on the recommendation.
                </p>
                {matchAnalysisSnapshotLabel !== null ? (
                  <p className='mt-1 text-[11px] text-amber-200/80'>
                    Analyzed application snapshot: {matchAnalysisSnapshotLabel}
                  </p>
                ) : null}
              </div>
            ) : null}
            {matchAnalysis.gaps.length > 0 ||
            matchAnalysis.attentionAreas.length > 0 ||
            matchAnalysis.learningPlan.length > 0 ? (
              <div className='grid gap-2 md:grid-cols-3'>
                <div className='rounded-md border border-amber-500/25 bg-amber-500/10 p-2'>
                  <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300'>
                    Main gap
                  </div>
                  <p className='mt-1 text-xs text-gray-200'>
                    {matchAnalysis.gaps[0] ?? 'No major gap reported.'}
                  </p>
                </div>
                <div className='rounded-md border border-blue-500/25 bg-blue-500/10 p-2'>
                  <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300'>
                    First action
                  </div>
                  <p className='mt-1 text-xs text-gray-200'>
                    {matchAnalysis.attentionAreas[0]?.recommendedAction ??
                      matchAnalysis.attentionAreas[0]?.area ??
                      'No immediate action reported.'}
                  </p>
                </div>
                <div className='rounded-md border border-violet-500/25 bg-violet-500/10 p-2'>
                  <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300'>
                    Prep focus
                  </div>
                  <p className='mt-1 text-xs text-gray-200'>
                    {matchAnalysis.learningPlan[0] ?? 'No preparation plan reported.'}
                  </p>
                </div>
              </div>
            ) : null}
            {matchAnalysis.strongMatches.length > 0 ? (
              <div className='space-y-1'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300'>
                  Strong matches
                </div>
                <ul className='list-disc space-y-1 pl-4 text-xs text-gray-300'>
                  {matchAnalysis.strongMatches.map((item: string, index: number) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {matchAnalysis.gaps.length > 0 ? (
              <div className='space-y-1'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300'>
                  Gaps
                </div>
                <ul className='list-disc space-y-1 pl-4 text-xs text-gray-300'>
                  {matchAnalysis.gaps.map((item: string, index: number) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {matchAnalysis.cvEvidence.length > 0 || matchAnalysis.jobEvidence.length > 0 ? (
              <div className='grid gap-2 md:grid-cols-2'>
                {matchAnalysis.cvEvidence.length > 0 ? (
                  <div className='space-y-1 rounded-md border border-border/50 bg-background/35 p-2'>
                    <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300'>
                      CV evidence
                    </div>
                    <ul className='list-disc space-y-1 pl-4 text-xs text-gray-300'>
                      {matchAnalysis.cvEvidence.map((item: string, index: number) => (
                        <li key={`cv-evidence-${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {matchAnalysis.jobEvidence.length > 0 ? (
                  <div className='space-y-1 rounded-md border border-border/50 bg-background/35 p-2'>
                    <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300'>
                      Job evidence
                    </div>
                    <ul className='list-disc space-y-1 pl-4 text-xs text-gray-300'>
                      {matchAnalysis.jobEvidence.map((item: string, index: number) => (
                        <li key={`job-evidence-${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
            {matchAnalysis.attentionAreas.length > 0 ? (
              <div className='space-y-2'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300'>
                  Attention areas
                </div>
                {matchAnalysis.attentionAreas.map((area, index: number) => (
                  <div
                    key={`${area.area ?? 'attention'}-${index}`}
                    className='grid gap-2 rounded-md border border-border/50 bg-background/40 p-2 text-xs text-gray-300 md:grid-cols-[auto_1fr]'
                  >
                    <div className='flex h-6 w-6 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 text-[11px] font-semibold text-blue-200'>
                      {index + 1}
                    </div>
                    <div>
                      <div className='font-semibold text-white'>{area.area ?? 'Attention area'}</div>
                      {area.whyItMatters !== null ? <p>{area.whyItMatters}</p> : null}
                      {area.recommendedAction !== null ? (
                        <div className='mt-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-emerald-100'>
                          {area.recommendedAction}
                        </div>
                      ) : null}
                      {area.evidence !== null ? (
                        <p className='mt-1 text-[11px] text-gray-500'>{area.evidence}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {matchAnalysis.riskFlags.length > 0 ? (
              <div className='space-y-1'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300'>
                  Risk flags
                </div>
                <ul className='list-disc space-y-1 pl-4 text-xs text-gray-300'>
                  {matchAnalysis.riskFlags.map((item: string, index: number) => (
                    <li key={`risk-${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {matchAnalysis.interviewTalkingPoints.length > 0 ? (
              <div className='space-y-1'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300'>
                  Interview talking points
                </div>
                <ul className='list-disc space-y-1 pl-4 text-xs text-gray-300'>
                  {matchAnalysis.interviewTalkingPoints.map((item: string, index: number) => (
                    <li key={`talking-point-${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {matchAnalysis.learningPlan.length > 0 ? (
              <div className='space-y-1'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300'>
                  Preparation plan
                </div>
                <ul className='list-disc space-y-1 pl-4 text-xs text-gray-300'>
                  {matchAnalysis.learningPlan.map((item: string, index: number) => (
                    <li key={`learning-${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className='text-xs text-gray-500'>
            No match analysis yet. Run Analyze Match to score fit and surface preparation gaps.
          </p>
        )}
            {visibleMatchAnalysisHistory.length > 0 ? (
              <div className='space-y-2 rounded-md border border-border/50 bg-background/30 p-3'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500'>
                  Recent analysis history
                </div>
              {visibleMatchAnalysisHistory.map((entry, index: number) => {
                const payload = entry.payload;
                const firstGap = payload !== null ? payload.gaps[0] : null;
                const modelId = entry.modelId;
                const snapshot = entry.applicationUpdatedAtSnapshot;
                const sourceRunId = entry.sourceRunId;
                return (
              <div
                key={entry.id}
                className='rounded-md border border-border/40 bg-background/35 px-2 py-1.5 text-xs text-gray-300'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant={index === 0 ? 'success' : 'outline'}>
                    {index === 0 ? 'Latest' : `v${matchAnalysisHistory.length - index}`}
                  </Badge>
                  <span className='text-gray-500'>
                    {entry.createdAt !== null ? formatTimestamp(entry.createdAt) : 'Unknown time'}
                  </span>
                {modelId !== null && modelId.length > 0 ? (
                  <span className='text-gray-500'>{modelId}</span>
                ) : null}
                  {snapshot !== null && snapshot.length > 0 ? (
                    <span
                      className='text-gray-500'
                      title='Prepared application timestamp used for this analysis'
                    >
                      App {formatTimestamp(snapshot)}
                    </span>
                  ) : null}
                  <span className='font-semibold text-gray-100'>
                    {payload?.score ?? 'n/a'}
                    {payload?.scoreLabel !== null && payload.scoreLabel.length > 0
                      ? ` · ${payload.scoreLabel}`
                      : ''}
                  </span>
                  {payload?.recommendedDecision !== null ? (
                    <Badge
                      variant={
                        payload.recommendedDecision === 'Apply now' ? 'success' : 'outline'
                      }
                      title={
                        payload.recommendedDecisionReason !== null &&
                        payload.recommendedDecisionReason.length > 0
                          ? `AI recommendation: ${payload.recommendedDecisionReason}`
                          : 'AI recommendation'
                      }
                    >
                      {payload.recommendedDecision}
                    </Badge>
                  ) : null}
                </div>
                {payload?.summary !== null && payload.summary.length > 0 ? (
                  <p className='mt-1 line-clamp-2 text-gray-400'>{payload.summary}</p>
                ) : null}
                {payload?.recommendedDecisionReason !== null &&
                payload.recommendedDecisionReason.length > 0 ? (
                  <p className='mt-1 line-clamp-1 text-[11px] text-gray-400'>
                    Decision: {payload.recommendedDecisionReason}
                  </p>
                ) : null}
                {payload?.changeSincePrevious !== null && payload.changeSincePrevious.length > 0 ? (
                  <p className='mt-1 line-clamp-1 text-[11px] text-cyan-200'>
                    Change: {payload.changeSincePrevious}
                  </p>
                ) : null}
                {isNonEmptyString(firstGap) ? (
                  <p className='mt-1 line-clamp-1 text-[11px] text-amber-200'>
                    Gap: {firstGap}
                  </p>
                ) : null}
                {sourceRunId !== null && sourceRunId.length > 0 ? (
                  <a
                    href={`/admin/ai-paths/queue?tab=paths-all&query=${encodeURIComponent(
                      sourceRunId
                    )}&runId=${encodeURIComponent(entry.sourceRunId)}&status=all`}
                    className='mt-1 inline-flex text-[11px] text-blue-300 underline-offset-2 hover:underline'
                  >
                    Open AI-Paths run
                  </a>
                ) : null}
              </div>
              );
              })}
            </div>
        ) : null}
      </section>
      <PreparedApplicationVersionHistory
                applicationEmailVersions={applicationEmailVersions}
                coverLetterVersions={coverLetterVersions}
                cvVersions={cvVersions}
                selectedApplicationEmailVersionId={selectedApplicationEmailVersionId}
                selectedCoverLetterVersionId={selectedCoverLetterVersionId}
                selectedCvVersionId={selectedCvVersionId}
                onApplicationEmailSelect={handleApplicationEmailVersionChange}
                onCoverLetterSelect={handleCoverLetterVersionChange}
                onCvSelect={handleCvVersionChange}
              />

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
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const { jobListings, organization } = useAdminFilemakerOrganizationEditPageStateContext();
  const { setJobListings } = useAdminFilemakerOrganizationEditPageActionsContext();
  const [applicationListingId, setApplicationListingId] = useState<string | null>(null);
  const [jobApplicationRunEntries, setJobApplicationRunEntries] = useState<
    JobApplicationRunEntry[]
  >(readStoredJobApplicationRunEntries);
  const [selectedPreparedApplicationId, setSelectedPreparedApplicationId] = useState<string | null>(
    null
  );
  const [collapsingLegacyJobListingId, setCollapsingLegacyJobListingId] = useState<string | null>(
    null
  );
  const [markingAppliedJobListingId, setMarkingAppliedJobListingId] = useState<string | null>(
    null
  );
  const [isMutatingApplication, setIsMutatingApplication] = useState(false);
  const [applicationsState, setApplicationsState] = useState<JobApplicationsState>({
    applications: [],
    error: null,
    isLoading: false,
  });
  const lastSettingsRefreshListingIdRef = useRef<string | null>(null);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawJobApplicationSettings = settingsStore.get(FILEMAKER_JOB_APPLICATION_SETTINGS_KEY);
  const isJobApplicationSettingsLoading = applicationListingId !== null && settingsStore.isLoading;
  const organizationId = organization?.id ?? '';
  const organizationName = organization?.name ?? '';
  useEffect(() => {
    if (applicationListingId === null) {
      lastSettingsRefreshListingIdRef.current = null;
      return;
    }
    if (lastSettingsRefreshListingIdRef.current === applicationListingId) return;
    lastSettingsRefreshListingIdRef.current = applicationListingId;
    settingsStore.refetch();
  }, [applicationListingId, settingsStore]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        JOB_APPLICATION_RUN_ENTRIES_STORAGE_KEY,
        JSON.stringify(jobApplicationRunEntries.slice(0, JOB_APPLICATION_RUN_ENTRY_LIMIT))
      );
    } catch (error) {
      logClientError(error);
    }
  }, [jobApplicationRunEntries]);
  const filemakerDatabase = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const jobApplicationSettings = useMemo(
    () => parseFilemakerJobApplicationSettings(rawJobApplicationSettings),
    [rawJobApplicationSettings]
  );
  const defaultApplicationPersonId = jobApplicationSettings.defaultPersonId.trim();
  const defaultApplicationPersonName = jobApplicationSettings.defaultPersonName.trim();
  const defaultApplicationPersonLabel =
    defaultApplicationPersonName.length > 0
      ? defaultApplicationPersonName
      : defaultApplicationPersonId;
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
  const applicationsByJobListingRawId = useMemo(
    () => groupApplicationsByJobListingId(applicationsState.applications),
    [applicationsState.applications]
  );
  const preparedApplications = useMemo(
    () => Array.from(applicationsByJobListingId.values()).flat(),
    [applicationsByJobListingId]
  );
  const preparedApplicationsById = useMemo(
    () =>
      new Map(
        preparedApplications.map(
          (application: PreparedJobApplication): [string, PreparedJobApplication] => [
            application.id,
            application,
          ]
        )
      ),
    [preparedApplications]
  );
  const selectedPreparedApplication = useMemo(
    () =>
      selectedPreparedApplicationId !== null
        ? preparedApplicationsById.get(selectedPreparedApplicationId) ?? null
        : null,
    [preparedApplicationsById, selectedPreparedApplicationId]
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
  const handleJobApplicationRunEntryChange = useCallback((entry: JobApplicationRunEntry): void => {
    setJobApplicationRunEntries((current: JobApplicationRunEntry[]): JobApplicationRunEntry[] => [
      entry,
      ...current.filter((candidate: JobApplicationRunEntry): boolean => candidate.id !== entry.id),
    ]);
  }, []);

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
          )}&limit=100&normalizeLegacy=1`,
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

  useEffect(() => {
    if (organizationId.trim().length === 0) return undefined;
    const pollableEntries = jobApplicationRunEntries.filter(
      (entry: JobApplicationRunEntry): boolean =>
        entry.context.organizationId === organizationId &&
        entry.runId !== null &&
        JOB_APPLICATION_ACTIVE_RUN_STATUSES.has(entry.status)
    );
    if (pollableEntries.length === 0) return undefined;

    const controller = new AbortController();
    let isDisposed = false;
    let isPolling = false;

    const pollEntries = (): Promise<void> => {
      if (isPolling) return Promise.resolve();
      isPolling = true;
      return (async (): Promise<void> => {
        const updates = await Promise.all(
          pollableEntries.map(
            async (entry: JobApplicationRunEntry): Promise<JobApplicationRunEntry | null> => {
              if (entry.runId === null) return null;
              try {
                const response = await getAiPathRun(entry.runId, {
                  cache: 'no-store',
                  signal: controller.signal,
                  timeoutMs: 10_000,
                });
                if (!response.ok) return null;
                const run = readRecord(response.data.run);
                return run !== null ? resolvePolledJobApplicationRunEntry(entry, run) : null;
              } catch (error) {
                if (!controller.signal.aborted) logClientError(error);
                return null;
              }
            }
          )
        );
        if (isDisposed || controller.signal.aborted) return;

        const updatesById = new Map(
          updates
            .filter((entry): entry is JobApplicationRunEntry => entry !== null)
            .map((entry: JobApplicationRunEntry): [string, JobApplicationRunEntry] => [entry.id, entry])
        );
        if (updatesById.size === 0) return;

        const shouldReloadApplications = Array.from(updatesById.values()).some(
          (update: JobApplicationRunEntry): boolean =>
            update.status === 'completed' &&
            pollableEntries.some(
              (entry: JobApplicationRunEntry): boolean =>
                entry.id === update.id && entry.status !== 'completed'
            )
        );
        setJobApplicationRunEntries((current: JobApplicationRunEntry[]): JobApplicationRunEntry[] => {
          const next = current.map((entry: JobApplicationRunEntry): JobApplicationRunEntry => {
            const update = updatesById.get(entry.id);
            if (update === undefined) return entry;
            if (
              entry.status === update.status &&
              entry.error === update.error &&
              entry.updatedAt === update.updatedAt
            ) {
              return entry;
            }
            return update;
          });
          return next.some(
            (entry: JobApplicationRunEntry, index: number): boolean => entry !== current[index]
          )
            ? next
            : current;
        });
        if (shouldReloadApplications) {
          void loadApplications();
        }
      })().finally(() => {
        isPolling = false;
      });
    };

    const triggerPollEntries = (): void => {
      pollEntries().catch((error: unknown): void => {
        if (!controller.signal.aborted) {
          logClientError(error);
        }
      });
    };

    triggerPollEntries();
    const intervalId = safeSetInterval(triggerPollEntries, JOB_APPLICATION_RUN_POLL_INTERVAL_MS);
    return () => {
      isDisposed = true;
      controller.abort();
      safeClearInterval(intervalId);
    };
  }, [jobApplicationRunEntries, loadApplications, organizationId]);

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
        const targetApplicationIds =
          preparedApplicationsById.get(applicationId)?.applicationIds ?? [applicationId];
        const nextApplications = await Promise.all(
          targetApplicationIds.map(async (targetApplicationId: string): Promise<FilemakerJobApplication> => {
            const response = await fetch(
              `/api/filemaker/job-applications/${encodeURIComponent(targetApplicationId)}`,
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
            if (payload.application === undefined) {
              throw new Error('Application update response did not include an application.');
            }
            return payload.application;
          })
        );
        const nextApplicationsById = new Map(
          nextApplications.map(
            (application: FilemakerJobApplication): [string, FilemakerJobApplication] => [
              application.id,
              application,
            ]
          )
        );
        if (nextApplicationsById.size > 0) {
          setApplicationsState((current: JobApplicationsState): JobApplicationsState => ({
            ...current,
            applications: current.applications.map(
              (application: FilemakerJobApplication): FilemakerJobApplication =>
                nextApplicationsById.get(application.id) ?? application
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
    [preparedApplicationsById]
  );

  const handleApplicationActiveArtifactsChange = useCallback(
    async (
      applicationId: string,
      activeArtifacts: FilemakerJobApplicationActiveArtifacts
    ): Promise<void> => {
      setIsMutatingApplication(true);
      try {
        const response = await fetch(
          `/api/filemaker/job-applications/${encodeURIComponent(applicationId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activeArtifacts }),
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to update active application versions (${response.status}).`);
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
          error:
            error instanceof Error
              ? error.message
              : 'Failed to update active application versions.',
        }));
      } finally {
        setIsMutatingApplication(false);
      }
    },
    []
  );

  const handleRemoveLogEntry = useCallback(
    async (applicationId: string, logEntryId: string): Promise<void> => {
      const response = await fetch(
        `/api/filemaker/job-applications/${encodeURIComponent(applicationId)}`,
        {
          method: 'PATCH',
          headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ removeLogEntryId: logEntryId }),
        }
      );
      if (!response.ok) {
        toast(`Failed to remove log entry (${response.status}).`, { variant: 'error' });
        return;
      }
      const payload = (await response.json()) as { application?: FilemakerJobApplication };
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
    },
    [toast]
  );

  const handleCollapseLegacyApplications = useCallback(
    async (jobListingId: string): Promise<void> => {
      if (organizationId.trim().length === 0 || jobListingId.trim().length === 0) return;
      const shouldCollapse = window.confirm(
        'Collapse legacy generated rows for this job listing into one prepared application container? The separate legacy rows are removed after their CV, cover letter, and email versions are copied into version history.'
      );
      if (!shouldCollapse) return;
      setCollapsingLegacyJobListingId(jobListingId);
      try {
        const response = await fetch('/api/filemaker/job-applications/collapse-legacy', {
          method: 'POST',
          headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ organizationId, jobListingId }),
        });
        if (!response.ok) {
          throw new Error(`Failed to collapse legacy applications (${response.status}).`);
        }
        const payload = (await response.json()) as {
          canonicalApplicationsCreated?: number;
          canonicalApplicationsUpdated?: number;
          legacyApplicationsDeleted?: number;
          legacyGroupsSkipped?: number;
        };
        const createdCount = payload.canonicalApplicationsCreated ?? 0;
        const updatedCount = payload.canonicalApplicationsUpdated ?? 0;
        const deletedCount = payload.legacyApplicationsDeleted ?? 0;
        const skippedCount = payload.legacyGroupsSkipped ?? 0;
        const containerCount = createdCount + updatedCount;
        await loadApplications();
        toast(
          `Collapsed ${deletedCount} legacy row${deletedCount === 1 ? '' : 's'} into ${containerCount} application container${containerCount === 1 ? '' : 's'} (${createdCount} created, ${updatedCount} updated${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}).`,
          { variant: 'success' }
        );
      } catch (error: unknown) {
        logClientError(error);
        setApplicationsState((current: JobApplicationsState): JobApplicationsState => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to collapse legacy applications.',
        }));
      } finally {
        setCollapsingLegacyJobListingId(null);
      }
    },
    [loadApplications, organizationId, toast]
  );

  const handleManualAppliedMark = useCallback(
    async (
      listing: FilemakerJobListing,
      manualAppliedRemovalTarget?: ManualAppliedLogRemovalTarget | null
    ): Promise<void> => {
      const personId = defaultApplicationPersonId.trim();
      if (organizationId.trim().length === 0 || listing.id.trim().length === 0) return;
      if (personId.length === 0) {
        toast('Set a Filemaker default person before marking a job as applied.', {
          variant: 'error',
        });
        return;
      }

      const isUnmarkingManualApplication =
        manualAppliedRemovalTarget !== undefined && manualAppliedRemovalTarget !== null;
      setMarkingAppliedJobListingId(listing.id);

      try {
        const response = isUnmarkingManualApplication
          ? await fetch(
              `/api/filemaker/job-applications/${encodeURIComponent(
                manualAppliedRemovalTarget.applicationId
              )}`,
              {
                method: 'PATCH',
                headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                  removeLogEntryId: manualAppliedRemovalTarget.logEntryId,
                  status: 'draft',
                }),
              }
            )
          : await fetch('/api/filemaker/job-applications', {
              method: 'POST',
              headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({
                action: 'mark_applied_manual',
                jobListingId: listing.id,
                jobTitle: listing.title,
                organizationId,
                organizationName,
                personId,
                personName: defaultApplicationPersonName,
                sourceSite: listing.sourceSite ?? null,
                sourceUrl: listing.sourceUrl ?? null,
              }),
            });
        if (!response.ok) {
          throw new Error(
            isUnmarkingManualApplication
              ? `Failed to unmark application (${response.status}).`
              : `Failed to mark application as applied (${response.status}).`
          );
        }

        const payload =
          isUnmarkingManualApplication
            ? ((await response.json()) as { application?: FilemakerJobApplication })
            : ((await response.json()) as ManualAppliedJobApplicationResponse);
        const nextApplication = payload.application;
        if (nextApplication !== undefined) {
          setApplicationsState((current: JobApplicationsState): JobApplicationsState => {
            const existingIndex = current.applications.findIndex(
              (application: FilemakerJobApplication): boolean => application.id === nextApplication.id
            );
            if (existingIndex === -1) {
              return {
                ...current,
                applications: [nextApplication, ...current.applications],
              };
            }
            return {
              ...current,
              applications: current.applications.map(
                (application: FilemakerJobApplication): FilemakerJobApplication =>
                  application.id === nextApplication.id ? nextApplication : application
              ),
            };
          });
        }

        await loadApplications();
        const targetPersonName =
          defaultApplicationPersonLabel.length > 0 ? defaultApplicationPersonLabel : personId;
        toast(
          isUnmarkingManualApplication
            ? `Unmarked applied for ${targetPersonName}.`
            : `Marked applied for ${targetPersonName}.`,
          { variant: 'success' }
        );
      } catch (error: unknown) {
        logClientError(error);
        const manualApplicationFailureMessage = isUnmarkingManualApplication
          ? 'Failed to unmark job listing application.'
          : 'Failed to mark job listing as applied.';
        setApplicationsState((current: JobApplicationsState): JobApplicationsState => ({
          ...current,
          error:
            error instanceof Error ? error.message : manualApplicationFailureMessage,
        }));
        const applicationErrorMessage = error instanceof Error ? error.message : manualApplicationFailureMessage;
        toast(
          applicationErrorMessage,
          { variant: 'error' }
        );
      } finally {
        setMarkingAppliedJobListingId(null);
      }
    },
    [
      defaultApplicationPersonId,
      defaultApplicationPersonLabel,
      defaultApplicationPersonName,
      loadApplications,
      organizationName,
      organizationId,
      toast,
    ]
  );

  const handleApplicationDelete = useCallback(async (applicationId: string): Promise<void> => {
    setIsMutatingApplication(true);
    try {
      const targetApplicationIds =
        preparedApplicationsById.get(applicationId)?.applicationIds ?? [applicationId];
      await Promise.all(
        targetApplicationIds.map(async (targetApplicationId: string): Promise<void> => {
          const response = await fetch(
            `/api/filemaker/job-applications/${encodeURIComponent(targetApplicationId)}`,
            { method: 'DELETE', headers: withCsrfHeaders({}) }
          );
          if (!response.ok) {
            throw new Error(`Failed to delete application (${response.status}).`);
          }
        })
      );
      const deletedIds = new Set(targetApplicationIds);
      setApplicationsState((current: JobApplicationsState): JobApplicationsState => ({
        ...current,
        applications: current.applications.filter(
          (application: FilemakerJobApplication): boolean => !deletedIds.has(application.id)
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
  }, [preparedApplicationsById]);

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
            const rawApplications = applicationsByJobListingRawId.get(listing.id) ?? [];
            const manualAppliedLogRemovalTarget = getManualAppliedLogRemovalTarget(
              rawApplications,
              defaultApplicationPersonId
            );
            const isAppliedForDefaultPerson =
              defaultApplicationPersonId.length > 0 &&
              rawApplications.some(
                (application: FilemakerJobApplication): boolean =>
                  application.status === 'applied' &&
                  application.personId.trim() === defaultApplicationPersonId
              );
            const manualAppliedStatusOnlyTarget = isAppliedForDefaultPerson
              ? getManualAppliedStatusOnlyTarget(rawApplications, defaultApplicationPersonId)
              : null;
            const manualAppliedRemovalTarget =
              manualAppliedLogRemovalTarget ?? manualAppliedStatusOnlyTarget;
            const canUnmarkManualApplied = manualAppliedRemovalTarget !== null;
            const hasAppliedApplication = rawApplications.some(
              (application: FilemakerJobApplication): boolean => application.status === 'applied'
            );
            const isMarkingApplied = markingAppliedJobListingId === listing.id;
            const canMarkAppliedManually =
              defaultApplicationPersonId.length > 0 &&
              (!isAppliedForDefaultPerson || canUnmarkManualApplied) &&
              !applicationsState.isLoading &&
              !isMarkingApplied;
            let manualAppliedButtonTitle = `Mark applied for ${defaultApplicationPersonLabel}`;
            if (defaultApplicationPersonId.length === 0) {
              manualAppliedButtonTitle =
                'Set a Filemaker default person before marking applications manually';
            } else if (isAppliedForDefaultPerson && !canUnmarkManualApplied) {
              manualAppliedButtonTitle = `Already applied for ${defaultApplicationPersonLabel}`;
            } else if (isAppliedForDefaultPerson && canUnmarkManualApplied) {
              manualAppliedButtonTitle = `Unmark applied for ${defaultApplicationPersonLabel}`;
            }
            const runEntries = jobApplicationRunEntries.filter(
              (entry: JobApplicationRunEntry): boolean =>
                entry.context.organizationId === organization.id &&
                entry.context.jobListingId === listing.id
            );
            const targeted = listing.targetedCampaignIds.length > 0;
            return (
              <div
                key={listing.id}
                id={`job-listing-${encodeURIComponent(listing.id)}`}
                className='space-y-4 rounded-md border border-border/60 bg-card/20 p-4'
              >
                <div className='flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3'>
                  <div className='flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200'>
                    <FileText className='h-3.5 w-3.5' aria-hidden='true' />
                    Prepare application
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 gap-1.5'
                      onClick={(): void => {
                        void handleManualAppliedMark(
                          listing,
                          isAppliedForDefaultPerson ? manualAppliedRemovalTarget : null
                        );
                      }}
                      disabled={!canMarkAppliedManually}
                      aria-label={`Mark applied manually for ${
                        listing.title.trim().length > 0
                          ? listing.title
                          : `Job listing ${index + 1}`
                      }`}
                      title={manualAppliedButtonTitle}
                    >
                      {isMarkingApplied ? (
                        <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
                      ) : (
                        <CheckCircle2 className='h-3.5 w-3.5' aria-hidden='true' />
                      )}
                      {isAppliedForDefaultPerson ? 'Applied' : 'Mark applied'}
                    </Button>
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
                  </div>
                </div>

                <JobApplicationRunStatusBadges entries={runEntries} />

                <JobApplicationsInline
                  applications={applications}
                  jobListing={listing}
                  isCollapsingLegacy={collapsingLegacyJobListingId === listing.id}
                  onCollapseLegacy={(jobListingId: string): void => {
                    void handleCollapseLegacyApplications(jobListingId);
                  }}
                  onDelete={(applicationId: string): void => {
                    void handleApplicationDelete(applicationId);
                  }}
                  onOpenApplication={setSelectedPreparedApplicationId}
                  onRemoveLogEntry={(applicationId: string, logEntryId: string): void => {
                    void handleRemoveLogEntry(applicationId, logEntryId);
                  }}
                />

                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='flex min-w-0 flex-wrap items-center gap-2'>
                    <Badge variant={targeted ? 'success' : 'warning'}>
                      {targeted ? 'Targeted' : 'Not targeted'}
                    </Badge>
                    {hasAppliedApplication ? <Badge variant='success'>Applied</Badge> : null}
                    <span className='min-w-0 text-sm font-medium text-gray-100'>
                      {listing.title.trim().length > 0
                        ? listing.title
                        : `Job listing ${index + 1}`}
                    </span>
                    <JobBoardOriginBadge
                      compact
                      sourceSite={listing.sourceSite}
                      sourceUrl={listing.sourceUrl}
                    />
                    <span className='text-xs text-gray-500'>{formatSalary(listing)}</span>
                    {(listing.postedAt ?? '').trim().length > 0 ? (
                      <Badge variant='outline'>Posted {listing.postedAt}</Badge>
                    ) : null}
                    {(listing.expiresAt ?? '').trim().length > 0 ? (
                      <Badge variant='outline'>Expires {listing.expiresAt}</Badge>
                    ) : null}
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
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
                  <FormField label='Scrape source portal'>
                    <Input
                      value={listing.sourceSite ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { sourceSite: event.target.value })
                      }
                      placeholder='pracuj.pl'
                      aria-label={`Job listing ${index + 1} scrape source portal`}
                    />
                  </FormField>
                  <FormField label='Scrape source URL' className='md:col-span-2'>
                    <Input
                      value={listing.sourceUrl ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { sourceUrl: event.target.value })
                      }
                      placeholder='https://...'
                      aria-label={`Job listing ${index + 1} scrape source URL`}
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
              </div>
            );
          })}
        </div>
      )}
      <JobApplicationPreparationModal
        filemakerDatabase={filemakerDatabase}
        initialJobListingId={applicationListingId}
        isOpen={applicationListingId !== null}
        isJobApplicationSettingsLoading={isJobApplicationSettingsLoading}
        jobListings={jobListings}
        jobApplicationSettings={jobApplicationSettings}
        onClose={(): void => setApplicationListingId(null)}
        onCreated={(): void => {
          void loadApplications();
        }}
        onRunEntryChange={handleJobApplicationRunEntryChange}
        organization={organization}
        runEntries={jobApplicationRunEntries}
      />
      <ApplicationPackageModal
        application={selectedPreparedApplication}
        isMutating={isMutatingApplication}
        jobListing={selectedPreparedJobListing}
        onClose={(): void => setSelectedPreparedApplicationId(null)}
        onDelete={(applicationId: string): void => {
          void handleApplicationDelete(applicationId);
        }}
        onActiveArtifactsChange={(
          applicationId: string,
          activeArtifacts: FilemakerJobApplicationActiveArtifacts
        ): void => {
          void handleApplicationActiveArtifactsChange(applicationId, activeArtifacts);
        }}
        onRemoveLogEntry={(applicationId: string, logEntryId: string): void => {
          void handleRemoveLogEntry(applicationId, logEntryId);
        }}
        onStatusChange={(applicationId: string, status: FilemakerJobApplicationStatus): void => {
          void handleApplicationStatusChange(applicationId, status);
        }}
        onAnalysisRunQueued={(): void => {
          void loadApplications();
        }}
      />
    </FormSection>
  );
}
