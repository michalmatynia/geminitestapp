import type { ProductParseActionsParsedRow } from '@/shared/contracts/products/parse-actions';

type TitleStatus = { title: string; status: string | null };
type ParsedPrice = {
  currency: string | null;
  price: number | null;
  rawPrice: string | null;
  index: number;
};

export const TRADERA_CLOSED_STATUS = 'closed';

const STATUS_SUFFIXES = ['closed', 'active', 'ended', 'hidden'] as const;

const readLine = (lines: string[], index: number): string => lines[index] ?? '';

const findPreviousNonEmptyLineIndex = (lines: string[], startIndex: number): number | null => {
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    if (readLine(lines, index).trim().length > 0) return index;
  }
  return null;
};

const extractTitleAndStatus = (candidate: string): TitleStatus => {
  const compact = candidate.trim().replace(/\s+/g, ' ');
  const lower = compact.toLowerCase();
  const suffix = STATUS_SUFFIXES.find((status: string): boolean => lower.endsWith(status));
  if (suffix === undefined || compact.length <= suffix.length) {
    return { title: compact, status: null };
  }
  return {
    title: compact.slice(0, -suffix.length).trim(),
    status: suffix === 'closed' ? TRADERA_CLOSED_STATUS : suffix,
  };
};

const extractPrice = (lines: string[], startIndex: number, endIndex: number): ParsedPrice => {
  for (let index = startIndex; index < endIndex; index += 1) {
    const line = readLine(lines, index);
    if (/^shipping\b/i.test(line)) continue;
    const match = /\b([A-Z]{3})\s*([0-9]+(?:[.,][0-9]+)?)/.exec(line);
    if (match === null) continue;
    return {
      currency: match[1] ?? null,
      price: Number.parseFloat((match[2] ?? '').replace(',', '.')),
      rawPrice: line.trim(),
      index,
    };
  }
  return { currency: null, price: null, rawPrice: null, index: startIndex };
};

const findRepeatedTitleAfterPrice = (
  lines: string[],
  startIndex: number,
  endIndex: number
): string | null => {
  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const line = readLine(lines, index).trim();
    if (line.length === 0) continue;
    if (/^(shipping|buy now|restart|hide|\||\d{1,2}\s+[a-z]{3}\b)/i.test(line)) return null;
    if (/^[A-Z]{3}\s*[0-9]/.test(line)) continue;
    return line;
  }
  return null;
};

export const normalizeParsedProductTitle = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, '\'')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const parseObjectNumber = (value: string): string | null =>
  /object\s+no\.\s*(\d+)/i.exec(value)?.[1] ?? null;

const buildRowId = (objectNumber: string | null, position: number): string =>
  objectNumber !== null ? `tradera:${objectNumber}` : `tradera:${position + 1}`;

const buildRawText = (
  lines: string[],
  previousTitleIndex: number | null,
  objectIndex: number,
  nextObjectIndex: number
): string =>
  lines
    .slice(previousTitleIndex ?? objectIndex, nextObjectIndex)
    .filter((line: string): boolean => line.length > 0)
    .join('\n');

const resolveParsedTitle = (
  lines: string[],
  previous: TitleStatus,
  price: ParsedPrice,
  nextObjectIndex: number
): { title: string; normalizedTitle: string } => {
  const repeatedTitle = findRepeatedTitleAfterPrice(lines, price.index, nextObjectIndex);
  const titleSource = repeatedTitle ?? previous.title;
  const title = extractTitleAndStatus(titleSource).title;
  return { title, normalizedTitle: normalizeParsedProductTitle(title) };
};

const normalizeParsedPriceValue = (price: number | null): number | null =>
  price !== null && Number.isFinite(price) ? price : null;

const parseObjectRow = (
  lines: string[],
  objectLineIndexes: number[],
  position: number
): ProductParseActionsParsedRow | null => {
  const objectIndex = objectLineIndexes[position];
  if (objectIndex === undefined) return null;

  const objectNumber = parseObjectNumber(readLine(lines, objectIndex));
  const nextObjectIndex = objectLineIndexes[position + 1] ?? lines.length;
  const previousTitleIndex = findPreviousNonEmptyLineIndex(lines, objectIndex);
  const previousTitle =
    previousTitleIndex === null ? '' : readLine(lines, previousTitleIndex);
  const previous = extractTitleAndStatus(previousTitle);
  const price = extractPrice(lines, objectIndex + 1, nextObjectIndex);
  const { title, normalizedTitle } = resolveParsedTitle(lines, previous, price, nextObjectIndex);

  if (title.length === 0 || normalizedTitle.length === 0) return null;
  return {
    rowId: buildRowId(objectNumber, position),
    source: 'tradera',
    title,
    normalizedTitle,
    objectNumber,
    status: previous.status,
    currency: price.currency,
    price: normalizeParsedPriceValue(price.price),
    rawPrice: price.rawPrice,
    rawText: buildRawText(lines, previousTitleIndex, objectIndex, nextObjectIndex),
  };
};

export const parseTraderaProductActionText = (
  text: string
): ProductParseActionsParsedRow[] => {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((line: string): string => line.trim());
  const objectLineIndexes = lines.flatMap((line: string, index: number): number[] =>
    /^object\s+no\.\s*\d+/i.test(line) ? [index] : []
  );

  return objectLineIndexes
    .map((_, position: number): ProductParseActionsParsedRow | null =>
      parseObjectRow(lines, objectLineIndexes, position)
    )
    .filter((row): row is ProductParseActionsParsedRow => row !== null);
};
