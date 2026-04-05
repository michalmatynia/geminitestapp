import type { BasePreferenceScope } from '@/shared/contracts/integrations/preferences';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
const ACTIVE_TEMPLATE_SCOPE_SEPARATOR = '::';

export type ActiveTemplateScopeInput = BasePreferenceScope;

export type ScopedActiveTemplateMap = {
  defaultTemplateId: string | null;
  byScope: Record<string, string>;
};

const EMPTY_SCOPED_ACTIVE_TEMPLATE_MAP: ScopedActiveTemplateMap = {
  defaultTemplateId: null,
  byScope: {},
};

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeByScopeEntries = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce(
    (acc: Record<string, string>, [scopeKey, templateId]: [string, unknown]) => {
      const normalizedScopeKey = scopeKey.trim();
      const normalizedTemplateId = normalizeOptionalId(templateId);
      if (!normalizedScopeKey || !normalizedTemplateId) return acc;
      if (!normalizedScopeKey.includes(ACTIVE_TEMPLATE_SCOPE_SEPARATOR)) return acc;
      acc[normalizedScopeKey] = normalizedTemplateId;
      return acc;
    },
    {}
  );
};

export const normalizeActiveTemplateId = (value: unknown): string | null =>
  normalizeOptionalId(value);

export const buildActiveTemplateScopeKey = (scope?: ActiveTemplateScopeInput): string | null => {
  const connectionId = normalizeOptionalId(scope?.connectionId);
  const inventoryId = normalizeOptionalId(scope?.inventoryId);
  if (!connectionId || !inventoryId) return null;
  return `${connectionId}${ACTIVE_TEMPLATE_SCOPE_SEPARATOR}${inventoryId}`;
};

export const parseScopedActiveTemplateMap = (raw: string | null): ScopedActiveTemplateMap => {
  if (!raw) return EMPTY_SCOPED_ACTIVE_TEMPLATE_MAP;
  const trimmed = raw.trim();
  if (!trimmed) return EMPTY_SCOPED_ACTIVE_TEMPLATE_MAP;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return EMPTY_SCOPED_ACTIVE_TEMPLATE_MAP;
    }
    const record = parsed as Record<string, unknown>;
    return {
      defaultTemplateId: normalizeOptionalId(record['defaultTemplateId']),
      byScope: normalizeByScopeEntries(record['byScope']),
    };
  } catch (error) {
    logClientError(error);
    return EMPTY_SCOPED_ACTIVE_TEMPLATE_MAP;
  }
};

export const stringifyScopedActiveTemplateMap = (map: ScopedActiveTemplateMap): string => {
  const defaultTemplateId = normalizeOptionalId(map.defaultTemplateId);
  const normalizedByScope = normalizeByScopeEntries(map.byScope);
  const sortedByScope = Object.keys(normalizedByScope)
    .sort((left: string, right: string) => left.localeCompare(right))
    .reduce((acc: Record<string, string>, scopeKey: string) => {
      acc[scopeKey] = normalizedByScope[scopeKey] as string;
      return acc;
    }, {});

  return JSON.stringify({
    defaultTemplateId,
    byScope: sortedByScope,
  });
};
