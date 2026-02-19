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

const CAPTURE_HEADER_LINE_SEARCH_LIMIT = 80;
const CAPTURE_HEADER_BLOCK_EXTRA_SPAN = 6;

const splitCaptureTextLines = (sourceText: string): string[] =>
  sourceText.split(/\r?\n/);

const compactCaptureTextLines = (lines: string[]): string[] => {
  const compact: string[] = [];
  let previousBlank = false;
  lines.forEach((line: string): void => {
    const isBlank = line.trim().length === 0;
    if (isBlank && previousBlank) return;
    compact.push(line);
    previousBlank = isBlank;
  });
  while (compact.length > 0 && compact[0]?.trim().length === 0) {
    compact.shift();
  }
  while (compact.length > 0 && compact[compact.length - 1]?.trim().length === 0) {
    compact.pop();
  }
  return compact;
};

const resolveCaptureHeaderSearchLimit = (sourceLines: string[]): number => {
  const fallback = Math.min(sourceLines.length, CAPTURE_HEADER_LINE_SEARCH_LIMIT);
  if (fallback === 0) return 0;

  let blankRun = 0;
  for (let index = 0; index < fallback; index += 1) {
    const line = sourceLines[index]?.trim() ?? '';
    if (!line) {
      blankRun += 1;
      if (blankRun >= 2) {
        return Math.max(0, index - 1);
      }
      continue;
    }

    blankRun = 0;
    const wordCount = line.split(/\s+/).filter(Boolean).length;
    const looksLikeBodyParagraph =
      index >= 6 &&
      wordCount >= 12 &&
      line.length >= 70 &&
      /[.;:]/.test(line);
    if (looksLikeBodyParagraph) {
      return index;
    }
  }

  return fallback;
};

const isLikelyCaptureHeaderPartyLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (extractCaseResolverDocumentDate(trimmed)) return false;
  if (trimmed.length > 90) return false;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > 10) return false;
  return true;
};

const collectCandidateNameLines = (
  candidate: PromptExploderCaseResolverPartyCandidate
): string[] => {
  const lines = new Set<string>();
  const pushLine = (value: string | undefined): void => {
    if (!value) return;
    const normalized = value.trim();
    if (!normalized) return;
    lines.add(normalized);
  };

  pushLine(candidate.displayName);
  pushLine(candidate.organizationName);
  const personFullName = [
    candidate.firstName ?? '',
    candidate.middleName ?? '',
    candidate.lastName ?? '',
  ]
    .map((part: string): string => part.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  const personShortName = [
    candidate.firstName ?? '',
    candidate.lastName ?? '',
  ]
    .map((part: string): string => part.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  pushLine(personFullName);
  pushLine(personShortName);
  return [...lines];
};

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

const collectCandidateRawHeaderBlockLines = (
  candidate: PromptExploderCaseResolverPartyCandidate
): string[] =>
  candidate.rawText
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => isLikelyCaptureHeaderPartyLine(line))
    .slice(0, 8);

const collectCandidateRemovalLineKeys = (
  candidate: PromptExploderCaseResolverPartyCandidate
): Set<string> => {
  const keys = new Set<string>();
  const pushLine = (line: string): void => {
    const key = normalizeCaptureTextLine(line);
    if (!key) return;
    keys.add(key);
  };

  collectCandidateNameLines(candidate).forEach(pushLine);
  collectCandidateAddressLines(candidate).forEach(pushLine);
  collectCandidateRawHeaderBlockLines(candidate).forEach(pushLine);

  return keys;
};

const findOrderedCaptureBlockIndices = (input: {
  sourceLineKeys: string[];
  blockLineKeys: string[];
  headerSearchLimit: number;
  excludedIndexes?: Set<number> | undefined;
}): number[] | null => {
  const {
    sourceLineKeys,
    blockLineKeys,
    headerSearchLimit,
    excludedIndexes,
  } = input;

  const sanitizedBlock = blockLineKeys.filter(Boolean);
  if (sanitizedBlock.length < 2) return null;
  if (headerSearchLimit <= 0) return null;

  let bestMatch: number[] | null = null;
  let bestSpan = Number.POSITIVE_INFINITY;

  for (let start = 0; start < headerSearchLimit; start += 1) {
    if (excludedIndexes?.has(start)) continue;
    if (sourceLineKeys[start] !== sanitizedBlock[0]) continue;
    const matchIndexes: number[] = [start];
    let blockIndex = 1;

    for (
      let sourceIndex = start + 1;
      sourceIndex < headerSearchLimit && blockIndex < sanitizedBlock.length;
      sourceIndex += 1
    ) {
      if (excludedIndexes?.has(sourceIndex)) continue;
      if (sourceLineKeys[sourceIndex] !== sanitizedBlock[blockIndex]) continue;
      matchIndexes.push(sourceIndex);
      blockIndex += 1;
    }

    if (blockIndex !== sanitizedBlock.length) continue;
    const span =
      (matchIndexes[matchIndexes.length - 1] ?? start) - start;
    const maxSpan = sanitizedBlock.length + CAPTURE_HEADER_BLOCK_EXTRA_SPAN;
    if (span > maxSpan) continue;
    if (span < bestSpan) {
      bestSpan = span;
      bestMatch = matchIndexes;
    }
  }

  return bestMatch;
};

export const stripAcceptedAddressLinesFromText = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): string => {
  if (!sourceText || !proposalState) return sourceText;

  const sourceLines = splitCaptureTextLines(sourceText);
  const sourceLineKeys = sourceLines.map((line: string): string =>
    normalizeCaptureTextLine(line)
  );
  const headerSearchLimit = resolveCaptureHeaderSearchLimit(sourceLines);
  if (headerSearchLimit <= 0) return sourceText;

  const removalIndexes = new Set<number>();
  let changed = false;

  [proposalState.addresser, proposalState.addressee].forEach((proposal) => {
    if (!proposal || proposal.action === 'ignore' || proposal.action === 'keepText') return;

    const blockLineKeys = collectCandidateRawHeaderBlockLines(proposal.candidate)
      .map((line: string): string => normalizeCaptureTextLine(line))
      .filter(Boolean);
    const blockIndexes = findOrderedCaptureBlockIndices({
      sourceLineKeys,
      blockLineKeys,
      headerSearchLimit,
      excludedIndexes: removalIndexes,
    });
    if (blockIndexes) {
      blockIndexes.forEach((index: number): void => {
        if (removalIndexes.has(index)) return;
        removalIndexes.add(index);
        changed = true;
      });
    }

    const pendingRemovalKeys = collectCandidateRemovalLineKeys(proposal.candidate);
    for (let index = 0; index < headerSearchLimit; index += 1) {
      if (pendingRemovalKeys.size === 0) break;
      if (removalIndexes.has(index)) continue;
      const key = sourceLineKeys[index];
      if (!key || !pendingRemovalKeys.has(key)) continue;
      removalIndexes.add(index);
      pendingRemovalKeys.delete(key);
      changed = true;
    }
  });

  if (!changed) return sourceText;
  const filtered = sourceLines.filter((_, index: number): boolean => !removalIndexes.has(index));
  const newline = sourceText.includes('\r\n') ? '\r\n' : '\n';
  return compactCaptureTextLines(filtered).join(newline);
};

export const stripCapturedAddressLinesFromText = stripAcceptedAddressLinesFromText;

export const stripAcceptedDateLineFromText = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): string => {
  if (!sourceText || !proposalState?.documentDate) return sourceText;
  const documentDate = proposalState.documentDate;
  if (documentDate.action !== 'useDetectedDate') return sourceText;

  const sourceLines = splitCaptureTextLines(sourceText);
  const sourceLineKeys = sourceLines.map((line: string): string =>
    normalizeCaptureTextLine(line)
  );
  const headerSearchLimit = resolveCaptureHeaderSearchLimit(sourceLines);
  if (headerSearchLimit <= 0) return sourceText;
  const sourceLineKey = documentDate.sourceLine
    ? normalizeCaptureTextLine(documentDate.sourceLine)
    : '';
  const normalizedCityHint = documentDate.cityHint
    ? normalizeCaseResolverComparable(documentDate.cityHint)
    : '';

  let removalIndex = -1;
  if (sourceLineKey) {
    for (let index = 0; index < headerSearchLimit; index += 1) {
      if (sourceLineKeys[index] !== sourceLineKey) continue;
      removalIndex = index;
      break;
    }
  }
  if (removalIndex < 0) {
    for (let index = 0; index < headerSearchLimit; index += 1) {
      const line = sourceLines[index] ?? '';
      const extractedDate = extractCaseResolverDocumentDate(line);
      if (extractedDate !== documentDate.isoDate) continue;
      if (
        normalizedCityHint &&
        !normalizeCaseResolverComparable(line).includes(normalizedCityHint)
      ) {
        continue;
      }
      removalIndex = index;
      break;
    }
  }

  if (removalIndex < 0) return sourceText;
  const filtered = sourceLines.filter((_, index: number): boolean => index !== removalIndex);
  const newline = sourceText.includes('\r\n') ? '\r\n' : '\n';
  return compactCaptureTextLines(filtered).join(newline);
};

export const stripAcceptedCaptureContentFromText = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): string => {
  const withoutAddresses = stripAcceptedAddressLinesFromText(sourceText, proposalState);
  return stripAcceptedDateLineFromText(withoutAddresses, proposalState);
};
