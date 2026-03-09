const SCAN_OUTPUT_SCHEMA_VERSION = 1;
const DEFAULT_SCANNER_VERSION = '1.0.0';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const ensureObject = (value, fallback = null) => (isObject(value) ? value : fallback);

const toString = (value) => (typeof value === 'string' ? value.trim() : value);

const normalizeScanner = (scanner, fallbackName) => {
  if (isObject(scanner) && typeof scanner.name === 'string' && scanner.name.trim().length > 0) {
    const name = toString(scanner.name);
    const version =
      typeof scanner.version === 'string' && scanner.version.trim().length > 0
        ? toString(scanner.version)
        : DEFAULT_SCANNER_VERSION;

    return {
      ...scanner,
      name,
      version,
    };
  }

  return {
    name: fallbackName,
    version: DEFAULT_SCANNER_VERSION,
  };
};

export const buildScanOutput = ({
  scannerName,
  scannerVersion = DEFAULT_SCANNER_VERSION,
  generatedAt,
  status = 'ok',
  summary,
  details = null,
  paths = null,
  filters = null,
  notes = [],
}) => {
  const summaryValue = ensureObject(summary, null);
  if (!summaryValue) {
    throw new Error('scan output requires a summary object');
  }

  return {
    schemaVersion: SCAN_OUTPUT_SCHEMA_VERSION,
    generatedAt:
      typeof generatedAt === 'string' && generatedAt.length > 0
        ? generatedAt
        : typeof summaryValue.generatedAt === 'string' && summaryValue.generatedAt.length > 0
          ? summaryValue.generatedAt
          : new Date().toISOString(),
    scanner: {
      name: scannerName,
      version: scannerVersion,
    },
    status,
    summary: summaryValue,
    details: details == null ? null : details,
    paths: paths == null ? null : paths,
    filters: filters == null ? null : filters,
    notes: Array.isArray(notes) ? notes : [],
  };
};

const collectUnmodeledDetails = (parsed) => {
  const details = {};
  const allowlist = new Set([
    'schemaVersion',
    'generatedAt',
    'scanner',
    'status',
    'summary',
    'details',
    'paths',
    'filters',
    'notes',
    'result',
  ]);

  for (const [key, value] of Object.entries(parsed)) {
    if (allowlist.has(key)) continue;
    details[key] = value;
  }

  return Object.keys(details).length > 0 ? details : null;
};

const parseJsonObject = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const isValidScanPayload = (value) =>
  isObject(value) &&
  isObject(value.summary) &&
  (Number.isInteger(value.schemaVersion) ||
    isObject(value.scanner) ||
    typeof value.generatedAt === 'string');

const findBalancedJsonObject = (text, startIndex) => {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let started = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (!started) {
      if (char === '{') {
        started = true;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      depth += 1;
      continue;
    }

    if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return null;
};

const collectCandidateStartIndexes = (stdout) => {
  const starts = new Set();
  const markers = ['"schemaVersion"', '"scanner"', '"summary"'];

  for (const marker of markers) {
    let markerIndex = stdout.indexOf(marker);
    while (markerIndex !== -1) {
      const startIndex = stdout.lastIndexOf('{', markerIndex);
      if (startIndex !== -1) {
        starts.add(startIndex);
      }
      markerIndex = stdout.indexOf(marker, markerIndex + marker.length);
    }
  }

  const trimmedStart = stdout.search(/\S/);
  if (trimmedStart !== -1 && stdout[trimmedStart] === '{') {
    starts.add(trimmedStart);
  }

  return [...starts].sort((left, right) => right - left);
};

const parseStructuredScanPayload = (stdout, sourceName) => {
  const direct = parseJsonObject(stdout);
  if (isValidScanPayload(direct)) {
    return direct;
  }

  for (const startIndex of collectCandidateStartIndexes(stdout)) {
    const candidateText = findBalancedJsonObject(stdout, startIndex);
    if (!candidateText) {
      continue;
    }

    const candidate = parseJsonObject(candidateText);
    if (isValidScanPayload(candidate)) {
      return candidate;
    }
  }

  throw new Error(`${sourceName} did not return valid JSON output.`);
};

export const parseScanOutput = (stdout, sourceName) => {
  const parsed = parseStructuredScanPayload(stdout, sourceName);
  const parsedObject = ensureObject(parsed, null);
  if (!parsedObject) {
    throw new Error(`${sourceName} output is not an object.`);
  }

  const summary = ensureObject(parsedObject.summary, null);
  if (!summary) {
    throw new Error(`${sourceName} output is missing the required summary object.`);
  }

  const schemaVersion =
    Number.isInteger(parsedObject.schemaVersion) && parsedObject.schemaVersion > 0
      ? parsedObject.schemaVersion
      : SCAN_OUTPUT_SCHEMA_VERSION;

  return {
    schemaVersion,
    generatedAt:
      typeof parsedObject.generatedAt === 'string' && parsedObject.generatedAt.length > 0
        ? parsedObject.generatedAt
        : typeof summary.generatedAt === 'string' && summary.generatedAt.length > 0
          ? summary.generatedAt
          : new Date().toISOString(),
    scanner: normalizeScanner(parsedObject.scanner, sourceName),
    status:
      typeof parsedObject.status === 'string' && parsedObject.status.length > 0
        ? parsedObject.status
        : 'ok',
    summary,
    details: isObject(parsedObject.details)
      ? parsedObject.details
      : isObject(parsedObject.result)
        ? parsedObject.result
        : collectUnmodeledDetails(parsedObject),
    paths:
      isObject(parsedObject.paths) ? parsedObject.paths : null,
    filters:
      isObject(parsedObject.filters) ? parsedObject.filters : null,
    notes: Array.isArray(parsedObject.notes) ? parsedObject.notes : [],
  };
};

export const parseScanSummary = (stdout, sourceName) => parseScanOutput(stdout, sourceName).summary;

export const SCAN_OUTPUT_SCHEMA_VERSION_VALUE = SCAN_OUTPUT_SCHEMA_VERSION;
