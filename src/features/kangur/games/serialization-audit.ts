import type {
  KangurGameEngineImplementationOwnership,
  KangurGameRuntimeSerializationIssueDto,
  KangurGameVariant,
} from '@/shared/contracts/kangur-games';
import {
  KANGUR_GAME_RUNTIME_SERIALIZATION_SURFACES,
  kangurGameRuntimeSerializationAuditSchema,
  type KangurGameRuntimeSerializationAuditDto,
  type KangurGameRuntimeSerializationSurfaceIdDto,
} from '@/shared/contracts/kangur-games';

import type { KangurGameEngineCatalogEntry } from './engine-catalog';
import type { KangurGameVariantCatalogEntry } from './variants';

export type KangurGameRuntimeSerializationSurfaceAudit = {
  surface: KangurGameRuntimeSerializationSurfaceIdDto;
  totalVariants: number;
  explicitRuntimeVariants: number;
  compatibilityFallbackVariants: number;
  duplicatedLegacyVariants: number;
  missingRuntimeVariants: number;
};

export type KangurGameRuntimeSerializationAudit = KangurGameRuntimeSerializationAuditDto;

const getSerializationStateForVariant = (
  variant: KangurGameVariant
): Omit<KangurGameRuntimeSerializationSurfaceAudit, 'surface' | 'totalVariants'> => {
  switch (variant.surface) {
    case 'lesson_inline': {
      const hasExplicitRuntime = Boolean(variant.lessonActivityRuntimeId);
      const hasLegacyFallback = Boolean(variant.legacyActivityId);
      return {
        explicitRuntimeVariants: hasExplicitRuntime ? 1 : 0,
        compatibilityFallbackVariants: !hasExplicitRuntime && hasLegacyFallback ? 1 : 0,
        duplicatedLegacyVariants: hasExplicitRuntime && hasLegacyFallback ? 1 : 0,
        missingRuntimeVariants: !hasExplicitRuntime && !hasLegacyFallback ? 1 : 0,
      };
    }
    case 'game_screen': {
      const hasExplicitRuntime = Boolean(variant.launchableRuntimeId);
      const hasLegacyFallback = Boolean(variant.legacyScreenId);
      return {
        explicitRuntimeVariants: hasExplicitRuntime ? 1 : 0,
        compatibilityFallbackVariants: !hasExplicitRuntime && hasLegacyFallback ? 1 : 0,
        duplicatedLegacyVariants: hasExplicitRuntime && hasLegacyFallback ? 1 : 0,
        missingRuntimeVariants: !hasExplicitRuntime && !hasLegacyFallback ? 1 : 0,
      };
    }
    default:
      return {
        explicitRuntimeVariants: 0,
        compatibilityFallbackVariants: 0,
        duplicatedLegacyVariants: 0,
        missingRuntimeVariants: 0,
      };
  }
};

const isRuntimeBearingVariantEntry = (
  entry: KangurGameVariantCatalogEntry,
  surface: KangurGameRuntimeSerializationSurfaceIdDto
): boolean => {
  switch (surface) {
    case 'lesson_inline':
      return (
        entry.game.activityIds.length > 0 ||
        Boolean(entry.variant.lessonActivityRuntimeId) ||
        Boolean(entry.variant.legacyActivityId)
      );
    case 'game_screen':
      return true;
    default:
      return false;
  }
};

const createSurfaceAudit = (
  surface: KangurGameRuntimeSerializationSurfaceIdDto,
  variantEntries: readonly KangurGameVariantCatalogEntry[]
): KangurGameRuntimeSerializationSurfaceAudit => {
  const surfaceVariants = variantEntries.filter(
    (entry) =>
      entry.variant.surface === surface && isRuntimeBearingVariantEntry(entry, surface)
  );

  return surfaceVariants.reduce<KangurGameRuntimeSerializationSurfaceAudit>(
    (summary, entry) => {
      const state = getSerializationStateForVariant(entry.variant);
      return {
        surface,
        totalVariants: summary.totalVariants + 1,
        explicitRuntimeVariants:
          summary.explicitRuntimeVariants + state.explicitRuntimeVariants,
        compatibilityFallbackVariants:
          summary.compatibilityFallbackVariants + state.compatibilityFallbackVariants,
        duplicatedLegacyVariants:
          summary.duplicatedLegacyVariants + state.duplicatedLegacyVariants,
        missingRuntimeVariants:
          summary.missingRuntimeVariants + state.missingRuntimeVariants,
      };
    },
    {
      surface,
      totalVariants: 0,
      explicitRuntimeVariants: 0,
      compatibilityFallbackVariants: 0,
      duplicatedLegacyVariants: 0,
      missingRuntimeVariants: 0,
    }
  );
};

const isSharedRuntimeOwnership = (
  ownership: KangurGameEngineImplementationOwnership | null | undefined
): boolean => ownership === 'shared_runtime';

const sortIssues = (
  left: KangurGameRuntimeSerializationIssueDto,
  right: KangurGameRuntimeSerializationIssueDto
): number =>
  left.label.localeCompare(right.label) ||
  left.itemId.localeCompare(right.itemId);

export const createKangurGameRuntimeSerializationAudit = (
  variantEntries: readonly KangurGameVariantCatalogEntry[],
  engineEntries: readonly KangurGameEngineCatalogEntry[]
): KangurGameRuntimeSerializationAudit => {
  const surfaces = KANGUR_GAME_RUNTIME_SERIALIZATION_SURFACES.map((surface) =>
    createSurfaceAudit(surface, variantEntries)
  );
  const games = Array.from(
    variantEntries.reduce<Map<string, KangurGameVariantCatalogEntry['game']>>((map, entry) => {
      map.set(entry.game.id, entry.game);
      return map;
    }, new Map()).values()
  );
  const runtimeBearingVariantEntries = variantEntries.filter((entry) =>
    isRuntimeBearingVariantEntry(
      entry,
      entry.variant.surface as KangurGameRuntimeSerializationSurfaceIdDto
    )
  );
  const legacyLaunchFallbackGames = games.filter((game) => game.legacyScreenIds.length > 0);
  const nonSharedRuntimeEngines = engineEntries.filter(
    (entry) => !isSharedRuntimeOwnership(entry.implementation?.ownership)
  );
  const issues = [
    ...runtimeBearingVariantEntries
      .filter((entry) => getSerializationStateForVariant(entry.variant).compatibilityFallbackVariants > 0)
      .map<KangurGameRuntimeSerializationIssueDto>((entry) => ({
        kind: 'compatibility_fallback_variant',
        itemId: entry.variant.id,
        label: `${entry.game.title} · ${entry.variant.title}`,
        detail: entry.variant.id,
        targetKind: 'game',
        targetId: entry.game.id,
      })),
    ...runtimeBearingVariantEntries
      .filter((entry) => getSerializationStateForVariant(entry.variant).duplicatedLegacyVariants > 0)
      .map<KangurGameRuntimeSerializationIssueDto>((entry) => ({
        kind: 'duplicated_legacy_variant',
        itemId: entry.variant.id,
        label: `${entry.game.title} · ${entry.variant.title}`,
        detail: entry.variant.id,
        targetKind: 'game',
        targetId: entry.game.id,
      })),
    ...runtimeBearingVariantEntries
      .filter((entry) => getSerializationStateForVariant(entry.variant).missingRuntimeVariants > 0)
      .map<KangurGameRuntimeSerializationIssueDto>((entry) => ({
        kind: 'missing_runtime_variant',
        itemId: entry.variant.id,
        label: `${entry.game.title} · ${entry.variant.title}`,
        detail: entry.variant.id,
        targetKind: 'game',
        targetId: entry.game.id,
      })),
    ...legacyLaunchFallbackGames
      .map<KangurGameRuntimeSerializationIssueDto>((game) => ({
        kind: 'legacy_launch_fallback_game',
        itemId: game.id,
        label: game.title,
        detail: game.id,
        targetKind: 'game',
        targetId: game.id,
      })),
    ...nonSharedRuntimeEngines
      .map<KangurGameRuntimeSerializationIssueDto>((entry) => ({
        kind: 'non_shared_runtime_engine',
        itemId: entry.engineId,
        label: entry.engine?.title ?? entry.engineId,
        detail: entry.engineId,
        targetKind: 'engine',
        targetId: entry.engineId,
      })),
  ].sort(sortIssues);

  return kangurGameRuntimeSerializationAuditSchema.parse({
    surfaces,
    runtimeBearingVariantCount: surfaces.reduce(
      (count, surface) => count + surface.totalVariants,
      0
    ),
    explicitRuntimeVariantCount: surfaces.reduce(
      (count, surface) => count + surface.explicitRuntimeVariants,
      0
    ),
    compatibilityFallbackVariantCount: surfaces.reduce(
      (count, surface) => count + surface.compatibilityFallbackVariants,
      0
    ),
    duplicatedLegacyVariantCount: surfaces.reduce(
      (count, surface) => count + surface.duplicatedLegacyVariants,
      0
    ),
    missingRuntimeVariantCount: surfaces.reduce(
      (count, surface) => count + surface.missingRuntimeVariants,
      0
    ),
    legacyLaunchFallbackGameCount: legacyLaunchFallbackGames.length,
    issues,
    engineCount: engineEntries.length,
    sharedRuntimeEngineCount: engineEntries.filter((entry) =>
      isSharedRuntimeOwnership(entry.implementation?.ownership)
    ).length,
    nonSharedRuntimeEngineCount: nonSharedRuntimeEngines.length,
    allEnginesSharedRuntime: nonSharedRuntimeEngines.length === 0,
  });
};
