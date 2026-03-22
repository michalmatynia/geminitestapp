import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';
import {
  normalizeCaseResolverComparable,
  composeCandidateStreetNumber,
  extractCaseResolverDocumentDate,
} from '@/features/case-resolver-capture/case-resolver-capture-adapter';

import type { CaseResolverCaptureProposalState, CaseResolverCaptureCleanupResult } from './types';

const CAPTURE_HTML_TAG_PATTERN = /<[^>]+>/;
const CAPTURE_POSTAL_CODE_PATTERN = /\b\d{2}-\d{3}\b/;
const CAPTURE_COUNTRY_HINTS = [
  'polska',
  'poland',
  'niemcy',
  'germany',
  'france',
  'francja',
  'spain',
  'hiszpania',
  'italy',
  'wlochy',
  'uk',
  'england',
];
const CAPTURE_STREET_HINT_PATTERN =
  /\b(ul\.?|ulica|street|st\.?|avenue|ave\.?|road|rd\.?|al\.?|aleja|plac|pl\.)\b/i;
const CAPTURE_PARTY_LABEL_LINE_PATTERN =
  /^(addresser|from|od|nadawca|sender|wnioskodawca|addressee|to|do|adresat|recipient|odbiorca|organ)\s*[:-]?$/i;
const CAPTURE_ORGANIZATION_HINTS = [
  'zus',
  'inspektorat',
  'oddzial',
  'zaklad',
  'urzad',
  'sad',
  'ministerstwo',
  'fundacja',
  'stowarzyszenie',
  'spolka',
  'sp z o o',
  'sa',
  'kancelaria',
  'office',
  'department',
  'agency',
  'court',
  'inc',
  'llc',
  'corp',
  'company',
  'university',
  'uniwersytet',
];

const CAPTURE_HEADER_LINE_SEARCH_LIMIT = 140;
const CAPTURE_HEADER_BLOCK_EXTRA_SPAN = 6;

const normalizeCaptureTextLine = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[,:;.\s]+$/g, '')
    .trim()
    .toLowerCase();

const normalizeCaptureWordToken = (token: string): string =>
  token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

const lineContainsComparableHint = (line: string, hints: string[]): boolean => {
  const normalizedLine = normalizeCaseResolverComparable(line);
  if (!normalizedLine) return false;
  const paddedLine = ` ${normalizedLine} `;
  return hints.some((hint: string): boolean => {
    const normalizedHint = normalizeCaseResolverComparable(hint);
    if (!normalizedHint) return false;
    return paddedLine.includes(` ${normalizedHint} `);
  });
};

const isLikelyCapturePersonNameLine = (line: string): boolean => {
  const tokens = line
    .split(/\s+/)
    .map((token: string): string => normalizeCaptureWordToken(token))
    .filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;
  if (tokens.some((token: string): boolean => /\d/.test(token))) return false;

  const letterTokens = tokens.filter((token: string): boolean => /[\p{L}]/u.test(token));
  if (letterTokens.length < 2) return false;
  return letterTokens.every((token: string): boolean => {
    if (!/^[\p{L}][\p{L}'’`-]*$/u.test(token)) return false;
    const first = token.charAt(0);
    if (first !== first.toLocaleUpperCase()) return false;
    const rest = token.slice(1);
    if (!rest) return true;
    if (token === token.toLocaleUpperCase()) return true;
    return rest === rest.toLocaleLowerCase();
  });
};

const isLikelyCaptureOrganizationLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0 || wordCount > 10) return false;
  return lineContainsComparableHint(trimmed, CAPTURE_ORGANIZATION_HINTS);
};

const isLikelyCaptureAddressContinuationLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (extractCaseResolverDocumentDate(trimmed)) return false;
  if (trimmed.length > 100) return false;
  const normalized = normalizeCaseResolverComparable(trimmed);
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > 10) return false;
  if (CAPTURE_POSTAL_CODE_PATTERN.test(trimmed)) return true;
  if (/\d/.test(trimmed)) return true;
  if (CAPTURE_STREET_HINT_PATTERN.test(trimmed)) return true;
  return CAPTURE_COUNTRY_HINTS.some((hint: string): boolean => normalized === hint);
};

const isLikelyCaptureHeaderPartyLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (extractCaseResolverDocumentDate(trimmed)) return false;
  if (trimmed.length > 90) return false;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > 10) return false;
  if (isLikelyCaptureAddressContinuationLine(trimmed)) return true;
  if (CAPTURE_PARTY_LABEL_LINE_PATTERN.test(trimmed)) return true;
  if (isLikelyCapturePersonNameLine(trimmed)) return true;
  if (isLikelyCaptureOrganizationLine(trimmed)) return true;
  return false;
};

const decodeBasicCaptureHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'');

const normalizeCaptureSourceText = (
  sourceText: string
): { plainText: string; sourceWasHtml: boolean } => {
  const sourceWasHtml = CAPTURE_HTML_TAG_PATTERN.test(sourceText);
  if (!sourceWasHtml) {
    return {
      plainText: sourceText,
      sourceWasHtml: false,
    };
  }

  const plainText = decodeBasicCaptureHtmlEntities(
    sourceText
      .replace(/\r\n/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr|section|article|blockquote)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '')
      .replace(/<[^>]*>/g, '')
  );

  return {
    plainText,
    sourceWasHtml: true,
  };
};

const splitCaptureTextLines = (sourceText: string): string[] => sourceText.split(/\r?\n/);

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
      index >= 6 && wordCount >= 12 && line.length >= 70 && /[.;:]/.test(line);
    if (looksLikeBodyParagraph) {
      return index;
    }
  }

  return fallback;
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
  const personShortName = [candidate.firstName ?? '', candidate.lastName ?? '']
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

  (candidate.rawText ?? '')
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

const buildCandidateComparableText = (
  candidate: PromptExploderCaseResolverPartyCandidate
): string => {
  const parts = [
    candidate.rawText,
    candidate.displayName,
    candidate.organizationName,
    candidate.firstName,
    candidate.middleName,
    candidate.lastName,
    candidate.street,
    composeCandidateStreetNumber(candidate),
    candidate.city,
    candidate.postalCode,
    candidate.country,
  ]
    .filter((value: string | undefined): value is string => Boolean(value?.trim()))
    .map((value: string): string => normalizeCaptureTextLine(value))
    .filter(Boolean);
  return parts.join(' ').trim();
};

const candidateLikelyContainsSourceLine = (
  candidateComparableText: string,
  sourceLineKey: string
): boolean => {
  if (!candidateComparableText || !sourceLineKey) return false;
  if (candidateComparableText.includes(sourceLineKey)) return true;

  const meaningfulTokens = sourceLineKey
    .split(' ')
    .map((token: string): string => token.trim())
    .filter((token: string): boolean => token.length >= 3);
  if (meaningfulTokens.length === 0) return false;

  const matchedTokenCount = meaningfulTokens.reduce(
    (count: number, token: string): number =>
      candidateComparableText.includes(token) ? count + 1 : count,
    0
  );
  return matchedTokenCount >= 2 && matchedTokenCount === meaningfulTokens.length;
};

const collectCandidateRawHeaderBlockLines = (
  candidate: PromptExploderCaseResolverPartyCandidate
): string[] =>
  (candidate.rawText ?? '')
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
  const { sourceLineKeys, blockLineKeys, headerSearchLimit, excludedIndexes } = input;

  const sanitizedBlock = blockLineKeys.filter(Boolean);
  if (sanitizedBlock.length < 1) return null;
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
    const span = (matchIndexes[matchIndexes.length - 1] ?? start) - start;
    const maxSpan = sanitizedBlock.length + CAPTURE_HEADER_BLOCK_EXTRA_SPAN;
    if (span > maxSpan) continue;
    if (span < bestSpan) {
      bestSpan = span;
      bestMatch = matchIndexes;
    }
  }

  return bestMatch;
};

const stripAcceptedAddressLinesFromTextDetailed = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): {
  text: string;
  removedLineCount: number;
  removedByRole: { addresser: number; addressee: number };
} => {
  if (!sourceText || !proposalState) {
    return {
      text: sourceText,
      removedLineCount: 0,
      removedByRole: {
        addresser: 0,
        addressee: 0,
      },
    };
  }

  const sourceLines = splitCaptureTextLines(sourceText);
  const sourceLineKeys = sourceLines.map((line: string): string => normalizeCaptureTextLine(line));
  const headerSearchLimit = resolveCaptureHeaderSearchLimit(sourceLines);
  if (headerSearchLimit <= 0) {
    return {
      text: sourceText,
      removedLineCount: 0,
      removedByRole: {
        addresser: 0,
        addressee: 0,
      },
    };
  }

  const removalIndexes = new Set<number>();
  const removedByRole = {
    addresser: 0,
    addressee: 0,
  };
  const removedIndexesByRole = {
    addresser: new Set<number>(),
    addressee: new Set<number>(),
  };
  let changed = false;
  const markForRemoval = (index: number, role: 'addresser' | 'addressee'): void => {
    if (removalIndexes.has(index)) return;
    removalIndexes.add(index);
    removedIndexesByRole[role].add(index);
    removedByRole[role] += 1;
    changed = true;
  };

  (
    [
      ['addresser', proposalState.addresser],
      ['addressee', proposalState.addressee],
    ] as const
  ).forEach(([role, proposal]) => {
    if (!proposal || proposal.action === 'ignore' || proposal.action === 'keepText') return;

    const beforeCount = removedByRole[role];
    const candidateComparableText = buildCandidateComparableText(proposal.candidate);
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
        markForRemoval(index, role);
      });
    }

    const pendingRemovalKeys = collectCandidateRemovalLineKeys(proposal.candidate);
    for (let index = 0; index < headerSearchLimit; index += 1) {
      if (pendingRemovalKeys.size === 0) break;
      if (removalIndexes.has(index)) continue;
      const key = sourceLineKeys[index];
      if (!key || !pendingRemovalKeys.has(key)) continue;
      markForRemoval(index, role);
      pendingRemovalKeys.delete(key);
    }

    if (candidateComparableText) {
      for (let index = 0; index < headerSearchLimit; index += 1) {
        if (removalIndexes.has(index)) continue;
        const line = sourceLines[index] ?? '';
        const trimmed = line.trim();
        if (!trimmed) continue;
        const key = sourceLineKeys[index];
        if (!key) continue;
        if (!candidateLikelyContainsSourceLine(candidateComparableText, key)) continue;
        if (
          !isLikelyCaptureHeaderPartyLine(trimmed) &&
          !isLikelyCaptureAddressContinuationLine(trimmed)
        ) {
          continue;
        }
        markForRemoval(index, role);
      }
    }

    const nameLineKeys = new Set(
      collectCandidateNameLines(proposal.candidate)
        .map((line: string): string => normalizeCaptureTextLine(line))
        .filter(Boolean)
    );

    let anchorIndex = -1;
    if (nameLineKeys.size > 0) {
      for (let index = 0; index < headerSearchLimit; index += 1) {
        if (removalIndexes.has(index)) continue;
        const key = sourceLineKeys[index];
        if (!key || !nameLineKeys.has(key)) continue;
        anchorIndex = index;
        break;
      }
    }
    if (anchorIndex < 0) {
      const roleRemovedIndexes = [...removedIndexesByRole[role]].sort(
        (left: number, right: number): number => left - right
      );
      anchorIndex = roleRemovedIndexes[0] ?? -1;
    }
    if (anchorIndex < 0 && candidateComparableText) {
      for (let index = 0; index < headerSearchLimit; index += 1) {
        if (removalIndexes.has(index)) continue;
        const line = sourceLines[index] ?? '';
        const trimmed = line.trim();
        if (!trimmed || !isLikelyCaptureHeaderPartyLine(trimmed)) continue;
        const key = sourceLineKeys[index];
        if (!key) continue;
        if (!candidateLikelyContainsSourceLine(candidateComparableText, key)) continue;
        anchorIndex = index;
        break;
      }
    }
    if (anchorIndex < 0) return;
    if (!removedIndexesByRole[role].has(anchorIndex)) {
      markForRemoval(anchorIndex, role);
    }

    let continuationSteps = 0;
    for (
      let index = anchorIndex + 1;
      index < headerSearchLimit && continuationSteps < 6;
      index += 1
    ) {
      const line = sourceLines[index] ?? '';
      const trimmed = line.trim();
      if (!trimmed) break;
      const key = sourceLineKeys[index];
      const continuationMatchesCandidate = key
        ? candidateLikelyContainsSourceLine(candidateComparableText, key)
        : false;
      const continuationLooksLikeHeader =
        isLikelyCaptureAddressContinuationLine(trimmed) ||
        (isLikelyCaptureHeaderPartyLine(trimmed) && continuationMatchesCandidate);
      if (!continuationLooksLikeHeader) {
        break;
      }
      markForRemoval(index, role);
      continuationSteps += 1;
    }

    if (removedByRole[role] <= beforeCount) {
      return;
    }
  });

  if (!changed) {
    return {
      text: sourceText,
      removedLineCount: 0,
      removedByRole,
    };
  }
  const filtered = sourceLines.filter((_, index: number): boolean => !removalIndexes.has(index));
  const newline = sourceText.includes('\r\n') ? '\r\n' : '\n';
  return {
    text: compactCaptureTextLines(filtered).join(newline),
    removedLineCount: removalIndexes.size,
    removedByRole,
  };
};

export const stripAcceptedAddressLinesFromText = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): string => {
  return stripAcceptedAddressLinesFromTextDetailed(sourceText, proposalState).text;
};

export const stripCapturedAddressLinesFromText = stripAcceptedAddressLinesFromText;

const stripAcceptedDateLineFromTextDetailed = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): { text: string; removedLineCount: number } => {
  if (!sourceText || !proposalState?.documentDate) {
    return {
      text: sourceText,
      removedLineCount: 0,
    };
  }
  const documentDate = proposalState.documentDate;
  if (documentDate.action !== 'useDetectedDate') {
    return {
      text: sourceText,
      removedLineCount: 0,
    };
  }

  const sourceLines = splitCaptureTextLines(sourceText);
  const sourceLineKeys = sourceLines.map((line: string): string => normalizeCaptureTextLine(line));
  const headerSearchLimit = resolveCaptureHeaderSearchLimit(sourceLines);
  if (headerSearchLimit <= 0) {
    return {
      text: sourceText,
      removedLineCount: 0,
    };
  }
  const sourceLineKey = documentDate.sourceLine
    ? normalizeCaptureTextLine(documentDate.sourceLine)
    : '';
  const normalizedCityHint =
    (documentDate.city ?? documentDate.cityHint)
      ? normalizeCaseResolverComparable(documentDate.city ?? documentDate.cityHint ?? '')
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

  if (removalIndex < 0) {
    return {
      text: sourceText,
      removedLineCount: 0,
    };
  }
  const filtered = sourceLines.filter((_, index: number): boolean => index !== removalIndex);
  const newline = sourceText.includes('\r\n') ? '\r\n' : '\n';
  return {
    text: compactCaptureTextLines(filtered).join(newline),
    removedLineCount: 1,
  };
};

export const stripAcceptedDateLineFromText = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): string => {
  return stripAcceptedDateLineFromTextDetailed(sourceText, proposalState).text;
};

export const stripAcceptedCaptureContentFromTextWithReport = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): CaseResolverCaptureCleanupResult => {
  if (!sourceText) {
    return {
      text: sourceText,
      report: {
        changed: false,
        sourceWasHtml: false,
        removedAddressLineCount: 0,
        removedAddresserLineCount: 0,
        removedAddresseeLineCount: 0,
        removedDateLineCount: 0,
      },
    };
  }
  const normalizedSource = normalizeCaptureSourceText(sourceText);
  const addressCleanup = stripAcceptedAddressLinesFromTextDetailed(
    normalizedSource.plainText,
    proposalState
  );
  const dateCleanup = stripAcceptedDateLineFromTextDetailed(addressCleanup.text, proposalState);
  return {
    text: dateCleanup.text,
    report: {
      changed: dateCleanup.text !== normalizedSource.plainText,
      sourceWasHtml: normalizedSource.sourceWasHtml,
      removedAddressLineCount: addressCleanup.removedLineCount,
      removedAddresserLineCount: addressCleanup.removedByRole.addresser,
      removedAddresseeLineCount: addressCleanup.removedByRole.addressee,
      removedDateLineCount: dateCleanup.removedLineCount,
    },
  };
};

export const stripAcceptedCaptureContentFromText = (
  sourceText: string,
  proposalState: CaseResolverCaptureProposalState | null
): string => {
  return stripAcceptedCaptureContentFromTextWithReport(sourceText, proposalState).text;
};
