import {
  composeCandidateStreetNumber,
  findExistingFilemakerAddressId,
  findExistingFilemakerPartyReference,
  normalizeCaseResolverComparable,
} from '@/features/case-resolver/party-matching';
import { extractCaseResolverDocumentDate } from '@/features/case-resolver/settings';
import type { CaseResolverPartyReference } from '@/features/case-resolver/types';
import type { FilemakerDatabase } from '@/features/filemaker/types';
import type {
  PromptExploderCaseResolverMetadata,
  PromptExploderCaseResolverPartyBundle,
  PromptExploderCaseResolverPartyCandidate,
} from '@/features/prompt-exploder/bridge';

import type {
  CaseResolverCaptureAction,
  CaseResolverCaptureRole,
  CaseResolverCaptureRoleMapping,
  CaseResolverCaptureSettings,
} from './settings';

export type CaseResolverCaptureProposalMatchKind = 'none' | 'party' | 'address' | 'party_and_address';

export type CaseResolverCaptureProposal = {
  role: CaseResolverCaptureRole;
  sourceRole: CaseResolverCaptureRole;
  candidate: PromptExploderCaseResolverPartyCandidate;
  existingReference: CaseResolverPartyReference | null;
  existingAddressId: string | null;
  matchKind: CaseResolverCaptureProposalMatchKind;
  hasAddressCandidate: boolean;
  action: CaseResolverCaptureAction;
};

export type CaseResolverCaptureDocumentDateAction = 'useDetectedDate' | 'keepText' | 'ignore';

export type CaseResolverCaptureDocumentDateProposal = {
  isoDate: string;
  source: 'metadata' | 'text';
  sourceLine: string | null;
  cityHint: string | null;
  action: CaseResolverCaptureDocumentDateAction;
};

export type CaseResolverCaptureProposalState = {
  targetFileId: string;
  addresser: CaseResolverCaptureProposal | null;
  addressee: CaseResolverCaptureProposal | null;
  documentDate: CaseResolverCaptureDocumentDateProposal | null;
};

const CAPTURE_ADDRESSER_LABEL_HINTS = ['addresser', 'nadawca', 'sender', 'wnioskodawca'];
const CAPTURE_ADDRESSEE_LABEL_HINTS = ['addressee', 'adresat', 'recipient', 'odbiorca', 'organ'];

const inferCandidateRoleFromLabels = (
  candidate: PromptExploderCaseResolverPartyCandidate
): CaseResolverCaptureRole | null => {
  const source = normalizeCaseResolverComparable(
    [
      ...(candidate.sourcePatternLabels ?? []),
      ...(candidate.sourceSequenceLabels ?? []),
      candidate.sourceSegmentTitle ?? '',
    ].join(' ')
  );
  if (!source) return null;

  const countRoleHints = (hints: string[]): number =>
    hints.reduce((total: number, hint: string): number => {
      const normalizedHint = normalizeCaseResolverComparable(hint);
      if (!normalizedHint) return total;
      return source.includes(normalizedHint) ? total + 1 : total;
    }, 0);

  const addresserScore = countRoleHints(CAPTURE_ADDRESSER_LABEL_HINTS);
  const addresseeScore = countRoleHints(CAPTURE_ADDRESSEE_LABEL_HINTS);
  if (addresserScore === addresseeScore) return null;
  return addresserScore > addresseeScore ? 'addresser' : 'addressee';
};

const buildCaseResolverCaptureProposal = (args: {
  sourceRole: CaseResolverCaptureRole;
  targetRole: CaseResolverCaptureRole;
  candidate: PromptExploderCaseResolverPartyCandidate;
  mapping: CaseResolverCaptureRoleMapping;
  database: FilemakerDatabase;
}): CaseResolverCaptureProposal | null => {
  if (!args.mapping.enabled) return null;
  if (!args.candidate.rawText.trim() && !args.candidate.displayName.trim()) return null;

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

  const matchKind: CaseResolverCaptureProposalMatchKind = existingReference && existingAddressId
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
    if (args.mapping.defaultAction === 'createInFilemaker' || args.mapping.defaultAction === 'ignore') {
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

  [payload?.addresser, payload?.addressee].forEach((candidate) => {
    if (!candidate) return;
    const inferredRole = inferCandidateRoleFromLabels(candidate);
    if (!inferredRole || resolvedCandidates[inferredRole]) return;
    resolvedCandidates[inferredRole] = candidate;
  });

  const proposals: Record<CaseResolverCaptureRole, CaseResolverCaptureProposal | null> = {
    addresser: null,
    addressee: null,
  };

  (['addresser', 'addressee'] as const).forEach((sourceRole) => {
    const candidate = resolvedCandidates[sourceRole];
    if (!candidate) return;

    const mapping = settings.roleMappings[sourceRole];
    const targetRole = mapping.targetRole;
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

  const normalizeDateToken = (value: string): string =>
    value.replace(/[^\d]/g, '');

  const normalizeYear = (value: string): string => {
    const digits = normalizeDateToken(value);
    if (digits.length === 2) {
      return `20${digits}`;
    }
    return digits;
  };

  const metadataPlaceDate = options?.metadata?.placeDate;
  const metadataDate = (() => {
    if (!metadataPlaceDate) return null;
    const year = normalizeYear(metadataPlaceDate.year ?? '');
    const month = normalizeDateToken(metadataPlaceDate.month ?? '').padStart(2, '0');
    const day = normalizeDateToken(metadataPlaceDate.day ?? '').padStart(2, '0');
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) return null;
    return extractCaseResolverDocumentDate(`${year}-${month}-${day}`);
  })();

  const sourceText = options?.sourceText?.trim() ?? '';
  const sourceTextDate = sourceText ? extractCaseResolverDocumentDate(sourceText) : null;
  const detectedDate = metadataDate ?? sourceTextDate;
  const detectedDateSource: CaseResolverCaptureDocumentDateProposal['source'] | null =
    metadataDate !== null
      ? 'metadata'
      : sourceTextDate !== null
        ? 'text'
        : null;
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

  const documentDateProposal: CaseResolverCaptureDocumentDateProposal | null =
    detectedDate && detectedDateSource
      ? {
        isoDate: detectedDate,
        source: detectedDateSource,
        sourceLine: sourceDateLine,
        cityHint,
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

const normalizeCaptureTextLine = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[,:;.\s]+$/g, '')
    .trim()
    .toLowerCase();

const collectCandidateAddressLines = (
  candidate: PromptExploderCaseResolverPartyCandidate
): string[] => {
  const lines = new Set<string>();
  const pushLine = (value: string | undefined): void => {
    if (!value) return;
    const normalized = value.trim();
    if (!normalized) return;
    lines.add(normalized);
  };

  const street = candidate.street?.trim() ?? '';
  const streetNumber = candidate.streetNumber?.trim() ?? '';
  const houseNumber = candidate.houseNumber?.trim() ?? '';
  const postalCode = candidate.postalCode?.trim() ?? '';
  const city = candidate.city?.trim() ?? '';
  const country = candidate.country?.trim() ?? '';

  if (street && streetNumber && houseNumber) {
    pushLine(`${street} ${streetNumber}/${houseNumber}`);
  }
  if (street && streetNumber) {
    pushLine(`${street} ${streetNumber}`);
  }
  if (street && houseNumber && !streetNumber) {
    pushLine(`${street} ${houseNumber}`);
  }
  if (postalCode && city) {
    pushLine(`${postalCode} ${city}`);
  }
  pushLine(country);

  const normalizedStreet = normalizeCaptureTextLine(street);
  const normalizedPostalCode = normalizeCaptureTextLine(postalCode);
  const normalizedCountry = normalizeCaptureTextLine(country);

  candidate.rawText
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter(Boolean)
    .forEach((line: string): void => {
      const normalizedLine = normalizeCaptureTextLine(line);
      if (!normalizedLine) return;
      if (normalizedStreet && normalizedLine.includes(normalizedStreet)) {
        pushLine(line);
        return;
      }
      if (normalizedPostalCode && normalizedLine.includes(normalizedPostalCode)) {
        pushLine(line);
        return;
      }
      if (normalizedCountry && normalizedLine === normalizedCountry) {
        pushLine(line);
      }
    });

  return [...lines];
};

export const stripAcceptedAddressLinesFromText = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): string => {
  if (!sourceText || !proposalState) return sourceText;

  const removalKeys = new Set<string>();
  [proposalState.addresser, proposalState.addressee].forEach((proposal) => {
    if (!proposal || proposal.action === 'ignore' || proposal.action === 'keepText') return;
    collectCandidateAddressLines(proposal.candidate).forEach((line: string): void => {
      const key = normalizeCaptureTextLine(line);
      if (!key) return;
      removalKeys.add(key);
    });
  });

  if (removalKeys.size === 0) return sourceText;

  const sourceLines = sourceText.split(/\r?\n/);
  let changed = false;
  const filtered = sourceLines.filter((line: string): boolean => {
    const key = normalizeCaptureTextLine(line);
    const shouldRemove = Boolean(key) && removalKeys.has(key);
    if (shouldRemove) changed = true;
    return !shouldRemove;
  });

  if (!changed) return sourceText;

  const compact: string[] = [];
  let previousBlank = false;
  filtered.forEach((line: string): void => {
    const isBlank = line.trim().length === 0;
    if (isBlank && previousBlank) return;
    compact.push(line);
    previousBlank = isBlank;
  });

  const newline = sourceText.includes('\r\n') ? '\r\n' : '\n';
  return compact.join(newline);
};

export const stripCapturedAddressLinesFromText = stripAcceptedAddressLinesFromText;

export const stripAcceptedDateLineFromText = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): string => {
  if (!sourceText || !proposalState?.documentDate) return sourceText;
  const documentDate = proposalState.documentDate;
  if (documentDate.action !== 'useDetectedDate') return sourceText;

  const sourceLines = sourceText.split(/\r?\n/);
  const sourceLineKey = documentDate.sourceLine
    ? normalizeCaptureTextLine(documentDate.sourceLine)
    : '';
  const normalizedCityHint = documentDate.cityHint
    ? normalizeCaseResolverComparable(documentDate.cityHint)
    : '';

  let removed = false;
  const filtered = sourceLines.filter((line: string): boolean => {
    if (removed) return true;
    const lineKey = normalizeCaptureTextLine(line);
    if (sourceLineKey && lineKey === sourceLineKey) {
      removed = true;
      return false;
    }
    const extractedDate = extractCaseResolverDocumentDate(line);
    if (extractedDate !== documentDate.isoDate) return true;
    if (
      normalizedCityHint &&
      !normalizeCaseResolverComparable(line).includes(normalizedCityHint)
    ) {
      return true;
    }
    removed = true;
    return false;
  });

  if (!removed) return sourceText;

  const compact: string[] = [];
  let previousBlank = false;
  filtered.forEach((line: string): void => {
    const isBlank = line.trim().length === 0;
    if (isBlank && previousBlank) return;
    compact.push(line);
    previousBlank = isBlank;
  });
  const newline = sourceText.includes('\r\n') ? '\r\n' : '\n';
  return compact.join(newline);
};

export const stripAcceptedCaptureContentFromText = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): string => {
  const withoutAddresses = stripAcceptedAddressLinesFromText(sourceText, proposalState);
  return stripAcceptedDateLineFromText(withoutAddresses, proposalState);
};
