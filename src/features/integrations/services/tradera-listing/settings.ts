import { type TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import { type IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { type ProductListing } from '@/shared/contracts/integrations/listings';

export const resolveConnectionListingSettings = (
  connection: IntegrationConnectionRecord,
  systemSettings: TraderaSystemSettings
): {
  durationHours: number;
  autoRelistEnabled: boolean;
  autoRelistLeadMinutes: number;
  templateId: string | null;
} => ({
  durationHours: connection.traderaDefaultDurationHours ?? systemSettings.defaultDurationHours,
  autoRelistEnabled: connection.traderaAutoRelistEnabled ?? systemSettings.autoRelistEnabled,
  autoRelistLeadMinutes:
    connection.traderaAutoRelistLeadMinutes ?? systemSettings.autoRelistLeadMinutes,
  templateId: connection.traderaDefaultTemplateId ?? null,
});

export const buildRelistPolicy = (settings: {
  durationHours: number;
  autoRelistEnabled: boolean;
  autoRelistLeadMinutes: number;
  templateId: string | null;
}): Record<string, unknown> => ({
  enabled: settings.autoRelistEnabled,
  durationHours: settings.durationHours,
  leadMinutes: settings.autoRelistLeadMinutes,
  templateId: settings.templateId,
});

const toPolicyRecord = (value: ProductListing['relistPolicy']): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
};

const parsePolicyBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const parsePolicyInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return null;
};

const parsePolicyTemplateId = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase() === 'none') return null;
  return normalized;
};

const resolvePositivePolicyInteger = (value: unknown, fallback: number): number => {
  const parsed = parsePolicyInteger(value);
  return parsed !== null && parsed > 0 ? parsed : fallback;
};

const resolveNonNegativePolicyInteger = (value: unknown, fallback: number): number => {
  const parsed = parsePolicyInteger(value);
  return parsed !== null && parsed >= 0 ? parsed : fallback;
};

const resolvePolicyTemplateId = (
  value: unknown,
  fallback: string | null
): string | null => {
  const parsed = parsePolicyTemplateId(value);
  return parsed !== undefined ? parsed : fallback;
};

export const resolveEffectiveListingSettings = (
  listing: ProductListing,
  connection: IntegrationConnectionRecord,
  systemSettings: TraderaSystemSettings
): {
  durationHours: number;
  autoRelistEnabled: boolean;
  autoRelistLeadMinutes: number;
  templateId: string | null;
} => {
  const fallback = resolveConnectionListingSettings(connection, systemSettings);
  const policy = toPolicyRecord(listing.relistPolicy);
  if (!policy) return fallback;

  return {
    durationHours: resolvePositivePolicyInteger(policy['durationHours'], fallback.durationHours),
    autoRelistEnabled: parsePolicyBoolean(policy['enabled']) ?? fallback.autoRelistEnabled,
    autoRelistLeadMinutes: resolveNonNegativePolicyInteger(
      policy['leadMinutes'],
      fallback.autoRelistLeadMinutes
    ),
    templateId: resolvePolicyTemplateId(policy['templateId'], fallback.templateId),
  };
};
