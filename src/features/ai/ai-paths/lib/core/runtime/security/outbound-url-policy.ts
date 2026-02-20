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

const LOCAL_HOSTS = new Set<string>([
  'localhost',
  'localhost.localdomain',
  'host.docker.internal',
  'metadata.google.internal',
  'metadata',
]);

const PRIVATE_METADATA_IPS = new Set<string>([
  '169.254.169.254',
  '100.100.100.200',
]);

const parseHostRules = (raw: string | undefined): OutboundHostRule[] => {
  if (!raw || raw.trim().length === 0) return [];
  return raw
    .split(',')
    .map((entry: string): string => entry.trim().toLowerCase())
    .filter((entry: string): boolean => entry.length > 0)
    .map((entry: string): OutboundHostRule => ({
      raw: entry,
      suffix: entry.startsWith('*.') && entry.length > 2,
      value: entry.startsWith('*.') ? entry.slice(1) : entry,
    }));
};

const matchesHostRule = (hostname: string, rule: OutboundHostRule): boolean => {
  if (!rule.suffix) return hostname === rule.value;
  return hostname.endsWith(rule.value);
};

const IPV4_PATTERN = /^(\d{1,3})(\.\d{1,3}){3}$/;

const isPrivateIpv4 = (hostname: string): boolean => {
  if (!IPV4_PATTERN.test(hostname)) return false;
  const octets = hostname.split('.').map((entry: string): number => Number.parseInt(entry, 10));
  if (octets.length !== 4) return false;
  if (octets.some((entry: number): boolean => !Number.isFinite(entry) || entry < 0 || entry > 255)) {
    return false;
  }
  const [a, b] = octets;
  if (a === undefined || b === undefined) return false;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
};

const isPrivateIpv6 = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    if (mapped && isPrivateIpv4(mapped)) return true;
  }
  return false;
};

const normalizeHostname = (hostname: string): string => {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
};

export const evaluateOutboundUrlPolicy = (
  rawUrl: string
): OutboundUrlPolicyDecision => {
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
  } catch {
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
  const allowMatched = allowRules.some((rule: OutboundHostRule): boolean => matchesHostRule(hostname, rule));
  const denyMatched = denyRules.some((rule: OutboundHostRule): boolean => matchesHostRule(hostname, rule));

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
