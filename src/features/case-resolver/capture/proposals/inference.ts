/* eslint-disable complexity, max-lines-per-function, max-params, no-nested-ternary, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions -- Capture proposal inference keeps role, address, and document-date heuristics together. */

import type { FilemakerDatabaseDto as FilemakerDatabase } from '@/shared/contracts/filemaker';
import type {
  PromptExploderCaseResolverMetadata,
  PromptExploderCaseResolverPartyBundle,
  PromptExploderCaseResolverPartyCandidate,
} from '@/shared/contracts/prompt-exploder';
import {
  composeCandidateStreetNumber,
  findExistingFilemakerAddressId,
  findExistingFilemakerPartyReference,
  normalizeCaseResolverComparable,
  extractCaseResolverDocumentDate,
} from '@/features/case-resolver/public';
import {
  inferCandidateRoleFromLabels,
  areEquivalentCandidates,
} from '@/features/case-resolver/services/capture';

import type {
  CaseResolverCaptureAction,
  CaseResolverCaptureRole,
  CaseResolverCaptureRoleMapping,
  CaseResolverCaptureSettings,
} from '../settings';
import type {
  CaseResolverCaptureProposal,
  CaseResolverCaptureProposalState,
  CaseResolverCaptureDocumentDateProposal,
  CaseResolverCaptureProposalMatchKind,
} from './types';

const resolvePreferredRoleForEquivalentCandidates = (
  addresserCandidate: PromptExploderCaseResolverPartyCandidate,
  addresseeCandidate: PromptExploderCaseResolverPartyCandidate
): CaseResolverCaptureRole => {
  const addresserLabelRole = inferCandidateRoleFromLabels(addresserCandidate);
  const addresseeLabelRole = inferCandidateRoleFromLabels(addresseeCandidate);

  if (addresserLabelRole === 'addressee' && addresseeLabelRole !== 'addresser') {
    return 'addressee';
  }
  if (addresseeLabelRole === 'addresser' && addresserLabelRole !== 'addressee') {
    return 'addresser';
  }

  const hasOrganizationSignal = (candidate: PromptExploderCaseResolverPartyCandidate): boolean =>
    candidate.kind === 'organization' ||
    normalizeCaseResolverComparable(candidate.organizationName ?? '').length > 0;

  if (hasOrganizationSignal(addresserCandidate) || hasOrganizationSignal(addresseeCandidate)) {
    return 'addressee';
  }

  return 'addresser';
};

const buildCaseResolverCaptureProposal = (args: {
  sourceRole: CaseResolverCaptureRole;
  targetRole: CaseResolverCaptureRole;
  candidate: PromptExploderCaseResolverPartyCandidate;
  mapping: CaseResolverCaptureRoleMapping;
  database: FilemakerDatabase;
}): CaseResolverCaptureProposal | null => {
  if (!args.mapping.enabled) return null;
  if (!(args.candidate.rawText ?? '').trim() && !(args.candidate.displayName ?? '').trim())
    return null;

  const existingReference = args.mapping.autoMatchPartyReference
    ? findExistingFilemakerPartyReference(args.database, args.candidate)
    : null;

  const existingAddressId = args.mapping.autoMatchAddress
    ? findExistingFilemakerAddressId(args.database, {
      street: args.candidate.street ?? '',
      streetNumber: composeCandidateStreetNumber(args.candidate),
      city: args.candidate.city ?? '',
      postalCode: args.candidate.postalCode ?? '',
      country: args.candidate.country ?? '',
      countryId: '',
    })
    : null;

  const hasAddressCandidate = Boolean(
    (args.candidate.street ?? '').trim() ||
    composeCandidateStreetNumber(args.candidate).trim() ||
    (args.candidate.city ?? '').trim() ||
    (args.candidate.postalCode ?? '').trim() ||
    (args.candidate.country ?? '').trim()
  );

  const matchKind: CaseResolverCaptureProposalMatchKind =
    existingReference && existingAddressId
      ? 'party_and_address'
      : existingReference
        ? 'party'
        : existingAddressId
          ? 'address'
          : 'none';

  const action: CaseResolverCaptureAction = (() => {
    if (matchKind === 'party' || matchKind === 'party_and_address') {
      return 'useMatched';
    }
    if (hasAddressCandidate || matchKind === 'address') {
      return 'createInFilemaker';
    }
    if (
      args.mapping.defaultAction === 'createInFilemaker' ||
      args.mapping.defaultAction === 'ignore'
    ) {
      return args.mapping.defaultAction;
    }
    if (args.mapping.defaultAction === 'keepText') {
      return 'keepText';
    }
    return 'keepText';
  })();

  return {
    role: args.targetRole,
    sourceRole: args.sourceRole,
    candidate: args.candidate,
    existingReference: existingReference
      ? {
        kind: existingReference.kind,
        id: String(existingReference.id),
        name: existingReference.displayName,
      }
      : null,
    existingAddressId,
    matchKind,
    hasAddressCandidate,
    action,
  };
};

export const buildCaseResolverCaptureProposalState = (
  payload: PromptExploderCaseResolverPartyBundle | undefined,
  targetFileId: string,
  database: FilemakerDatabase,
  settings: CaseResolverCaptureSettings,
  options?: {
    metadata?: PromptExploderCaseResolverMetadata | null | undefined;
    sourceText?: string | null | undefined;
    currentDocumentDate?: string | null | undefined;
  }
): CaseResolverCaptureProposalState | null => {
  if (!settings.enabled) return null;

  const resolvedCandidates: Partial<
    Record<CaseResolverCaptureRole, PromptExploderCaseResolverPartyCandidate>
  > = {
    ...(payload?.addresser ? { addresser: payload.addresser } : {}),
    ...(payload?.addressee ? { addressee: payload.addressee } : {}),
  };

  if (
    resolvedCandidates.addresser &&
    resolvedCandidates.addressee &&
    areEquivalentCandidates(resolvedCandidates.addresser, resolvedCandidates.addressee)
  ) {
    const preferredRole = resolvePreferredRoleForEquivalentCandidates(
      resolvedCandidates.addresser,
      resolvedCandidates.addressee
    );
    if (preferredRole === 'addressee') {
      delete resolvedCandidates.addresser;
    } else {
      delete resolvedCandidates.addressee;
    }
  }
  const proposals: Record<CaseResolverCaptureRole, CaseResolverCaptureProposal | null> = {
    addresser: null,
    addressee: null,
    subject: null,
    reference: null,
    other: null,
  };

  (Object.keys(resolvedCandidates) as CaseResolverCaptureRole[]).forEach((sourceRole) => {
    const candidate = resolvedCandidates[sourceRole];
    if (!candidate) return;

    const mapping = settings.roleMappings[sourceRole];
    if (!mapping) return;
    const targetRole = mapping.targetRole || sourceRole;
    const proposal = buildCaseResolverCaptureProposal({
      sourceRole,
      targetRole,
      candidate,
      mapping,
      database,
    });
    if (!proposal) return;

    const current = proposals[targetRole];
    // If two source roles map to the same target role, prefer the direct role mapping.
    if (!current || sourceRole === targetRole) {
      proposals[targetRole] = proposal;
    }
  });

  const normalizeDateToken = (value: string): string => value.replace(/[^\d]/g, '');

  const normalizeYear = (value: string): string => {
    const digits = normalizeDateToken(value);
    if (digits.length === 2) {
      return `20${digits}`;
    }
    return digits;
  };

  const metadataPlaceDate = options?.metadata?.placeDate;
  const metadataDate = (() => {
    if (!metadataPlaceDate?.year || !metadataPlaceDate.month || !metadataPlaceDate.day) return null;
    const year = normalizeYear(metadataPlaceDate.year);
    const month = normalizeDateToken(metadataPlaceDate.month).padStart(2, '0');
    const day = normalizeDateToken(metadataPlaceDate.day).padStart(2, '0');
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) return null;
    return extractCaseResolverDocumentDate(`${year}-${month}-${day}`);
  })();

  const sourceText = options?.sourceText?.trim() ?? '';
  const sourceTextDate = sourceText ? extractCaseResolverDocumentDate(sourceText) : null;
  const detectedDate = metadataDate ?? sourceTextDate;
  const detectedDateSource: CaseResolverCaptureDocumentDateProposal['source'] | null =
    metadataDate !== null ? 'metadata' : sourceTextDate !== null ? 'text' : null;
  const cityHint = metadataPlaceDate?.city?.trim() || null;
  const sourceDateLine = (() => {
    if (!detectedDate || !sourceText) return null;
    const lines = sourceText.split(/\r?\n/).map((line: string): string => line.trim());
    const normalizedCityHint = cityHint ? normalizeCaseResolverComparable(cityHint) : '';
    for (const line of lines) {
      if (!line) continue;
      const extracted = extractCaseResolverDocumentDate(line);
      if (extracted !== detectedDate) continue;
      if (
        normalizedCityHint &&
        !normalizeCaseResolverComparable(line).includes(normalizedCityHint)
      ) {
        continue;
      }
      return line;
    }
    return null;
  })();
  const sourceDateLineCity = (() => {
    if (!sourceDateLine) return null;
    const withoutDate = sourceDateLine
      .replace(
        /\b(?:\d{4}[.\-/](?:0?[1-9]|1[0-2])[.\-/](?:0?[1-9]|[12]\d|3[01])|(?:0?[1-9]|[12]\d|3[01])[.\-/](?:0?[1-9]|1[0-2])[.\-/](?:\d{2}|\d{4})|(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:\d{2}|\d{4}))\b/gi,
        ' '
      )
      .replace(/\b(dnia|z dnia)\b/gi, ' ')
      .replace(/[,\s]+/g, ' ')
      .trim();
    return withoutDate.length > 0 ? withoutDate : null;
  })();
  const resolvedDocumentCity = cityHint || sourceDateLineCity;

  const documentDateProposal: CaseResolverCaptureDocumentDateProposal | null =
    detectedDate && detectedDateSource
      ? {
        isoDate: detectedDate,
        source: detectedDateSource,
        sourceLine: sourceDateLine,
        cityHint,
        city: resolvedDocumentCity,
        action: 'useDetectedDate',
      }
      : null;

  if (!proposals.addresser && !proposals.addressee && !documentDateProposal) return null;
  return {
    targetFileId,
    addresser: proposals.addresser,
    addressee: proposals.addressee,
    documentDate: documentDateProposal,
  };
};
