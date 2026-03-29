import { reportObservabilityInternalError } from '@/shared/utils/observability/internal-observability-fallback';
type OutboundHostRule = {
  raw: string;
  suffix: boolean;
  value: string;
};

export type OutboundUrlPolicyDecision = {
  allowed: boolean;
  reason: string | null;
  hostname: string | null;
  normalizedUrl: string | null;
};

export class OutboundUrlPolicyError extends Error {
  decision: OutboundUrlPolicyDecision;

  constructor(message: string, decision: OutboundUrlPolicyDecision) {
    super(message);
    this.name = 'OutboundUrlPolicyError';
    this.decision = decision;
  }
}

const LOCAL_HOSTS = new Set<string>([
  'localhost',
  'localhost.localdomain',
  'host.docker.internal',
  'metadata.google.internal',
  'metadata',
]);

const PRIVATE_METADATA_IPS = new Set<string>(['169.254.169.254', '100.100.100.200']);

/**
 * Returns the set of `host` strings (hostname[:port]) that belong to this app's own
 * configured asset origin.  Only AI_PATHS_ASSET_BASE_URL is consulted so that broader
 * AI_PATHS_ASSET_BASE_URL takes priority; NEXT_PUBLIC_APP_URL is used as fallback so that
 * features like Kangur Social batch capture can screenshot the app's own pages without
 * requiring a separate env var in every environment.
 *
 * Set AI_PATHS_ASSET_BASE_URL to override the self-origin (e.g. a public tunnel URL).
 * Only the exact host:port is allowed — other localhost ports remain blocked.
 *
 * Evaluated on every call (no module-level cache) so that tests can override env vars.
 */
const resolveAppSelfOriginHosts = (): Set<string> => {
  const envCandidates: (string | null | undefined)[] = [
    process.env['AI_PATHS_ASSET_BASE_URL'],
    process.env['NEXT_PUBLIC_APP_URL'],
  ];
  const hosts = new Set<string>();
  for (const candidate of envCandidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    try {
      const raw = candidate.trim();
      const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `https://${raw}`;
      const parsed = new URL(withProtocol);
      // Store host (hostname:port) for precise matching — avoids allowing every port on localhost.
      const host = parsed.host.toLowerCase();
      if (host) hosts.add(host);
    } catch (error) {
      reportObservabilityInternalError(error, {
        source: 'outbound-url-policy',
        action: 'resolveAppSelfOriginHosts',
        service: 'security.outbound-url-policy',
      });

      // Unparseable env value — skip.
    }
  }
  return hosts;
};

const parseHostRules = (raw: string | undefined): OutboundHostRule[] => {
  if (!raw || raw.trim().length === 0) return [];
  return raw
    .split(',')
    .map((entry: string): string => entry.trim().toLowerCase())
    .filter((entry: string): boolean => entry.length > 0)
    .map(
      (entry: string): OutboundHostRule => ({
        raw: entry,
        suffix: entry.startsWith('*.') && entry.length > 2,
        value: entry.startsWith('*.') ? entry.slice(1) : entry,
      })
    );
};

const matchesHostRule = (hostname: string, rule: OutboundHostRule): boolean => {
  if (!rule.suffix) return hostname === rule.value;
  return hostname.endsWith(rule.value);
};

const IPV4_PATTERN = /^(\d{1,3})(\.\d{1,3}){3}$/;

type Ipv4Octets = [number, number, number, number];

const parseIpv4Octets = (hostname: string): Ipv4Octets | null => {
  if (!IPV4_PATTERN.test(hostname)) {
    return null;
  }

  const octets = hostname.split('.').map((entry: string): number => Number.parseInt(entry, 10));
  if (
    octets.length !== 4 ||
    octets.some((entry: number): boolean => !Number.isFinite(entry) || entry < 0 || entry > 255)
  ) {
    return null;
  }

  const [a, b, c, d] = octets;
  if ([a, b, c, d].some((entry) => entry === undefined)) {
    return null;
  }

  return [a, b, c, d];
};

const IPV4_PRIVATE_RANGE_MATCHERS: ReadonlyArray<(octets: Ipv4Octets) => boolean> = [
  ([a]) => a === 10,
  ([a]) => a === 127,
  ([a]) => a === 0,
  ([a, b]) => a === 169 && b === 254,
  ([a, b]) => a === 172 && b >= 16 && b <= 31,
  ([a, b]) => a === 192 && b === 168,
  ([a, b]) => a === 100 && b >= 64 && b <= 127,
];

const isPrivateIpv4 = (hostname: string): boolean => {
  const octets = parseIpv4Octets(hostname);
  return octets ? IPV4_PRIVATE_RANGE_MATCHERS.some((matches) => matches(octets)) : false;
};

const isLoopbackIpv6 = (hostname: string): boolean =>
  hostname === '::1' || hostname === '::';

const isLinkLocalIpv6 = (hostname: string): boolean =>
  hostname.startsWith('fe80:');

const isUniqueLocalIpv6 = (hostname: string): boolean =>
  hostname.startsWith('fc') || hostname.startsWith('fd');

const decodeMappedIpv6HexToIpv4 = (value: string): string | null => {
  const parts = value.split(':');
  if (
    parts.length !== 2 ||
    parts.some((part) => !/^[\da-f]{1,4}$/i.test(part))
  ) {
    return null;
  }

  const high = Number.parseInt(parts[0] ?? '', 16);
  const low = Number.parseInt(parts[1] ?? '', 16);
  if (!Number.isFinite(high) || !Number.isFinite(low)) {
    return null;
  }

  return [
    (high >> 8) & 0xff,
    high & 0xff,
    (low >> 8) & 0xff,
    low & 0xff,
  ].join('.');
};

const isMappedPrivateIpv6 = (hostname: string): boolean => {
  if (!hostname.startsWith('::ffff:')) {
    return false;
  }

  const mapped = hostname.slice('::ffff:'.length);
  if (!mapped) {
    return false;
  }

  return isPrivateIpv4(mapped) || isPrivateIpv4(decodeMappedIpv6HexToIpv4(mapped) ?? '');
};

const IPV6_PRIVATE_MATCHERS: ReadonlyArray<(hostname: string) => boolean> = [
  isLoopbackIpv6,
  isLinkLocalIpv6,
  isUniqueLocalIpv6,
  isMappedPrivateIpv6,
];

const isPrivateIpv6 = (hostname: string): boolean =>
  IPV6_PRIVATE_MATCHERS.some((matches) => matches(hostname.toLowerCase()));

const normalizeHostname = (hostname: string): string => {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
};

const isRedirectStatus = (status: number): boolean =>
  status === 301 || status === 302 || status === 303 || status === 307 || status === 308;

export const evaluateOutboundUrlPolicy = (rawUrl: string): OutboundUrlPolicyDecision => {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) {
    return {
      allowed: false,
      reason: 'missing_url',
      hostname: null,
      normalizedUrl: null,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch (error) {
    reportObservabilityInternalError(error, {
      source: 'outbound-url-policy',
      action: 'evaluateOutboundUrlPolicy',
      service: 'security.outbound-url-policy',
      rawUrl: trimmedUrl,
    });
    return {
      allowed: false,
      reason: 'invalid_url',
      hostname: null,
      normalizedUrl: null,
    };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'https:' && protocol !== 'http:') {
    return {
      allowed: false,
      reason: 'unsupported_scheme',
      hostname: null,
      normalizedUrl: parsed.toString(),
    };
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) {
    return {
      allowed: false,
      reason: 'missing_hostname',
      hostname: null,
      normalizedUrl: parsed.toString(),
    };
  }

  const allowRules = parseHostRules(process.env['AI_PATHS_OUTBOUND_ALLOWED_HOSTS']);
  const denyRules = parseHostRules(process.env['AI_PATHS_OUTBOUND_DENY_HOSTS']);
  const allowMatched = allowRules.some((rule: OutboundHostRule): boolean =>
    matchesHostRule(hostname, rule)
  );
  const denyMatched = denyRules.some((rule: OutboundHostRule): boolean =>
    matchesHostRule(hostname, rule)
  );

  if (denyMatched) {
    return {
      allowed: false,
      reason: 'denylist_blocked',
      hostname,
      normalizedUrl: parsed.toString(),
    };
  }

  if (allowMatched) {
    return {
      allowed: true,
      reason: null,
      hostname,
      normalizedUrl: parsed.toString(),
    };
  }

  // Allow the app's own configured asset origin (AI_PATHS_ASSET_BASE_URL).
  // Compared by host (hostname:port) so that only the exact configured port is allowed,
  // which prevents accidentally opening unrelated localhost services (e.g. Ollama on :11434).
  // Must come after the denylist check so admins can still explicitly deny self-origin.
  const selfOriginHosts = resolveAppSelfOriginHosts();
  if (selfOriginHosts.size > 0 && selfOriginHosts.has(parsed.host.toLowerCase())) {
    return {
      allowed: true,
      reason: null,
      hostname,
      normalizedUrl: parsed.toString(),
    };
  }

  if (LOCAL_HOSTS.has(hostname) || hostname.endsWith('.localhost')) {
    return {
      allowed: false,
      reason: 'local_hostname_blocked',
      hostname,
      normalizedUrl: parsed.toString(),
    };
  }

  if (PRIVATE_METADATA_IPS.has(hostname)) {
    return {
      allowed: false,
      reason: 'metadata_ip_blocked',
      hostname,
      normalizedUrl: parsed.toString(),
    };
  }

  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    return {
      allowed: false,
      reason: 'private_ip_blocked',
      hostname,
      normalizedUrl: parsed.toString(),
    };
  }

  return {
    allowed: true,
    reason: null,
    hostname,
    normalizedUrl: parsed.toString(),
  };
};

export const assertOutboundUrlAllowed = (rawUrl: string): OutboundUrlPolicyDecision => {
  const decision = evaluateOutboundUrlPolicy(rawUrl);
  if (decision.allowed) return decision;
  throw new OutboundUrlPolicyError(
    `Outbound URL blocked by policy (${decision.reason ?? 'unknown_reason'}): ${rawUrl}`,
    decision
  );
};

const buildOutboundFetchRequestInit = (
  init?: Omit<RequestInit, 'redirect'> & { maxRedirects?: number; fetchImpl?: typeof fetch }
): RequestInit => {
  const requestInit: RequestInit = {
    ...init,
    redirect: 'manual',
  };

  delete (requestInit as Record<string, unknown>)['maxRedirects'];
  delete (requestInit as Record<string, unknown>)['fetchImpl'];

  return requestInit;
};

const resolveRedirectLocation = (response: Response): string | null =>
  response.headers.get('location');

const resolveNextOutboundRedirectUrl = (args: {
  currentUrl: string;
  location: string;
}): string => new URL(args.location, args.currentUrl).toString();

const assertRedirectLimitNotExceeded = (args: {
  maxRedirects: number;
  redirectCount: number;
}): void => {
  if (args.redirectCount === args.maxRedirects) {
    throw new Error(`Outbound fetch exceeded redirect limit (${args.maxRedirects}).`);
  }
};

export const fetchWithOutboundUrlPolicy = async (
  rawUrl: string,
  init?: Omit<RequestInit, 'redirect'> & { maxRedirects?: number; fetchImpl?: typeof fetch }
): Promise<Response> => {
  const maxRedirects = Math.max(0, Math.trunc(init?.maxRedirects ?? 5));
  const fetchImpl = init?.fetchImpl ?? fetch;
  const requestInit = buildOutboundFetchRequestInit(init);

  let currentUrl = rawUrl;
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    assertOutboundUrlAllowed(currentUrl);
    const response = await fetchImpl(currentUrl, requestInit);

    if (!isRedirectStatus(response.status)) {
      return response;
    }

    const location = resolveRedirectLocation(response);
    if (!location) {
      return response;
    }

    assertRedirectLimitNotExceeded({ maxRedirects, redirectCount });
    currentUrl = resolveNextOutboundRedirectUrl({ currentUrl, location });
  }

  throw new Error('Outbound fetch failed before completion.');
};
