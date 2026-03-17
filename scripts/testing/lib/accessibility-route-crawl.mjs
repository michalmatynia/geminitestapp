import { sanitizeRuntimeToken } from './runtime-broker.mjs';

const VALID_AUDIENCES = new Set(['public', 'admin']);

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeOptionalString = (value) => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const parseRouteIdFilter = (value) => {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[,\s]+/)
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
};

export const buildAccessibilityRouteCrawlTitle = (routeEntry) =>
  `[${routeEntry.id}] ${routeEntry.route} passes the route-crawl accessibility scan`;

export const buildAccessibilityRouteCrawlHeartbeatLine = ({
  elapsedMs,
  baseUrl,
  agentId,
  leaseKey,
  formatDuration,
}) => {
  const details = [
    `elapsed=${formatDuration(elapsedMs)}`,
    baseUrl ? `baseUrl=${baseUrl}` : null,
    agentId ? `agent=${agentId}` : null,
    leaseKey ? `lease=${leaseKey}` : null,
  ].filter(Boolean);

  return `[accessibility-route-crawl] still running ${details.join(' ')}`;
};

export const resolveAccessibilityRouteCrawlAgentId = ({
  env = process.env,
  defaultAgentId = 'local',
} = {}) => {
  const override = normalizeString(
    env['PLAYWRIGHT_ROUTE_CRAWL_AGENT_ID'] ?? env['PLAYWRIGHT_RUNTIME_AGENT_ID']
  );
  if (override) {
    return sanitizeRuntimeToken(override, 'route-crawl');
  }

  return sanitizeRuntimeToken(`${defaultAgentId}-route-crawl`, 'route-crawl');
};

export const normalizeAccessibilityRouteEntries = (entries) => {
  if (!Array.isArray(entries)) {
    throw new Error('Accessibility route crawl config must export an array of route entries.');
  }

  const seenIds = new Set();
  const seenRoutes = new Set();

  return entries.map((entry, index) => {
    const id = normalizeString(entry?.id) || `route-${index + 1}`;
    const name = normalizeString(entry?.name) || id;
    const route = normalizeString(entry?.route);
    const audience = normalizeString(entry?.audience).toLowerCase() || 'public';
    const readySelector = normalizeOptionalString(entry?.readySelector);
    const contextSelector = normalizeOptionalString(entry?.contextSelector);

    if (!route.startsWith('/')) {
      throw new Error(`Accessibility route crawl entry "${id}" must declare a route starting with "/".`);
    }

    if (!VALID_AUDIENCES.has(audience)) {
      throw new Error(
        `Accessibility route crawl entry "${id}" has invalid audience "${audience}". Expected "public" or "admin".`
      );
    }

    if (seenIds.has(id)) {
      throw new Error(`Accessibility route crawl config contains duplicate id "${id}".`);
    }
    if (seenRoutes.has(route)) {
      throw new Error(`Accessibility route crawl config contains duplicate route "${route}".`);
    }

    seenIds.add(id);
    seenRoutes.add(route);

    return {
      id,
      name,
      route,
      audience,
      readySelector,
      contextSelector,
    };
  });
};

export const filterAccessibilityRouteEntries = (routeEntries, { env = process.env } = {}) => {
  const includeIds = parseRouteIdFilter(env['PLAYWRIGHT_ROUTE_CRAWL_IDS']);
  if (includeIds.length === 0) {
    return routeEntries;
  }

  const includeSet = new Set(includeIds);
  const filtered = routeEntries.filter((entry) => includeSet.has(entry.id));
  const missing = includeIds.filter((id) => !routeEntries.some((entry) => entry.id === id));

  if (missing.length > 0) {
    throw new Error(
      `Accessibility route crawl ids not found: ${missing.join(', ')}. Check PLAYWRIGHT_ROUTE_CRAWL_IDS.`
    );
  }

  return filtered;
};

const flattenSuites = (suites = []) => {
  const allSuites = [];
  for (const suite of suites) {
    allSuites.push(suite);
    if (Array.isArray(suite?.suites) && suite.suites.length > 0) {
      allSuites.push(...flattenSuites(suite.suites));
    }
  }
  return allSuites;
};

const flattenSpecs = (suites = []) =>
  flattenSuites(suites).flatMap((suite) => (Array.isArray(suite?.specs) ? suite.specs : []));

const summarizeSpec = (spec) => {
  const tests = Array.isArray(spec?.tests) ? spec.tests : [];
  const results = tests.flatMap((test) => (Array.isArray(test?.results) ? test.results : []));
  const statuses = results.map((result) => result?.status ?? 'unknown');
  const failed = statuses.some((status) => status !== 'passed');

  const errors = results.flatMap((result) =>
    Array.isArray(result?.errors)
      ? result.errors
          .map((error) => normalizeString(error?.message) || normalizeString(error?.stack) || null)
          .filter(Boolean)
      : []
  );

  return {
    status: failed ? 'fail' : 'pass',
    durationMs: results.reduce(
      (total, result) => total + (Number.isFinite(result?.duration) ? result.duration : 0),
      0
    ),
    errors,
  };
};

export const summarizeAccessibilityRouteCrawlReport = ({
  report,
  routeEntries,
  stderr = '',
  command = '',
}) => {
  const normalizedRoutes = normalizeAccessibilityRouteEntries(routeEntries);
  const specs = flattenSpecs(report?.suites ?? []);
  const specByTitle = new Map(specs.map((spec) => [normalizeString(spec?.title), spec]));

  const results = normalizedRoutes.map((routeEntry) => {
    const title = buildAccessibilityRouteCrawlTitle(routeEntry);
    const spec = specByTitle.get(title);

    if (!spec) {
      return {
        ...routeEntry,
        title,
        status: 'fail',
        durationMs: 0,
        errors: [`No Playwright result was recorded for ${title}.`],
      };
    }

    const summary = summarizeSpec(spec);
    return {
      ...routeEntry,
      title,
      status: summary.status,
      durationMs: summary.durationMs,
      errors: summary.errors,
    };
  });

  const passed = results.filter((result) => result.status === 'pass').length;
  const failed = results.length - passed;
  const externalErrors = Array.isArray(report?.errors)
    ? report.errors
        .map((error) => normalizeString(error?.message) || normalizeString(error?.value) || null)
        .filter(Boolean)
    : [];

  return {
    status: failed > 0 || externalErrors.length > 0 ? 'failed' : 'passed',
    summary: {
      total: results.length,
      passed,
      failed,
      durationMs: Number.isFinite(report?.stats?.duration) ? report.stats.duration : 0,
      unexpected: Number.isFinite(report?.stats?.unexpected) ? report.stats.unexpected : failed,
      flaky: Number.isFinite(report?.stats?.flaky) ? report.stats.flaky : 0,
      skipped: Number.isFinite(report?.stats?.skipped) ? report.stats.skipped : 0,
      errorCount:
        results.reduce((total, result) => total + result.errors.length, 0) + externalErrors.length,
    },
    command,
    stderr: normalizeString(stderr),
    externalErrors,
    results,
  };
};
