import { cmsSectionInstanceSchema } from '@/shared/contracts/cms';
import {
  GRID_TEMPLATE_SETTINGS_KEY,
  type GridTemplateRecord,
} from '@/features/cms/components/page-builder/grid-templates';
import {
  SECTION_TEMPLATE_SETTINGS_KEY,
  type SectionTemplateRecord,
} from '@/features/cms/components/page-builder/section-template-store';

export const CMS_PAGE_BUILDER_TEMPLATE_MIGRATABLE_SETTING_KEYS = [
  SECTION_TEMPLATE_SETTINGS_KEY,
  GRID_TEMPLATE_SETTINGS_KEY,
] as const;

export type CmsPageBuilderTemplateMigratableSettingKey =
  (typeof CMS_PAGE_BUILDER_TEMPLATE_MIGRATABLE_SETTING_KEYS)[number];

export type CmsPageBuilderTemplateMigrationStats = {
  entriesScanned: number;
  entriesKept: number;
  entriesDropped: number;
  idsBackfilled: number;
  namesBackfilled: number;
  categoriesBackfilled: number;
  sectionTypesBackfilled: number;
  createdAtBackfilled: number;
};

export type CmsPageBuilderTemplateMigrationResult = {
  status: 'changed' | 'unchanged' | 'invalid' | 'unsupported_key';
  value: string;
  warnings: string[];
  stats: CmsPageBuilderTemplateMigrationStats;
};

const emptyStats = (): CmsPageBuilderTemplateMigrationStats => ({
  entriesScanned: 0,
  entriesKept: 0,
  entriesDropped: 0,
  idsBackfilled: 0,
  namesBackfilled: 0,
  categoriesBackfilled: 0,
  sectionTypesBackfilled: 0,
  createdAtBackfilled: 0,
});

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const stableStringify = (value: unknown): string => JSON.stringify(value ?? null);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const ensureCreatedAt = (
  value: unknown,
  fallbackTimestamp: string
): { createdAt: string; backfilled: boolean } => {
  const normalized = normalizeOptionalString(value);
  if (normalized && Number.isFinite(Date.parse(normalized))) {
    return { createdAt: normalized, backfilled: false };
  }
  return { createdAt: fallbackTimestamp, backfilled: true };
};

const migrateSectionTemplates = (
  source: unknown,
  fallbackTimestamp: string
): { templates: SectionTemplateRecord[]; stats: CmsPageBuilderTemplateMigrationStats } => {
  const stats = emptyStats();
  if (!Array.isArray(source)) return { templates: [], stats };

  const templates: SectionTemplateRecord[] = [];
  source.forEach((entry: unknown, index: number): void => {
    stats.entriesScanned += 1;
    if (!isRecord(entry)) {
      stats.entriesDropped += 1;
      return;
    }

    const parsedSection = cmsSectionInstanceSchema.safeParse(entry['section']);
    if (!parsedSection.success) {
      stats.entriesDropped += 1;
      return;
    }
    const section = parsedSection.data;

    const id = normalizeOptionalString(entry['id']) ?? `section-template-${index + 1}`;
    if (!normalizeOptionalString(entry['id'])) stats.idsBackfilled += 1;

    const name = normalizeOptionalString(entry['name']) ?? `Section template ${index + 1}`;
    if (!normalizeOptionalString(entry['name'])) stats.namesBackfilled += 1;

    const category = normalizeOptionalString(entry['category']) ?? 'Saved sections';
    if (!normalizeOptionalString(entry['category'])) stats.categoriesBackfilled += 1;

    const sectionType = normalizeOptionalString(entry['sectionType']) ?? section.type;
    if (!normalizeOptionalString(entry['sectionType']) || sectionType !== section.type) {
      stats.sectionTypesBackfilled += 1;
    }

    const createdAtResult = ensureCreatedAt(entry['createdAt'], fallbackTimestamp);
    if (createdAtResult.backfilled) stats.createdAtBackfilled += 1;

    const description = normalizeOptionalString(entry['description']) ?? '';

    templates.push({
      id,
      name,
      description,
      category,
      sectionType: section.type,
      createdAt: createdAtResult.createdAt,
      section,
    });
    stats.entriesKept += 1;
  });

  return { templates, stats };
};

const migrateGridTemplates = (
  source: unknown,
  fallbackTimestamp: string
): { templates: GridTemplateRecord[]; stats: CmsPageBuilderTemplateMigrationStats } => {
  const stats = emptyStats();
  if (!Array.isArray(source)) return { templates: [], stats };

  const templates: GridTemplateRecord[] = [];
  source.forEach((entry: unknown, index: number): void => {
    stats.entriesScanned += 1;
    if (!isRecord(entry)) {
      stats.entriesDropped += 1;
      return;
    }

    const parsedSection = cmsSectionInstanceSchema.safeParse(entry['section']);
    if (!parsedSection.success || parsedSection.data.type !== 'Grid') {
      stats.entriesDropped += 1;
      return;
    }
    const section = parsedSection.data;

    const id = normalizeOptionalString(entry['id']) ?? `grid-template-${index + 1}`;
    if (!normalizeOptionalString(entry['id'])) stats.idsBackfilled += 1;

    const name = normalizeOptionalString(entry['name']) ?? `Grid template ${index + 1}`;
    if (!normalizeOptionalString(entry['name'])) stats.namesBackfilled += 1;

    const createdAtResult = ensureCreatedAt(entry['createdAt'], fallbackTimestamp);
    if (createdAtResult.backfilled) stats.createdAtBackfilled += 1;

    const description = normalizeOptionalString(entry['description']) ?? '';

    templates.push({
      id,
      name,
      description,
      createdAt: createdAtResult.createdAt,
      section,
    });
    stats.entriesKept += 1;
  });

  return { templates, stats };
};

export const migrateCmsPageBuilderTemplateSettingValue = (args: {
  key: string;
  value: string;
  fallbackTimestamp?: string;
}): CmsPageBuilderTemplateMigrationResult => {
  const fallbackTimestamp = args.fallbackTimestamp ?? new Date().toISOString();

  if (
    !CMS_PAGE_BUILDER_TEMPLATE_MIGRATABLE_SETTING_KEYS.includes(
      args.key as CmsPageBuilderTemplateMigratableSettingKey
    )
  ) {
    return {
      status: 'unsupported_key',
      value: args.value,
      warnings: ['Setting key is not part of CMS page-builder template migration scope.'],
      stats: emptyStats(),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(args.value);
  } catch {
    return {
      status: 'invalid',
      value: '[]',
      warnings: ['Setting value is not valid JSON. Replaced with empty canonical template list.'],
      stats: emptyStats(),
    };
  }

  const migrated =
    args.key === SECTION_TEMPLATE_SETTINGS_KEY
      ? migrateSectionTemplates(parsed, fallbackTimestamp)
      : migrateGridTemplates(parsed, fallbackTimestamp);
  const nextValue = stableStringify(migrated.templates);
  const changed = nextValue !== stableStringify(parsed);

  return {
    status: changed ? 'changed' : 'unchanged',
    value: nextValue,
    warnings: [],
    stats: migrated.stats,
  };
};
