export type JobBoardOrigin = {
  className: string;
  label: string;
  shortLabel: string;
  sourceSite: string;
  sourceUrl: string;
};

const normalizeOriginString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const hostFromUrl = (value: string): string => {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./u, '');
  } catch {
    return '';
  }
};

const normalizeSourceKey = (value: unknown): string => {
  const normalized = normalizeOriginString(value).toLowerCase().replace(/^www\./u, '');
  if (normalized.includes('pracuj.pl')) return 'pracuj.pl';
  if (normalized.includes('justjoin.it')) return 'justjoin.it';
  if (normalized.includes('nofluffjobs')) return 'nofluffjobs.com';
  return normalized;
};

const sourceKeyFromInput = (input: {
  sourceLabel?: unknown;
  sourceSite?: unknown;
  sourceUrl?: unknown;
}): string => {
  const siteKey = normalizeSourceKey(input.sourceSite);
  if (siteKey.length > 0) return siteKey;
  const labelKey = normalizeSourceKey(input.sourceLabel);
  if (labelKey.length > 0) return labelKey;
  return normalizeSourceKey(hostFromUrl(normalizeOriginString(input.sourceUrl)));
};

const fallbackLabel = (input: {
  sourceLabel?: unknown;
  sourceSite?: unknown;
  sourceUrl?: unknown;
}): string => {
  const label = normalizeOriginString(input.sourceLabel);
  if (label.length > 0) return label;
  const site = normalizeOriginString(input.sourceSite);
  if (site.length > 0) return site;
  const host = hostFromUrl(normalizeOriginString(input.sourceUrl));
  return host.length > 0 ? host : 'Job board';
};

export const resolveJobBoardOrigin = (input: {
  sourceLabel?: unknown;
  sourceSite?: unknown;
  sourceUrl?: unknown;
}): JobBoardOrigin | null => {
  const sourceUrl = normalizeOriginString(input.sourceUrl);
  const sourceSite = normalizeOriginString(input.sourceSite);
  const key = sourceKeyFromInput(input);
  if (key.length === 0 && sourceUrl.length === 0) return null;
  if (key === 'pracuj.pl') {
    return {
      className: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
      label: 'Pracuj.pl',
      shortLabel: 'P',
      sourceSite: sourceSite || 'pracuj.pl',
      sourceUrl,
    };
  }
  if (key === 'justjoin.it') {
    return {
      className: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
      label: 'Just Join IT',
      shortLabel: 'JJ',
      sourceSite: sourceSite || 'justjoin.it',
      sourceUrl,
    };
  }
  if (key === 'nofluffjobs.com') {
    return {
      className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
      label: 'No Fluff Jobs',
      shortLabel: 'NF',
      sourceSite: sourceSite || 'nofluffjobs.com',
      sourceUrl,
    };
  }
  const label = fallbackLabel(input);
  return {
    className: 'border-white/15 bg-white/5 text-gray-200',
    label,
    shortLabel: label.slice(0, 2).toUpperCase(),
    sourceSite: sourceSite || key,
    sourceUrl,
  };
};

export const resolveJobBoardOriginLabel = (input: {
  sourceLabel?: unknown;
  sourceSite?: unknown;
  sourceUrl?: unknown;
}): string | undefined => resolveJobBoardOrigin(input)?.label;
