import { promises as dns } from 'dns';
import { domainToASCII } from 'url';

import { mapWithConcurrency } from './filemaker-email-mx-verifier-batch';

export type MxLookupOutcome = 'mx' | 'address-only' | 'null-mx' | 'none' | 'timeout' | 'error';

export type MxLookupResult = {
  outcome: MxLookupOutcome;
  hasMail: boolean;
};

export type MxVerifier = {
  hasMx: (domain: string) => Promise<boolean>;
  lookup: (domain: string) => Promise<MxLookupResult>;
  lookupMany?: (domainsOrAddresses: readonly string[]) => Promise<MxLookupResult[]>;
};

export type MxRecord = { exchange: string; priority?: number };
export type MxResolver = (domain: string) => Promise<readonly MxRecord[]>;
export type ARecordResolver = (domain: string) => Promise<readonly string[]>;
export type AaaaRecordResolver = (domain: string) => Promise<readonly string[]>;

export type MxVerifierOptions = {
  resolveMx?: MxResolver;
  resolveA?: ARecordResolver;
  resolveAaaa?: AaaaRecordResolver;
  timeoutMs?: number;
  cacheTtlMs?: number;
  transientCacheTtlMs?: number;
  maxConcurrentLookups?: number;
  now?: () => number;
};

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_TRANSIENT_CACHE_TTL_MS = 0;
const DEFAULT_MAX_CONCURRENT_LOOKUPS = 8;

const TIMEOUT_SENTINEL: unique symbol = Symbol('mx-timeout');
type TimeoutSentinel = typeof TIMEOUT_SENTINEL;

const DNS_NO_DATA_CODES = new Set(['ENODATA', 'ENOTFOUND', 'ENONAME', 'ENODOMAIN', 'NXDOMAIN', 'NODATA']);
const DNS_TIMEOUT_CODES = new Set(['ETIMEOUT', 'ETIMEDOUT', 'TIMEOUT']);
const DNS_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const defaultMxResolver: MxResolver = async (domain) => dns.resolveMx(domain);
const defaultAResolver: ARecordResolver = async (domain) => dns.resolve4(domain);
const defaultAaaaResolver: AaaaRecordResolver = async (domain) => dns.resolve6(domain);

const DEFAULT_RUNTIME_OPTIONS: Required<MxVerifierOptions> = {
  resolveMx: defaultMxResolver,
  resolveA: defaultAResolver,
  resolveAaaa: defaultAaaaResolver,
  timeoutMs: DEFAULT_TIMEOUT_MS,
  cacheTtlMs: DEFAULT_CACHE_TTL_MS,
  transientCacheTtlMs: DEFAULT_TRANSIENT_CACHE_TTL_MS,
  maxConcurrentLookups: DEFAULT_MAX_CONCURRENT_LOOKUPS,
  now: () => Date.now(),
};

const normalizeDurationMs = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback;

const normalizePositiveInteger = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : fallback;

const extractAddressCandidate = (value: string): string => {
  let candidate = value.trim();
  const angleMatch = candidate.match(/<([^<>]+)>/);
  if (angleMatch) candidate = angleMatch[1].trim();
  if (candidate.toLowerCase().startsWith('mailto:')) {
    candidate = candidate.slice('mailto:'.length);
    const queryStart = candidate.indexOf('?');
    if (queryStart >= 0) candidate = candidate.slice(0, queryStart);
  }
  return candidate.toLowerCase();
};

const extractDomain = (value: string): string => {
  const trimmed = extractAddressCandidate(value);
  const at = trimmed.lastIndexOf('@');
  const domain = at >= 0 ? trimmed.slice(at + 1) : trimmed;
  const withoutTrailingDot = domain.replace(/\.+$/u, '');
  return domainToASCII(withoutTrailingDot).toLowerCase();
};

const isResolvableDomain = (domain: string): boolean =>
  domain.length > 0 &&
  domain.length <= 253 &&
  domain.includes('.') &&
  domain
    .split('.')
    .every((label) => DNS_LABEL_RE.test(label));

const raceWithTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | TimeoutSentinel> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<TimeoutSentinel>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

type CacheEntry = {
  promise: Promise<MxLookupResult>;
  expiresAt: number;
};

type MxVerifierRuntime = {
  resolveMx: MxResolver;
  resolveA: ARecordResolver;
  resolveAaaa: AaaaRecordResolver;
  timeoutMs: number;
  cacheTtlMs: number;
  transientCacheTtlMs: number;
  maxConcurrentLookups: number;
  now: () => number;
};

type ResolverErrorResult = { code?: string; status: 'error' };
type ResolverResult<T> =
  | { records: T; status: 'ok' }
  | ResolverErrorResult;

type TimedResolverResult<T> = ResolverResult<T> | TimeoutSentinel;

const getResolverErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code.length > 0 ? code.toUpperCase() : undefined;
};

const resolveWithTimeout = async <T>(
  resolver: (domain: string) => Promise<T>,
  domain: string,
  timeoutMs: number
): Promise<TimedResolverResult<T>> =>
  raceWithTimeout(
    Promise.resolve()
      .then(() => resolver(domain))
      .then((records): ResolverResult<T> => ({ records, status: 'ok' }))
      .catch((error): ResolverResult<T> | TimeoutSentinel => {
        const code = getResolverErrorCode(error);
        if (code !== undefined && DNS_TIMEOUT_CODES.has(code)) return TIMEOUT_SENTINEL;
        return { ...(code !== undefined ? { code } : {}), status: 'error' };
      }),
    timeoutMs
  );

const resolverResultHasRecords = <T extends readonly unknown[]>(
  result: TimedResolverResult<T>
): result is { records: T; status: 'ok' } =>
  result !== TIMEOUT_SENTINEL && result.status === 'ok' && result.records.length > 0;

const resolverResultErrored = <T>(
  result: TimedResolverResult<T>
): result is ResolverErrorResult =>
  result !== TIMEOUT_SENTINEL && result.status === 'error';

const resolverResultIsNoData = <T>(result: TimedResolverResult<T>): boolean =>
  resolverResultErrored(result) &&
  result.code !== undefined &&
  DNS_NO_DATA_CODES.has(result.code);

const resolverResultHasOperationalError = <T>(result: TimedResolverResult<T>): boolean =>
  resolverResultErrored(result) && !resolverResultIsNoData(result);

const resolverResultTimedOut = <T>(result: TimedResolverResult<T>): boolean =>
  result === TIMEOUT_SENTINEL;

const normalizeMxExchange = (exchange: string): string => exchange.trim().toLowerCase();

const isNullMxRecord = (record: MxRecord): boolean =>
  normalizeMxExchange(record.exchange) === '.';

const isUsableMxRecord = (record: MxRecord): boolean => {
  const exchange = normalizeMxExchange(record.exchange);
  return exchange.length > 0 && exchange !== '.';
};

const interpretMxResult = (
  result: TimedResolverResult<readonly MxRecord[]>
): MxLookupResult | null => {
  if (result === TIMEOUT_SENTINEL) return { outcome: 'timeout', hasMail: false };
  if (result.status !== 'ok') return null;
  if (result.records.some(isUsableMxRecord)) return { outcome: 'mx', hasMail: true };
  if (result.records.length > 0 && result.records.every(isNullMxRecord)) {
    return { outcome: 'null-mx', hasMail: false };
  }
  return null;
};

const interpretAddressResults = (input: {
  a: TimedResolverResult<readonly string[]>;
  aaaa: TimedResolverResult<readonly string[]>;
  mx: TimedResolverResult<readonly MxRecord[]>;
}): MxLookupResult => {
  const addressResults = [input.a, input.aaaa];
  if (addressResults.some(resolverResultTimedOut)) {
    return { outcome: 'timeout', hasMail: false };
  }
  if (resolverResultHasOperationalError(input.mx)) {
    return { outcome: 'error', hasMail: false };
  }
  if (addressResults.some(resolverResultHasRecords)) {
    return { outcome: 'address-only', hasMail: true };
  }
  if (addressResults.some(resolverResultHasOperationalError)) {
    return { outcome: 'error', hasMail: false };
  }
  return { outcome: 'none', hasMail: false };
};

const normalizeMxVerifierRuntime = (options: MxVerifierOptions): MxVerifierRuntime => {
  const merged = { ...DEFAULT_RUNTIME_OPTIONS, ...options };
  return {
    resolveMx: merged.resolveMx,
    resolveA: merged.resolveA,
    resolveAaaa: merged.resolveAaaa,
    timeoutMs: Math.max(1, normalizeDurationMs(merged.timeoutMs, DEFAULT_TIMEOUT_MS)),
    cacheTtlMs: normalizeDurationMs(merged.cacheTtlMs, DEFAULT_CACHE_TTL_MS),
    transientCacheTtlMs: normalizeDurationMs(
      merged.transientCacheTtlMs,
      DEFAULT_TRANSIENT_CACHE_TTL_MS
    ),
    maxConcurrentLookups: normalizePositiveInteger(
      merged.maxConcurrentLookups,
      DEFAULT_MAX_CONCURRENT_LOOKUPS
    ),
    now: merged.now,
  };
};

const getCacheTtlForResult = (result: MxLookupResult, runtime: MxVerifierRuntime): number =>
  result.outcome === 'timeout' || result.outcome === 'error'
    ? runtime.transientCacheTtlMs
    : runtime.cacheTtlMs;

const performLookup = async (domain: string, runtime: MxVerifierRuntime): Promise<MxLookupResult> => {
  const mxRaw = await resolveWithTimeout(runtime.resolveMx, domain, runtime.timeoutMs);
  const mxResult = interpretMxResult(mxRaw);
  if (mxResult !== null) return mxResult;

  const [aRaw, aaaaRaw] = await Promise.all([
    resolveWithTimeout(runtime.resolveA, domain, runtime.timeoutMs),
    resolveWithTimeout(runtime.resolveAaaa, domain, runtime.timeoutMs),
  ]);
  return interpretAddressResults({ a: aRaw, aaaa: aaaaRaw, mx: mxRaw });
};

const isCacheEntryFresh = (entry: CacheEntry | undefined, timestamp: number): boolean =>
  entry !== undefined && entry.expiresAt > timestamp;

const cacheLookupPromise = (input: {
  cache: Map<string, CacheEntry>;
  domain: string;
  promise: Promise<MxLookupResult>;
  runtime: MxVerifierRuntime;
  timestamp: number;
}): void => {
  const { cache, domain, promise, runtime, timestamp } = input;
  cache.set(domain, {
    promise,
    expiresAt: timestamp + Math.max(runtime.cacheTtlMs, runtime.transientCacheTtlMs, runtime.timeoutMs),
  });
  void promise.then(
    (result) => {
      const current = cache.get(domain);
      if (current?.promise !== promise) return;
      const resultTtlMs = getCacheTtlForResult(result, runtime);
      if (resultTtlMs <= 0) {
        cache.delete(domain);
        return;
      }
      current.expiresAt = runtime.now() + resultTtlMs;
    },
    () => {
      const current = cache.get(domain);
      if (current?.promise === promise) {
        cache.delete(domain);
      }
    }
  );
};

const lookupWithCache = (
  domainOrAddress: string,
  runtime: MxVerifierRuntime,
  cache: Map<string, CacheEntry>
): Promise<MxLookupResult> => {
  const domain = extractDomain(domainOrAddress);
  if (!isResolvableDomain(domain)) {
    return Promise.resolve({ outcome: 'error', hasMail: false });
  }
  const timestamp = runtime.now();
  const cached = cache.get(domain);
  if (cached !== undefined && isCacheEntryFresh(cached, timestamp)) return cached.promise;
  if (cached !== undefined) cache.delete(domain);
  const promise = performLookup(domain, runtime);
  cacheLookupPromise({ cache, domain, promise, runtime, timestamp });
  return promise;
};

export const createMxVerifier = (options: MxVerifierOptions = {}): MxVerifier => {
  const runtime = normalizeMxVerifierRuntime(options);
  const cache = new Map<string, CacheEntry>();
  const lookup = (domainOrAddress: string): Promise<MxLookupResult> =>
    lookupWithCache(domainOrAddress, runtime, cache);
  const lookupMany = (domainsOrAddresses: readonly string[]): Promise<MxLookupResult[]> =>
    mapWithConcurrency(domainsOrAddresses, lookup, runtime.maxConcurrentLookups);

  return {
    hasMx: async (domainOrAddress) => (await lookup(domainOrAddress)).hasMail,
    lookup,
    lookupMany,
  };
};
