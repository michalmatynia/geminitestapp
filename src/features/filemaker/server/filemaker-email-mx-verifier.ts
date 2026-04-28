import { promises as dns } from 'dns';
import { domainToASCII } from 'url';

export type MxLookupOutcome = 'mx' | 'address-only' | 'null-mx' | 'none' | 'timeout' | 'error';

export type MxLookupResult = {
  outcome: MxLookupOutcome;
  hasMail: boolean;
};

export type MxVerifier = {
  hasMx: (domain: string) => Promise<boolean>;
  lookup: (domain: string) => Promise<MxLookupResult>;
};

export type MxResolver = (domain: string) => Promise<readonly { exchange: string; priority?: number }[]>;
export type ARecordResolver = (domain: string) => Promise<readonly string[]>;
export type AaaaRecordResolver = (domain: string) => Promise<readonly string[]>;

export type MxVerifierOptions = {
  resolveMx?: MxResolver;
  resolveA?: ARecordResolver;
  resolveAaaa?: AaaaRecordResolver;
  timeoutMs?: number;
  cacheTtlMs?: number;
  now?: () => number;
};

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const TIMEOUT_SENTINEL: unique symbol = Symbol('mx-timeout');
type TimeoutSentinel = typeof TIMEOUT_SENTINEL;

const defaultMxResolver: MxResolver = async (domain) => dns.resolveMx(domain);
const defaultAResolver: ARecordResolver = async (domain) => dns.resolve4(domain);
const defaultAaaaResolver: AaaaRecordResolver = async (domain) => dns.resolve6(domain);

const extractDomain = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  const domain = at >= 0 ? trimmed.slice(at + 1) : trimmed;
  const withoutTrailingDot = domain.endsWith('.') ? domain.slice(0, -1) : domain;
  return domainToASCII(withoutTrailingDot).toLowerCase();
};

const isResolvableDomain = (domain: string): boolean =>
  domain.includes('.') &&
  domain
    .split('.')
    .every((label) => label.length > 0 && label.length <= 63);

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

type ResolverResult<T> =
  | { records: T; status: 'ok' }
  | { status: 'error' };

type TimedResolverResult<T> = ResolverResult<T> | TimeoutSentinel;

const resolveWithTimeout = async <T>(
  resolver: (domain: string) => Promise<T>,
  domain: string,
  timeoutMs: number
): Promise<TimedResolverResult<T>> =>
  raceWithTimeout(
    resolver(domain)
      .then((records): ResolverResult<T> => ({ records, status: 'ok' }))
      .catch((): ResolverResult<T> => ({ status: 'error' })),
    timeoutMs
  );

const resolverResultHasRecords = <T extends readonly unknown[]>(
  result: TimedResolverResult<T>
): result is { records: T; status: 'ok' } =>
  result !== TIMEOUT_SENTINEL && result.status === 'ok' && result.records.length > 0;

const resolverResultErrored = <T>(result: TimedResolverResult<T>): boolean =>
  result !== TIMEOUT_SENTINEL && result.status === 'error';

const normalizeMxExchange = (exchange: string): string => exchange.trim().toLowerCase();

const isNullMxRecord = (record: { exchange: string }): boolean =>
  normalizeMxExchange(record.exchange) === '.';

const isUsableMxRecord = (record: { exchange: string }): boolean => {
  const exchange = normalizeMxExchange(record.exchange);
  return exchange.length > 0 && exchange !== '.';
};

export const createMxVerifier = (options: MxVerifierOptions = {}): MxVerifier => {
  const resolveMx = options.resolveMx ?? defaultMxResolver;
  const resolveA = options.resolveA ?? defaultAResolver;
  const resolveAaaa = options.resolveAaaa ?? defaultAaaaResolver;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const now = options.now ?? (() => Date.now());
  const cache = new Map<string, CacheEntry>();

  const performLookup = async (domain: string): Promise<MxLookupResult> => {
    const mxRaw = await resolveWithTimeout(resolveMx, domain, timeoutMs);
    if (mxRaw === TIMEOUT_SENTINEL) return { outcome: 'timeout', hasMail: false };
    if (mxRaw.status === 'ok' && mxRaw.records.some(isUsableMxRecord)) {
      return { outcome: 'mx', hasMail: true };
    }
    if (mxRaw.status === 'ok' && mxRaw.records.length > 0 && mxRaw.records.every(isNullMxRecord)) {
      return { outcome: 'null-mx', hasMail: false };
    }

    const [aRaw, aaaaRaw] = await Promise.all([
      resolveWithTimeout(resolveA, domain, timeoutMs),
      resolveWithTimeout(resolveAaaa, domain, timeoutMs),
    ]);
    if (aRaw === TIMEOUT_SENTINEL || aaaaRaw === TIMEOUT_SENTINEL) {
      return { outcome: 'timeout', hasMail: false };
    }
    if (resolverResultHasRecords(aRaw) || resolverResultHasRecords(aaaaRaw)) {
      return { outcome: 'address-only', hasMail: true };
    }

    if (resolverResultErrored(mxRaw) && resolverResultErrored(aRaw) && resolverResultErrored(aaaaRaw)) {
      return { outcome: 'error', hasMail: false };
    }
    return { outcome: 'none', hasMail: false };
  };

  const lookup = (domainOrAddress: string): Promise<MxLookupResult> => {
    const domain = extractDomain(domainOrAddress);
    if (!isResolvableDomain(domain)) {
      return Promise.resolve({ outcome: 'error', hasMail: false });
    }
    const cached = cache.get(domain);
    const ts = now();
    if (cached && cached.expiresAt > ts) return cached.promise;
    const promise = performLookup(domain);
    cache.set(domain, { promise, expiresAt: ts + cacheTtlMs });
    return promise;
  };

  return {
    hasMx: async (domainOrAddress) => (await lookup(domainOrAddress)).hasMail,
    lookup,
  };
};
