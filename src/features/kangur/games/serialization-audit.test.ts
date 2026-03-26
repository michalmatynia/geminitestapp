import { describe, expect, it } from 'vitest';

import {
  createKangurGameCatalogEntries,
  createKangurGameEngineCatalogEntries,
  createKangurGameRuntimeSerializationAudit,
  createKangurGameVariantCatalogEntries,
} from '@/features/kangur/games';

describe('kangur game runtime serialization audit', () => {
  it('reports the current catalog as fully explicit across runtime-bearing variant surfaces', () => {
    const catalogEntries = createKangurGameCatalogEntries();
    const variantEntries = createKangurGameVariantCatalogEntries(catalogEntries);
    const engineEntries = createKangurGameEngineCatalogEntries({
      catalogEntries,
      variantEntries,
    });

    const audit = createKangurGameRuntimeSerializationAudit(variantEntries, engineEntries);

    expect(audit.surfaces.map((entry) => entry.surface)).toEqual([
      'lesson_inline',
      'lesson_stage',
      'game_screen',
    ]);
    expect(audit.runtimeBearingVariantCount).toBeGreaterThan(0);
    expect(audit.explicitRuntimeVariantCount).toBe(audit.runtimeBearingVariantCount);
    expect(audit.compatibilityFallbackVariantCount).toBe(0);
    expect(audit.duplicatedLegacyVariantCount).toBe(0);
    expect(audit.missingRuntimeVariantCount).toBe(0);
    expect(audit.legacyLaunchFallbackGameCount).toBe(0);
    expect(audit.issues).toEqual([]);
    expect(audit.sharedRuntimeEngineCount).toBe(audit.engineCount);
    expect(audit.nonSharedRuntimeEngineCount).toBe(0);
    expect(audit.allEnginesSharedRuntime).toBe(true);
  });

  it('still flags compatibility-only, duplicate-legacy, and missing runtime config in synthetic regressions', () => {
    const catalogEntries = createKangurGameCatalogEntries();
    const variantEntries = createKangurGameVariantCatalogEntries(catalogEntries).map((entry) => ({
      ...entry,
      variant: { ...entry.variant },
    }));
    const engineEntries = createKangurGameEngineCatalogEntries({
      catalogEntries,
      variantEntries,
    }).map((entry) => ({
      ...entry,
      implementation: entry.implementation ? { ...entry.implementation } : null,
    }));

    const legacyInline = variantEntries.find(
      (entry) => entry.variant.id === 'division_groups.lesson-inline'
    );
    if (legacyInline) {
      legacyInline.variant.lessonActivityRuntimeId = undefined;
      legacyInline.variant.legacyActivityId = 'division-game';
    }

    const duplicatedInline = variantEntries.find(
      (entry) => entry.variant.id === 'clock_training.lesson-inline'
    );
    if (duplicatedInline) {
      duplicatedInline.variant.legacyActivityId = 'clock-training';
    }

    const missingStage = variantEntries.find(
      (entry) => entry.variant.id === 'logical_patterns_workshop.lesson-stage'
    );
    if (missingStage) {
      missingStage.variant.lessonStageRuntimeId = undefined;
    }

    const legacyGameScreen = variantEntries.find(
      (entry) => entry.variant.id === 'english_sentence_builder.game-screen'
    );
    if (legacyGameScreen) {
      legacyGameScreen.variant.launchableRuntimeId = undefined;
      legacyGameScreen.variant.legacyScreenId = 'english_sentence_quiz';
    }

    const duplicatedGameScreen = variantEntries.find(
      (entry) => entry.variant.id === 'clock_training.game-screen'
    );
    if (duplicatedGameScreen) {
      duplicatedGameScreen.variant.legacyScreenId = 'clock_quiz';
    }

    const legacyLaunchFallbackGame = variantEntries.find(
      (entry) => entry.game.id === 'clock_training'
    );
    if (legacyLaunchFallbackGame) {
      legacyLaunchFallbackGame.game.legacyScreenIds = ['clock_quiz'];
    }

    const nonSharedEngine = engineEntries.find(
      (entry) => entry.engineId === 'classification-engine'
    );
    if (nonSharedEngine?.implementation) {
      nonSharedEngine.implementation.ownership = 'mixed_runtime';
    }

    const audit = createKangurGameRuntimeSerializationAudit(variantEntries, engineEntries);
    const lessonInline = audit.surfaces.find((entry) => entry.surface === 'lesson_inline');
    const lessonStage = audit.surfaces.find((entry) => entry.surface === 'lesson_stage');
    const gameScreen = audit.surfaces.find((entry) => entry.surface === 'game_screen');

    expect(lessonInline).toMatchObject({
      compatibilityFallbackVariants: 1,
      duplicatedLegacyVariants: 1,
    });
    expect(lessonStage).toMatchObject({
      missingRuntimeVariants: 1,
    });
    expect(gameScreen).toMatchObject({
      compatibilityFallbackVariants: 1,
      duplicatedLegacyVariants: 1,
    });
    expect(audit.compatibilityFallbackVariantCount).toBe(2);
    expect(audit.duplicatedLegacyVariantCount).toBe(2);
    expect(audit.missingRuntimeVariantCount).toBe(1);
    expect(audit.legacyLaunchFallbackGameCount).toBe(1);
    expect(
      audit.issues
        .filter((issue) => issue.kind === 'compatibility_fallback_variant')
        .map((issue) => issue.itemId)
    ).toEqual(['division_groups.lesson-inline', 'english_sentence_builder.game-screen']);
    expect(
      audit.issues
        .filter((issue) => issue.kind === 'non_shared_runtime_engine')
        .map((issue) => issue.itemId)
    ).toEqual(['classification-engine']);
    expect(
      audit.issues.find((issue) => issue.itemId === 'division_groups.lesson-inline')
    ).toMatchObject({
      label: 'Division Groups · Division groups in lessons',
      targetKind: 'game',
      targetId: 'division_groups',
    });
    expect(audit.nonSharedRuntimeEngineCount).toBe(1);
    expect(audit.allEnginesSharedRuntime).toBe(false);
  });
});
