import {
  collectValidationPatternRegexMatches,
  type ProductValidationPatternRegexMatch,
} from '@/features/products/validation-engine/core';
import {
  PRODUCT_PARSE_ACTIONS_TRADERA_MAX_ROWS,
  selectTraderaParseActionValidationPatterns,
  type ProductParseActionsTraderaPatternSet,
} from '@/features/products/lib/parseActionsValidationPatterns';
import type { ProductParseActionsParsedRow } from '@/shared/contracts/products/parse-actions';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { listValidationPatternsCached } from '@/shared/lib/products/services/validation-pattern-runtime-cache';

type ParsedPrice = {
  currency: string | null;
  price: number | null;
  rawPrice: string | null;
};

export const TRADERA_CLOSED_STATUS = 'closed';

const PARSE_PATTERN_TARGET = 'description' as const;
const PARSE_PATTERN_SCOPE = 'product_create' as const;

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

const loadTraderaParseActionPatterns = async (): Promise<ProductParseActionsTraderaPatternSet> => {
  const patterns = await listValidationPatternsCached();
  const selected = selectTraderaParseActionValidationPatterns(patterns);
  if (selected === null) {
    throw new Error('Tradera Parse Actions validation patterns are missing.');
  }
  return selected;
};

const extractTitleAndStatus = (
  headerLine: string,
  patterns: ProductParseActionsTraderaPatternSet
): { title: string; status: string | null } => {
  const compact = headerLine.trim().replace(/\s+/g, ' ');
  const statusMatch = collectParserPatternMatches(compact, patterns.headerStatus)[0];
  const status = readGroup(statusMatch, 'status');
  const title = readGroup(statusMatch, 'title') ?? compact;
  return {
    title,
    status: normalizeStatus(status),
  };
};

const extractPrice = (
  body: string,
  patterns: ProductParseActionsTraderaPatternSet
): { price: ParsedPrice; priceEndIndex: number } => {
  const priceMatch = collectParserPatternMatches(body, patterns.price)[0];
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

const extractRepeatedTitle = (
  body: string,
  priceEndIndex: number,
  patterns: ProductParseActionsTraderaPatternSet
): string | null => {
  if (priceEndIndex <= 0) return null;
  const afterPrice = body.slice(priceEndIndex);
  const titleMatch = collectParserPatternMatches(afterPrice, patterns.repeatedTitle)[0];
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
  position: number,
  patterns: ProductParseActionsTraderaPatternSet
): ProductParseActionsParsedRow | null => {
  const objectNumber = readGroup(match, 'objectNumber');
  const body = readGroup(match, 'body') ?? '';
  const rowStatus = normalizeStatus(readGroup(match, 'status'));
  const header = extractTitleAndStatus(readGroup(match, 'headerLine') ?? '', patterns);
  const { price, priceEndIndex } = extractPrice(body, patterns);
  const repeatedTitle = extractRepeatedTitle(body, priceEndIndex, patterns);
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
): Promise<ProductParseActionsParsedRow[]> => parseTraderaProductActionTextWithPatterns(text);

export const parseTraderaProductActionTextWithPatterns = async (
  text: string,
  parserPatterns?: ProductParseActionsTraderaPatternSet
): Promise<ProductParseActionsParsedRow[]> => {
  const patterns = parserPatterns ?? (await loadTraderaParseActionPatterns());
  const normalizedText = normalizeMarketplaceText(text);
  const rowMatches = collectParserPatternMatches(
    normalizedText,
    patterns.row,
    PRODUCT_PARSE_ACTIONS_TRADERA_MAX_ROWS
  );

  return rowMatches
    .map((match: ProductValidationPatternRegexMatch, position: number) =>
      buildParsedRow(match, position, patterns)
    )
    .filter((row): row is ProductParseActionsParsedRow => row !== null);
};
