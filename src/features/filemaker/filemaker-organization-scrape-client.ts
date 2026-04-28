export type OrganizationEmailScrapeResponse = {
  promoted?: Array<{ status?: string }>;
  skipped?: Array<{ reason?: string }>;
  runId?: string | null;
  websiteDiscovery?: {
    persisted?: {
      linked?: unknown[];
    } | null;
  } | null;
};

export type OrganizationWebsiteSocialScrapeResponse = {
  persisted?: {
    linked?: unknown[];
    skipped?: unknown[];
  } | null;
  socialProfiles?: unknown[];
  websites?: unknown[];
};

export type ScrapeToast = { message: string; variant: 'success' | 'warning' };

type WebsiteSocialScrapeCounts = {
  linkedCount: number;
  skippedCount: number;
  socialCount: number;
  websiteCount: number;
};

const countItems = (items: readonly unknown[] | null | undefined): number =>
  Array.isArray(items) ? items.length : 0;

const buildCountLabel = (count: number, singularLabel: string): string =>
  `${count} ${singularLabel}${count === 1 ? '' : 's'}`;

const countPromotedStatus = (
  promoted: Array<{ status?: string }>,
  status: string
): number => promoted.filter((item) => item.status === status).length;

const getOrganizationEmailScrapeDiscoveryLinkCount = (
  result: OrganizationEmailScrapeResponse
): number => result.websiteDiscovery?.persisted?.linked?.length ?? 0;

const buildOrganizationEmailScrapeDiscoverySuffix = (count: number): string =>
  count > 0 ? ` ${count} website/social link${count === 1 ? '' : 's'} updated.` : '';

export const buildOrganizationEmailScrapeToast = (
  result: OrganizationEmailScrapeResponse
): ScrapeToast => {
  const promoted = result.promoted ?? [];
  const createdCount = countPromotedStatus(promoted, 'created');
  const linkedCount = countPromotedStatus(promoted, 'linked');
  const alreadyLinkedCount = countPromotedStatus(promoted, 'already-linked');
  const skippedCount = result.skipped?.length ?? 0;
  const discoveredLinkCount = getOrganizationEmailScrapeDiscoveryLinkCount(result);
  const promotedCount = createdCount + linkedCount + alreadyLinkedCount;
  const discoverySuffix = buildOrganizationEmailScrapeDiscoverySuffix(discoveredLinkCount);
  const message =
    promotedCount === 0 && skippedCount === 0
      ? `Email scrape finished: no email addresses found.${discoverySuffix}`
      : `Email scrape finished: ${createdCount} created, ${linkedCount} linked, ${alreadyLinkedCount} already linked, ${skippedCount} skipped.${discoverySuffix}`;
  return {
    message,
    variant: promotedCount === 0 && discoveredLinkCount === 0 ? 'warning' : 'success',
  };
};

const getOrganizationWebsiteSocialScrapeCounts = (
  result: OrganizationWebsiteSocialScrapeResponse
): WebsiteSocialScrapeCounts => ({
  linkedCount: countItems(result.persisted?.linked),
  skippedCount: countItems(result.persisted?.skipped),
  socialCount: countItems(result.socialProfiles),
  websiteCount: countItems(result.websites),
});

const getOrganizationWebsiteSocialScrapeToastVariant = (
  counts: WebsiteSocialScrapeCounts
): ScrapeToast['variant'] => {
  const hasDiscovery =
    counts.linkedCount > 0 || counts.websiteCount > 0 || counts.socialCount > 0;
  return hasDiscovery ? 'success' : 'warning';
};

const buildOrganizationWebsiteSocialScrapeMessage = (
  counts: WebsiteSocialScrapeCounts
): string => {
  const parts = [
    buildCountLabel(counts.websiteCount, 'website candidate'),
    buildCountLabel(counts.socialCount, 'social profile'),
    `${buildCountLabel(counts.linkedCount, 'link')} updated`,
    `${counts.skippedCount} skipped`,
  ];
  return `Website/social scrape finished: ${parts.join(', ')}.`;
};

export const buildOrganizationWebsiteSocialScrapeToast = (
  result: OrganizationWebsiteSocialScrapeResponse
): ScrapeToast => {
  const counts = getOrganizationWebsiteSocialScrapeCounts(result);
  return {
    message: buildOrganizationWebsiteSocialScrapeMessage(counts),
    variant: getOrganizationWebsiteSocialScrapeToastVariant(counts),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const readStringField = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readJsonErrorMessage = async (
  response: Response,
  fallback: string
): Promise<string> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return fallback;
  try {
    const body = (await response.json()) as unknown;
    if (!isRecord(body)) return fallback;
    return readStringField(body, 'error') ?? readStringField(body, 'message') ?? fallback;
  } catch {
    return fallback;
  }
};

export const readOrganizationEmailScrapeErrorMessage = async (
  response: Response
): Promise<string> =>
  readJsonErrorMessage(response, `Email scrape failed (${response.status}).`);

export const readOrganizationWebsiteSocialScrapeErrorMessage = async (
  response: Response
): Promise<string> =>
  readJsonErrorMessage(response, `Website/social scrape failed (${response.status}).`);
