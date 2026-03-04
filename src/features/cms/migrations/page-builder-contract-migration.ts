import type { BlockInstance, PageComponent, PageZone } from '@/shared/contracts/cms';

const VALID_ZONES = new Set<PageZone>(['header', 'template', 'footer']);
const CANONICAL_CONTENT_KEYS = new Set([
  'zone',
  'settings',
  'blocks',
  'sectionId',
  'parentSectionId',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeZone = (value: unknown): PageZone => {
  if (typeof value !== 'string') return 'template';
  const normalized = value.trim().toLowerCase();
  return VALID_ZONES.has(normalized as PageZone) ? (normalized as PageZone) : 'template';
};

const normalizeSectionId = (
  value: unknown,
  componentId: unknown,
  componentIndex: number
): { sectionId: string; wasMissing: boolean } => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) return { sectionId: trimmed, wasMissing: false };
  }

  if (typeof componentId === 'string') {
    const trimmedComponentId = componentId.trim();
    if (trimmedComponentId.length > 0) {
      return { sectionId: trimmedComponentId, wasMissing: true };
    }
  }

  return { sectionId: `migrated-section-${componentIndex + 1}`, wasMissing: true };
};

const normalizeParentSectionId = (value: unknown, sectionId: string): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === sectionId) return null;
  return trimmed;
};

type CanonicalComponentContent = {
  zone: PageZone;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  sectionId: string;
  parentSectionId: string | null;
};

export type CmsPageBuilderComponentMigrationStats = {
  componentsScanned: number;
  componentsChanged: number;
  missingSectionIds: number;
  normalizedZones: number;
  normalizedParents: number;
  normalizedSettings: number;
  normalizedBlocks: number;
  prunedLegacyKeys: number;
  normalizedOrder: number;
};

export const emptyCmsPageBuilderComponentMigrationStats =
  (): CmsPageBuilderComponentMigrationStats => ({
    componentsScanned: 0,
    componentsChanged: 0,
    missingSectionIds: 0,
    normalizedZones: 0,
    normalizedParents: 0,
    normalizedSettings: 0,
    normalizedBlocks: 0,
    prunedLegacyKeys: 0,
    normalizedOrder: 0,
  });

export const mergeCmsPageBuilderComponentMigrationStats = (
  base: CmsPageBuilderComponentMigrationStats,
  next: CmsPageBuilderComponentMigrationStats
): CmsPageBuilderComponentMigrationStats => ({
  componentsScanned: base.componentsScanned + next.componentsScanned,
  componentsChanged: base.componentsChanged + next.componentsChanged,
  missingSectionIds: base.missingSectionIds + next.missingSectionIds,
  normalizedZones: base.normalizedZones + next.normalizedZones,
  normalizedParents: base.normalizedParents + next.normalizedParents,
  normalizedSettings: base.normalizedSettings + next.normalizedSettings,
  normalizedBlocks: base.normalizedBlocks + next.normalizedBlocks,
  prunedLegacyKeys: base.prunedLegacyKeys + next.prunedLegacyKeys,
  normalizedOrder: base.normalizedOrder + next.normalizedOrder,
});

export const migrateCmsPageBuilderComponents = (
  components: PageComponent[]
): {
  components: PageComponent[];
  changed: boolean;
  stats: CmsPageBuilderComponentMigrationStats;
} => {
  const stats = emptyCmsPageBuilderComponentMigrationStats();
  let changed = false;

  const nextComponents = components.map((component: PageComponent, index: number): PageComponent => {
    stats.componentsScanned += 1;

    const rawContent: Record<string, unknown> = isRecord(component.content)
      ? component.content
      : {};
    const { sectionId, wasMissing } = normalizeSectionId(rawContent['sectionId'], component.id, index);
    if (wasMissing) stats.missingSectionIds += 1;

    const zone = normalizeZone(rawContent['zone']);
    if (rawContent['zone'] !== zone) stats.normalizedZones += 1;

    const parentSectionId = normalizeParentSectionId(rawContent['parentSectionId'], sectionId);
    if (rawContent['parentSectionId'] !== parentSectionId) stats.normalizedParents += 1;

    const settings = isRecord(rawContent['settings']) ? rawContent['settings'] : {};
    if (rawContent['settings'] !== settings) stats.normalizedSettings += 1;

    const blocks = Array.isArray(rawContent['blocks']) ? (rawContent['blocks'] as BlockInstance[]) : [];
    if (rawContent['blocks'] !== blocks) stats.normalizedBlocks += 1;

    const legacyKeys = Object.keys(rawContent).filter((key: string): boolean => {
      return !CANONICAL_CONTENT_KEYS.has(key);
    });
    if (legacyKeys.length > 0) stats.prunedLegacyKeys += legacyKeys.length;

    const canonicalContent: CanonicalComponentContent = {
      zone,
      settings,
      blocks,
      sectionId,
      parentSectionId,
    };

    const orderChanged = component.order !== index;
    if (orderChanged) stats.normalizedOrder += 1;

    const componentChanged =
      !isRecord(component.content) ||
      rawContent['zone'] !== zone ||
      rawContent['settings'] !== settings ||
      rawContent['blocks'] !== blocks ||
      rawContent['sectionId'] !== sectionId ||
      rawContent['parentSectionId'] !== parentSectionId ||
      legacyKeys.length > 0 ||
      orderChanged;

    if (componentChanged) {
      stats.componentsChanged += 1;
      changed = true;
    }

    return {
      ...component,
      order: index,
      content: canonicalContent,
    };
  });

  return {
    components: nextComponents,
    changed,
    stats,
  };
};
