import type {
  BaseImportItemRecord,
  BaseImportParameterImportSummary,
  BaseImportRunParameterImportSummary,
} from '@/shared/contracts/integrations/base-com';

const DEFAULT_PARAMETER_IMPORT_SUMMARY: BaseImportRunParameterImportSummary = {
  itemsApplied: 0,
  extracted: 0,
  resolved: 0,
  created: 0,
  written: 0,
};

export type ImportRunCustomFieldMetadata = {
  seededFieldNames: string[];
  autoMatchedFieldNames: string[];
  explicitMappedFieldNames: string[];
  skippedFieldNames: string[];
  overriddenFieldNames: string[];
};

export type ImportRunCustomFieldSummary = {
  itemsApplied: number;
  seeded: number;
  autoMatched: number;
  explicitMapped: number;
  skipped: number;
  overridden: number;
};

const readStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((entry: unknown): entry is string => typeof entry === 'string')
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry.length > 0)
    )
  ).sort((left: string, right: string) => left.localeCompare(right));
};

const getItemCustomFieldImportMetadata = (
  item: BaseImportItemRecord
): ImportRunCustomFieldMetadata | null => {
  const metadata = item.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const rawCustomFieldImport = (metadata as Record<string, unknown>)['customFieldImport'];
  if (!rawCustomFieldImport || typeof rawCustomFieldImport !== 'object') {
    return null;
  }

  const customFieldImport = rawCustomFieldImport as Record<string, unknown>;
  return {
    seededFieldNames: readStringList(customFieldImport['seededFieldNames']),
    autoMatchedFieldNames: readStringList(customFieldImport['autoMatchedFieldNames']),
    explicitMappedFieldNames: readStringList(customFieldImport['explicitMappedFieldNames']),
    skippedFieldNames: readStringList(customFieldImport['skippedFieldNames']),
    overriddenFieldNames: readStringList(customFieldImport['overriddenFieldNames']),
  };
};

const hasCustomFieldImportActivity = (
  metadata: ImportRunCustomFieldMetadata | null | undefined
): boolean =>
  Boolean(
    metadata &&
      (
        metadata.seededFieldNames.length > 0 ||
        metadata.autoMatchedFieldNames.length > 0 ||
        metadata.explicitMappedFieldNames.length > 0 ||
        metadata.skippedFieldNames.length > 0 ||
        metadata.overriddenFieldNames.length > 0
      )
  );

const normalizeParameterImportSummaryCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
};

const hasParameterImportSummaryActivity = (
  summary: BaseImportParameterImportSummary | BaseImportRunParameterImportSummary | null | undefined
): boolean => {
  if (!summary) {
    return false;
  }

  return (
    summary.extracted > 0 || summary.resolved > 0 || summary.created > 0 || summary.written > 0
  );
};

const getItemCompletionTimestamp = (item: BaseImportItemRecord): number => {
  const parsed = Date.parse(item.finishedAt ?? item.updatedAt ?? '');
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const hasRetryableImportItems = (items: BaseImportItemRecord[]): boolean =>
  items.some((item: BaseImportItemRecord) => item.status === 'failed' || item.status === 'pending');

export const getImportRunErrorItems = (
  items: BaseImportItemRecord[],
  limit = 10
): BaseImportItemRecord[] => {
  return items
    .filter((item: BaseImportItemRecord) => item.status === 'failed' || Boolean(item.errorMessage))
    .slice(0, limit);
};

export const buildParameterImportSummaryFromItems = (
  items: BaseImportItemRecord[]
): BaseImportRunParameterImportSummary | null => {
  const aggregated = items.reduce(
    (
      acc: BaseImportRunParameterImportSummary,
      item: BaseImportItemRecord
    ): BaseImportRunParameterImportSummary => {
      const summary = item.parameterImportSummary;
      if (!summary) {
        return acc;
      }

      return {
        itemsApplied: acc.itemsApplied + 1,
        extracted: acc.extracted + normalizeParameterImportSummaryCount(summary.extracted),
        resolved: acc.resolved + normalizeParameterImportSummaryCount(summary.resolved),
        created: acc.created + normalizeParameterImportSummaryCount(summary.created),
        written: acc.written + normalizeParameterImportSummaryCount(summary.written),
      };
    },
    DEFAULT_PARAMETER_IMPORT_SUMMARY
  );

  return hasParameterImportSummaryActivity(aggregated) || aggregated.itemsApplied > 0
    ? aggregated
    : null;
};

export const resolveImportRunParameterImportSummary = (
  runSummary: BaseImportRunParameterImportSummary | null | undefined,
  items: BaseImportItemRecord[]
): BaseImportRunParameterImportSummary | null => {
  if (hasParameterImportSummaryActivity(runSummary) || (runSummary?.itemsApplied ?? 0) > 0) {
    return runSummary ?? null;
  }

  if (items.length === 0) {
    return null;
  }

  return buildParameterImportSummaryFromItems(items);
};

export const buildCustomFieldImportSummaryFromItems = (
  items: BaseImportItemRecord[]
): ImportRunCustomFieldSummary | null => {
  let itemsApplied = 0;
  const seededFieldNames = new Set<string>();
  const autoMatchedFieldNames = new Set<string>();
  const explicitMappedFieldNames = new Set<string>();
  const skippedFieldNames = new Set<string>();
  const overriddenFieldNames = new Set<string>();

  items.forEach((item: BaseImportItemRecord): void => {
    const metadata = getItemCustomFieldImportMetadata(item);
    if (!metadata || !hasCustomFieldImportActivity(metadata)) {
      return;
    }

    itemsApplied += 1;
    metadata.seededFieldNames.forEach((fieldName: string): void => {
      seededFieldNames.add(fieldName);
    });
    metadata.autoMatchedFieldNames.forEach((fieldName: string): void => {
      autoMatchedFieldNames.add(fieldName);
    });
    metadata.explicitMappedFieldNames.forEach((fieldName: string): void => {
      explicitMappedFieldNames.add(fieldName);
    });
    metadata.skippedFieldNames.forEach((fieldName: string): void => {
      skippedFieldNames.add(fieldName);
    });
    metadata.overriddenFieldNames.forEach((fieldName: string): void => {
      overriddenFieldNames.add(fieldName);
    });
  });

  if (
    itemsApplied === 0 &&
    seededFieldNames.size === 0 &&
    autoMatchedFieldNames.size === 0 &&
    explicitMappedFieldNames.size === 0 &&
    skippedFieldNames.size === 0 &&
    overriddenFieldNames.size === 0
  ) {
    return null;
  }

  return {
    itemsApplied,
    seeded: seededFieldNames.size,
    autoMatched: autoMatchedFieldNames.size,
    explicitMapped: explicitMappedFieldNames.size,
    skipped: skippedFieldNames.size,
    overridden: overriddenFieldNames.size,
  };
};

export const compareImportItemsByLatestCompletion = (
  left: BaseImportItemRecord,
  right: BaseImportItemRecord
): number => {
  const leftTime = getItemCompletionTimestamp(left);
  const rightTime = getItemCompletionTimestamp(right);

  if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return 0;
  if (!Number.isFinite(leftTime)) return 1;
  if (!Number.isFinite(rightTime)) return -1;
  return rightTime - leftTime;
};

export const getParameterSyncHistoryItems = (
  items: BaseImportItemRecord[],
  limit = 8
): BaseImportItemRecord[] => {
  return items
    .filter((item: BaseImportItemRecord) => Boolean(item.parameterImportSummary))
    .sort(compareImportItemsByLatestCompletion)
    .slice(0, limit);
};

export const getCustomFieldImportHistoryItems = (
  items: BaseImportItemRecord[],
  limit = 8
): BaseImportItemRecord[] => {
  return items
    .filter((item: BaseImportItemRecord) =>
      hasCustomFieldImportActivity(getItemCustomFieldImportMetadata(item))
    )
    .sort(compareImportItemsByLatestCompletion)
    .slice(0, limit);
};

export const formatCustomFieldImportHistory = (item: BaseImportItemRecord): string | null => {
  const metadata = getItemCustomFieldImportMetadata(item);
  if (!metadata || !hasCustomFieldImportActivity(metadata)) {
    return null;
  }

  const segments: string[] = [];
  const append = (label: string, values: string[]): void => {
    if (values.length === 0) {
      return;
    }
    segments.push(`${label}: ${values.join(', ')}`);
  };

  append('seeded', metadata.seededFieldNames);
  append('auto', metadata.autoMatchedFieldNames);
  append('explicit', metadata.explicitMappedFieldNames);
  append('skipped', metadata.skippedFieldNames);
  append('overridden', metadata.overriddenFieldNames);

  return segments.length > 0 ? segments.join(' · ') : null;
};
