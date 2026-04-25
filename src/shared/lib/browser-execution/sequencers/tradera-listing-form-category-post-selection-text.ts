import type { TraderaListingFormCategoryPickerItem } from './tradera-listing-form-category-picker';

const POST_SELECTION_TEXT_BOUNDARY_LABELS = new Set([
  'choose',
  'listing details',
  'listing format',
  'more options',
  'optional',
  'preview',
  'publish',
  'vat',
]);

const normalizeText = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().toLowerCase();

const normalizeVisibleLine = (value: string): string =>
  value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

const splitVisibleTextLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map(normalizeVisibleLine)
    .filter(Boolean);

const isPostSelectionTextBoundary = (value: string): boolean => {
  const normalized = normalizeText(value);
  return (
    POST_SELECTION_TEXT_BOUNDARY_LABELS.has(normalized) ||
    normalized.startsWith('7 days') ||
    normalized.startsWith('listing ends') ||
    normalized.startsWith('publish ')
  );
};

const findLastPathLineIndex = ({
  lines,
  pathNames,
}: {
  lines: string[];
  pathNames: string[];
}): number => {
  const lastPathName = pathNames.at(-1);
  if (lastPathName === undefined) return -1;

  const normalizedLastPathName = normalizeText(lastPathName);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (normalizeText(lines[index] ?? '') === normalizedLastPathName) {
      return index;
    }
  }

  return -1;
};

const buildIgnoredTextCategoryNames = ({
  optionsBefore,
  pathNames,
}: {
  optionsBefore: string[];
  pathNames: string[];
}): Set<string> =>
  new Set([
    ...optionsBefore.map(normalizeText),
    ...pathNames.map(normalizeText),
  ].filter(Boolean));

const shouldUseTextCategoryLine = ({
  ignoredNames,
  line,
  seen,
}: {
  ignoredNames: Set<string>;
  line: string;
  seen: Set<string>;
}): boolean => {
  const normalizedLine = normalizeText(line);
  return !ignoredNames.has(normalizedLine) && !seen.has(normalizedLine);
};

const shouldKeepTextCategoryResults = (
  items: TraderaListingFormCategoryPickerItem[],
  nextName: string | null
): boolean => {
  const next = nextName === null ? '' : normalizeText(nextName);
  return next.length === 0 || items.some((item) => normalizeText(item.name) === next);
};

export const extractTraderaListingFormPostSelectionTextCategoryItems = ({
  nextName,
  optionsBefore,
  pathNames,
  text,
}: {
  nextName: string | null;
  optionsBefore: string[];
  pathNames: string[];
  text: string;
}): TraderaListingFormCategoryPickerItem[] => {
  const lines = splitVisibleTextLines(text);
  const startIndex = findLastPathLineIndex({ lines, pathNames });
  if (startIndex < 0) return [];

  const ignoredNames = buildIgnoredTextCategoryNames({ optionsBefore, pathNames });
  const results: TraderaListingFormCategoryPickerItem[] = [];
  const seen = new Set<string>();
  for (const line of lines.slice(startIndex + 1)) {
    if (isPostSelectionTextBoundary(line)) break;
    if (!shouldUseTextCategoryLine({ ignoredNames, line, seen })) continue;

    seen.add(normalizeText(line));
    results.push({ id: '', name: line });
  }

  return shouldKeepTextCategoryResults(results, nextName) ? results : [];
};
