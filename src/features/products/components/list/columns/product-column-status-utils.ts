import {
  CLOSED_STATUSES,
  FAILURE_STATUSES,
  PENDING_STATUSES,
  PROCESSING_STATUSES,
  SUCCESS_STATUSES,
  normalizeMarketplaceStatus,
} from '@/features/integrations/utils/marketplace-status';

export {
  CLOSED_STATUSES,
  FAILURE_STATUSES,
  PENDING_STATUSES,
  PROCESSING_STATUSES,
  SUCCESS_STATUSES,
  normalizeMarketplaceStatus,
};

type MarketplaceButtonKind =
  | 'base'
  | 'ecommerce'
  | 'tradera'
  | 'playwright'
  | 'vinted'
  | 'scraped';

type MarketplaceStatusInput = {
  serverStatus: string;
  localFeedbackStatus: string | null;
  submitting?: boolean;
};

type NormalizedMarketplaceStatusInput = {
  hasServerStatus: boolean;
  localFeedbackStatus: string;
  serverStatus: string;
  submitting: boolean;
};

const STATUS_TONE_CLASS_BY_GROUP = {
  success:
    'border-emerald-400/60 text-emerald-200 hover:border-emerald-300/70 hover:text-emerald-100',
  pending:
    'border-amber-400/60 text-amber-200 hover:border-amber-300/70 hover:text-amber-100',
  processing:
    'border-cyan-400/60 text-cyan-200 hover:border-cyan-300/70 hover:text-cyan-100',
  closed:
    'border-blue-500/70 text-blue-200 hover:border-blue-400/80 hover:text-blue-100',
  failure:
    'border-rose-400/60 text-rose-200 hover:border-rose-300/70 hover:text-rose-100',
} as const;

const MANAGED_STATUS_CLASS_BY_GROUP = {
  success:
    'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/80 hover:bg-emerald-500/25',
  pending:
    'border-amber-400/70 bg-amber-500/15 text-amber-100 hover:border-amber-300/80 hover:bg-amber-500/25',
  processing:
    'border-cyan-400/70 bg-cyan-500/15 text-cyan-100 hover:border-cyan-300/80 hover:bg-cyan-500/25',
  closed:
    'border-blue-700/80 bg-blue-950/45 text-blue-100 hover:border-blue-600/90 hover:bg-blue-900/45',
  failure:
    'border-rose-400/70 bg-rose-500/15 text-rose-100 hover:border-rose-300/80 hover:bg-rose-500/25',
} as const;

const MANAGED_SKY_MARKETPLACE_CLASS =
  'border-sky-400/70 bg-sky-500/15 text-sky-100 hover:border-sky-300/80 hover:bg-sky-500/25';

const MANAGED_EMERALD_MARKETPLACE_CLASS =
  'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/80 hover:bg-emerald-500/25';

const MANAGED_MARKETPLACE_CLASS: Record<MarketplaceButtonKind, string> = {
  base: MANAGED_SKY_MARKETPLACE_CLASS,
  ecommerce: MANAGED_EMERALD_MARKETPLACE_CLASS,
  tradera: MANAGED_SKY_MARKETPLACE_CLASS,
  playwright:
    'border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-100 hover:border-fuchsia-300/80 hover:bg-fuchsia-500/25',
  vinted:
    'border-teal-400/70 bg-teal-500/15 text-teal-100 hover:border-teal-300/80 hover:bg-teal-500/25',
  scraped: MANAGED_EMERALD_MARKETPLACE_CLASS,
};

const resolveStatusGroupClass = (
  normalized: string,
  classes: typeof STATUS_TONE_CLASS_BY_GROUP
): string | null => {
  if (SUCCESS_STATUSES.has(normalized)) return classes.success;
  if (PENDING_STATUSES.has(normalized)) return classes.pending;
  if (PROCESSING_STATUSES.has(normalized)) return classes.processing;
  if (CLOSED_STATUSES.has(normalized)) return classes.closed;
  if (FAILURE_STATUSES.has(normalized)) return classes.failure;
  return null;
};

const shouldPromoteCompletedLocalFeedback = (
  normalizedLocalFeedbackStatus: string,
  normalizedServerStatus: string
): boolean =>
  normalizedLocalFeedbackStatus === 'completed' && !SUCCESS_STATUSES.has(normalizedServerStatus);

const shouldKeepProcessingLocalFeedback = (
  normalizedLocalFeedbackStatus: string,
  normalizedServerStatus: string
): boolean =>
  (normalizedLocalFeedbackStatus === 'processing' ||
    normalizedLocalFeedbackStatus === 'queued') &&
  FAILURE_STATUSES.has(normalizedServerStatus);

const shouldKeepFailedLocalFeedback = (
  normalizedLocalFeedbackStatus: string,
  normalizedServerStatus: string
): boolean =>
  FAILURE_STATUSES.has(normalizedLocalFeedbackStatus) &&
  (PENDING_STATUSES.has(normalizedServerStatus) ||
    PROCESSING_STATUSES.has(normalizedServerStatus));

const shouldKeepLocalFeedbackStatus = (
  localFeedbackStatus: string,
  serverStatus: string
): boolean =>
  shouldKeepProcessingLocalFeedback(localFeedbackStatus, serverStatus) ||
  shouldKeepFailedLocalFeedback(localFeedbackStatus, serverStatus);

const normalizeMarketplaceStatusInput = ({
  localFeedbackStatus,
  serverStatus,
  submitting,
}: MarketplaceStatusInput): NormalizedMarketplaceStatusInput => {
  const normalizedServerStatus = normalizeMarketplaceStatus(serverStatus);
  return {
    hasServerStatus:
      normalizedServerStatus.length > 0 && normalizedServerStatus !== 'not_started',
    localFeedbackStatus: normalizeMarketplaceStatus(localFeedbackStatus ?? ''),
    serverStatus: normalizedServerStatus,
    submitting: submitting === true,
  };
};

const resolveFallbackMarketplaceStatus = ({
  hasServerStatus,
  localFeedbackStatus,
  serverStatus,
}: NormalizedMarketplaceStatusInput): string => {
  if (hasServerStatus) return serverStatus;
  if (localFeedbackStatus.length > 0) return localFeedbackStatus;
  return 'not_started';
};

export const resolveMarketplaceStatusWithLocalFeedback = (
  input: MarketplaceStatusInput
): string => {
  const status = normalizeMarketplaceStatusInput(input);
  if (status.submitting) return 'processing';
  if (shouldPromoteCompletedLocalFeedback(status.localFeedbackStatus, status.serverStatus)) {
    return 'active';
  }
  if (shouldKeepLocalFeedbackStatus(status.localFeedbackStatus, status.serverStatus)) {
    return status.localFeedbackStatus;
  }
  return resolveFallbackMarketplaceStatus(status);
};

export const getStatusToneClass = (value: string): string => {
  const normalized = normalizeMarketplaceStatus(value);
  return (
    resolveStatusGroupClass(normalized, STATUS_TONE_CLASS_BY_GROUP) ??
    'border-gray-500/50 text-gray-300 hover:border-gray-400/60 hover:text-gray-200'
  );
};

export const getMarketplaceButtonClass = (
  value: string,
  manageMode: boolean,
  marketplace: MarketplaceButtonKind
): string => {
  if (!manageMode) return getStatusToneClass(value);
  const normalized = normalizeMarketplaceStatus(value);
  const statusClass = resolveStatusGroupClass(normalized, MANAGED_STATUS_CLASS_BY_GROUP);
  if (statusClass !== null) return statusClass;
  return MANAGED_MARKETPLACE_CLASS[marketplace];
};
