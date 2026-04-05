const LOOPBACK_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', '127.0.0.1', '::1']);

const normalizeHostname = (hostname: string): string =>
  hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');

export const isLoopbackHostname = (hostname: string): boolean =>
  LOOPBACK_HOSTNAMES.has(normalizeHostname(hostname));

export const resolveTrustedSelfOriginHost = (params: {
  requestUrl: string;
  candidateUrl: string;
}): string | null => {
  try {
    const request = new URL(params.requestUrl);
    const candidate = new URL(params.candidateUrl);
    const requestHost = request.host.trim().toLowerCase();
    const candidateHost = candidate.host.trim().toLowerCase();
    if (!requestHost || !candidateHost) {
      return null;
    }

    if (requestHost === candidateHost) {
      return candidateHost;
    }

    const portsMatch = request.port === candidate.port;
    if (portsMatch && isLoopbackHostname(request.hostname) && isLoopbackHostname(candidate.hostname)) {
      return candidateHost;
    }

    return null;
  } catch {
    return null;
  }
};
