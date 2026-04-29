import {
  collectValidationPatternRegexMatches,
  type ProductValidationPatternRegexMatch,
} from '@/features/products/validation-engine/core';
import type { ProductParseActionsParsedRow } from '@/shared/contracts/products/parse-actions';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

type ParsePatternDefinition = {
  id: string;
  label: string;
  regex: string;
  flags: string | null;
  sequence: number;
  maxExecutions?: number;
};

type ParsedPrice = {
  currency: string | null;
  price: number | null;
  rawPrice: string | null;
};

export const TRADERA_CLOSED_STATUS = 'closed';

const PARSE_PATTERN_TIMESTAMP = '2026-04-29T00:00:00.000Z';
const PARSE_PATTERN_TARGET = 'description' as const;
const PARSE_PATTERN_SCOPE = 'product_create' as const;
const TRADERA_PARSE_MAX_ROWS = 500;

const buildParseValidationPattern = ({
  id,
  label,
  regex,
  flags,
  sequence,
  maxExecutions = 1,
}: ParsePatternDefinition): ProductValidationPattern => ({
  id,
  label,
  target: PARSE_PATTERN_TARGET,
  locale: null,
  regex,
  flags,
  message: label,
  severity: 'warning',
  enabled: true,
  replacementEnabled: false,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: null,
  replacementFields: [],
  replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  runtimeEnabled: false,
  runtimeType: 'none',
  runtimeConfig: null,
  postAcceptBehavior: 'revalidate',
  denyBehaviorOverride: null,
  validationDebounceMs: 0,
  sequenceGroupId: null,
  sequenceGroupLabel: null,
  sequenceGroupDebounceMs: 0,
  sequence,
  chainMode: 'continue',
  maxExecutions,
  passOutputToNext: true,
  launchEnabled: false,
  launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  launchScopeBehavior: 'gate',
  launchSourceMode: 'current_field',
  launchSourceField: null,
  launchOperator: 'equals',
  launchValue: null,
  launchFlags: null,
  appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  semanticState: {
    version: 2,
    presetId: 'products.parse-actions.tradera',
    operation: 'parse_marketplace_listing_text',
    sourceField: 'marketplaceText',
    targetField: 'parsedRows',
    tags: ['parse_actions', 'tradera'],
    metadata: { parserPatternId: id },
  },
  semanticAudit: null,
  semanticAuditHistory: [],
  createdAt: PARSE_PATTERN_TIMESTAMP,
  updatedAt: PARSE_PATTERN_TIMESTAMP,
});

const TRADERA_ROW_PATTERN = buildParseValidationPattern({
  id: 'parse-actions.tradera.row',
  label: 'Tradera listing row',
  regex:
    '(?<headerLine>[^\\n]*?)(?:(?<status>Closed|Active|Ended|Hidden))?[ \\t]*\\n' +
    '[ \\t]*Object\\s+no\\.\\s*(?<objectNumber>\\d+)' +
    '(?<body>[\\s\\S]*?)' +
    '(?=\\n[^\\n]*?(?:Closed|Active|Ended|Hidden)?[ \\t]*\\n[ \\t]*Object\\s+no\\.|\\n[ \\t]*Previous\\b|$)',
  flags: 'gi',
  sequence: 10,
  maxExecutions: TRADERA_PARSE_MAX_ROWS,
});

const TRADERA_HEADER_STATUS_PATTERN = buildParseValidationPattern({
  id: 'parse-actions.tradera.header-status',
  label: 'Tradera title status suffix',
  regex: '^(?<title>.+?)(?<status>Closed|Active|Ended|Hidden)[ \\t]*$',
  flags: 'i',
  sequence: 20,
});

const TRADERA_PRICE_PATTERN = buildParseValidationPattern({
  id: 'parse-actions.tradera.price',
  label: 'Tradera price line',
  regex:
    '^[ \\t]*(?!Shipping\\b)(?<rawPrice>.*?\\b(?<currency>[A-Z]{3})[ \\t]*(?<amount>[0-9]+(?:[.,][0-9]+)?).*?)[ \\t]*$',
  flags: 'im',
  sequence: 30,
});

const TRADERA_REPEATED_TITLE_PATTERN = buildParseValidationPattern({
  id: 'parse-actions.tradera.repeated-title',
  label: 'Tradera repeated title line',
  regex:
    '^[ \\t]*(?!(?:Shipping\\b|Buy now\\b|Restart\\b|Hide\\b|Previous\\b|Next\\b|Per page\\b|' +
    'Listings\\b|Auctions\\b|Bids\\b|Filter\\b|Active\\b|Ended\\b|Hidden\\b|Select multiple\\b|' +
    '\\||\\d+(?:[ \\t]*\\|[ \\t]*\\d+)*$|\\d{1,2}[ \\t]+[A-Za-z]{3}\\b|[A-Z]{3}[ \\t]*\\d))' +
    '(?<title>.+\\S)[ \\t]*$',
  flags: 'im',
  sequence: 40,
});

const TRADERA_PARSE_PATTERNS = {
  row: TRADERA_ROW_PATTERN,
  headerStatus: TRADERA_HEADER_STATUS_PATTERN,
  price: TRADERA_PRICE_PATTERN,
  repeatedTitle: TRADERA_REPEATED_TITLE_PATTERN,
} as const;

export const normalizeParsedProductTitle = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, '\'')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const collectParserPatternMatches = (
  value: string,
  pattern: ProductValidationPattern,
  maxMatchesPerPattern = 1
): ProductValidationPatternRegexMatch[] =>
  collectValidationPatternRegexMatches({
    value,
    patterns: [pattern],
    validationScope: PARSE_PATTERN_SCOPE,
    target: PARSE_PATTERN_TARGET,
    maxMatchesPerPattern,
  });

const readGroup = (
  match: ProductValidationPatternRegexMatch | undefined,
  groupName: string
): string | null => {
  const value = match?.groups[groupName];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeMarketplaceText = (text: string): string =>
  text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line: string): string => line.trim())
    .join('\n');

const normalizeStatus = (status: string | null): string | null => {
  const normalized = status?.trim().toLowerCase() ?? '';
  if (normalized.length === 0) return null;
  if (normalized === 'closed') return TRADERA_CLOSED_STATUS;
  return normalized;
};

const extractTitleAndStatus = (headerLine: string): { title: string; status: string | null } => {
  const compact = headerLine.trim().replace(/\s+/g, ' ');
  const statusMatch = collectParserPatternMatches(compact, TRADERA_PARSE_PATTERNS.headerStatus)[0];
  const status = readGroup(statusMatch, 'status');
  const title = readGroup(statusMatch, 'title') ?? compact;
  return {
    title,
    status: normalizeStatus(status),
  };
};

const extractPrice = (body: string): { price: ParsedPrice; priceEndIndex: number } => {
  const priceMatch = collectParserPatternMatches(body, TRADERA_PARSE_PATTERNS.price)[0];
  if (priceMatch === undefined) {
    return {
      price: { currency: null, price: null, rawPrice: null },
      priceEndIndex: 0,
    };
  }

  const rawAmount = readGroup(priceMatch, 'amount');
  const price =
    rawAmount === null ? null : Number.parseFloat(rawAmount.replace(',', '.'));
  return {
    price: {
      currency: readGroup(priceMatch, 'currency'),
      price: price !== null && Number.isFinite(price) ? price : null,
      rawPrice: readGroup(priceMatch, 'rawPrice') ?? priceMatch.matchText.trim(),
    },
    priceEndIndex: priceMatch.index + priceMatch.length,
  };
};

const extractRepeatedTitle = (body: string, priceEndIndex: number): string | null => {
  if (priceEndIndex <= 0) return null;
  const afterPrice = body.slice(priceEndIndex);
  const titleMatch = collectParserPatternMatches(
    afterPrice,
    TRADERA_PARSE_PATTERNS.repeatedTitle
  )[0];
  return readGroup(titleMatch, 'title');
};

const buildRowId = (objectNumber: string | null, position: number): string =>
  objectNumber !== null ? `tradera:${objectNumber}` : `tradera:${position + 1}`;

const normalizeRawText = (value: string): string =>
  value
    .split('\n')
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0)
    .join('\n');

const buildParsedRow = (
  match: ProductValidationPatternRegexMatch,
  position: number
): ProductParseActionsParsedRow | null => {
  const objectNumber = readGroup(match, 'objectNumber');
  const body = readGroup(match, 'body') ?? '';
  const rowStatus = normalizeStatus(readGroup(match, 'status'));
  const header = extractTitleAndStatus(readGroup(match, 'headerLine') ?? '');
  const { price, priceEndIndex } = extractPrice(body);
  const repeatedTitle = extractRepeatedTitle(body, priceEndIndex);
  const title = (repeatedTitle ?? header.title).trim();
  const normalizedTitle = normalizeParsedProductTitle(title);

  if (title.length === 0 || normalizedTitle.length === 0) return null;
  return {
    rowId: buildRowId(objectNumber, position),
    source: 'tradera',
    title,
    normalizedTitle,
    objectNumber,
    status: rowStatus ?? header.status,
    currency: price.currency,
    price: price.price,
    rawPrice: price.rawPrice,
    rawText: normalizeRawText(match.matchText),
  };
};

export const parseTraderaProductActionText = (
  text: string
): ProductParseActionsParsedRow[] => {
  const normalizedText = normalizeMarketplaceText(text);
  const rowMatches = collectParserPatternMatches(
    normalizedText,
    TRADERA_PARSE_PATTERNS.row,
    TRADERA_PARSE_MAX_ROWS
  );

  return rowMatches
    .map((match: ProductValidationPatternRegexMatch, position: number) =>
      buildParsedRow(match, position)
    )
    .filter((row): row is ProductParseActionsParsedRow => row !== null);
};
