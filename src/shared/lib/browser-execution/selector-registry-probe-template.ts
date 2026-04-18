import type {
  SelectorRegistryProbeSession,
  SelectorRegistryRole,
} from '@/shared/contracts/integrations/selector-registry';

export type SelectorRegistryProbeTemplateFingerprint = {
  clusterKey: string;
  host: string;
  normalizedPath: string;
  roleSignature: SelectorRegistryRole[];
};

const normalizeProbeTemplateSegment = (segment: string): string => {
  let next = segment.trim().toLowerCase();
  if (next.length === 0) return next;
  next = next.replace(/[a-f0-9]{8,}/gi, ':id');
  next = next.replace(/\d+/g, ':n');
  return next;
};

export const normalizeProbeTemplatePath = (value: string): string => {
  try {
    const url = new URL(value);
    const normalized = url.pathname
      .split('/')
      .filter((segment) => segment.trim().length > 0)
      .map(normalizeProbeTemplateSegment)
      .join('/');
    return normalized.length > 0 ? `/${normalized}` : '/';
  } catch {
    return '/';
  }
};

const readProbeTemplateHost = (value: string): string => {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return 'unknown-host';
  }
};

export const readProbeRoleSignature = (
  session: Pick<SelectorRegistryProbeSession, 'suggestions'>
): SelectorRegistryRole[] =>
  Array.from(new Set(session.suggestions.map((suggestion) => suggestion.classificationRole))).sort(
    (left, right) => left.localeCompare(right)
  );

export const buildSelectorRegistryProbeTemplateFingerprint = (
  session: Pick<SelectorRegistryProbeSession, 'sourceUrl' | 'suggestions'>
): SelectorRegistryProbeTemplateFingerprint => {
  const host = readProbeTemplateHost(session.sourceUrl);
  const normalizedPath = normalizeProbeTemplatePath(session.sourceUrl);
  const roleSignature = readProbeRoleSignature(session);
  return {
    clusterKey: `${host}|${normalizedPath}|${roleSignature.join(',')}`,
    host,
    normalizedPath,
    roleSignature,
  };
};
