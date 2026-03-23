import { describe, expect, it } from 'vitest';

import {
  appendMissingGeometryKangurLessons,
  appendMissingLogicalThinkingKangurLessons,
  createDefaultKangurLessons,
  DEFAULT_KANGUR_LAUNCH_ROUTE,
  KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
  KANGUR_LESSON_LIBRARY,
  KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_SECONDS,
  parseKangurLaunchRouteSettings,
  parseKangurNarratorSettings,
  parseKangurParentVerificationEmailSettings,
  normalizeKangurLessons,
} from '@/features/kangur/settings';
import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';
import { KANGUR_TTS_DEFAULT_VOICE } from '@/features/kangur/tts/contracts';

describe('kangur lesson settings', () => {
  it('exports the persisted launch-route setting key', () => {
    expect(KANGUR_LAUNCH_ROUTE_SETTINGS_KEY).toBe('kangur_launch_route_settings_v1');
  });

  it('describes the clock lesson as segmented hour and minute reading', () => {
    expect(KANGUR_LESSON_LIBRARY.clock.description).toBe(
      'Godziny, minuty i pełny czas na zegarze analogowym'
    );
  });

  it('includes geometry lessons in default library', () => {
    const lessons = createDefaultKangurLessons();
    const componentIds = lessons.map((lesson) => lesson.componentId);

    expect(componentIds).toContain('geometry_basics');
    expect(componentIds).toContain('geometry_shapes');
    expect(componentIds).toContain('geometry_symmetry');
    expect(componentIds).toContain('geometry_perimeter');
    expect(lessons.every((lesson) => lesson.contentMode === 'component')).toBe(true);
  });

  it('includes art lessons with subsection references in the default library', () => {
    const lessons = createDefaultKangurLessons();
    const artHarmony = lessons.find((lesson) => lesson.componentId === 'art_colors_harmony');
    const artShapes = lessons.find((lesson) => lesson.componentId === 'art_shapes_basic');

    expect(artHarmony).toMatchObject({
      subject: 'art',
      ageGroup: 'six_year_old',
      sectionId: 'art_colors',
      subsectionId: 'art_colors_harmony',
    });
    expect(artShapes).toMatchObject({
      subject: 'art',
      ageGroup: 'six_year_old',
      sectionId: 'art_shapes',
      subsectionId: 'art_shapes_basic',
    });
  });

  it('includes music lessons with subsection references in the default library', () => {
    const lessons = createDefaultKangurLessons();
    const diatonicScale = lessons.find((lesson) => lesson.componentId === 'music_diatonic_scale');

    expect(diatonicScale).toMatchObject({
      subject: 'music',
      ageGroup: 'six_year_old',
      sectionId: 'music_scale',
      subsectionId: 'music_diatonic_scale',
    });
  });

  it('defines the Art subject sections for six-year-old lessons', () => {
    const sections = createDefaultKangurSections().filter((section) => section.subject === 'art');

    expect(sections).toHaveLength(2);
    expect(sections.map((section) => section.id)).toEqual(['art_colors', 'art_shapes']);
    expect(sections[0]?.subsections[0]).toMatchObject({
      id: 'art_colors_harmony',
      componentIds: ['art_colors_harmony'],
    });
    expect(sections[1]?.subsections[0]).toMatchObject({
      id: 'art_shapes_basic',
      componentIds: ['art_shapes_basic'],
    });
  });

  it('defines the Music subject section and subsection for six-year-old lessons', () => {
    const sections = createDefaultKangurSections().filter((section) => section.subject === 'music');

    expect(sections).toHaveLength(1);
    expect(sections[0]?.id).toBe('music_scale');
    expect(sections[0]?.subsections[0]).toMatchObject({
      id: 'music_diatonic_scale',
      componentIds: ['music_diatonic_scale'],
    });
  });

  it('includes logical thinking lessons in default library', () => {
    const lessons = createDefaultKangurLessons();
    const componentIds = lessons.map((lesson) => lesson.componentId);

    expect(componentIds).toContain('logical_thinking');
    expect(componentIds).toContain('logical_patterns');
    expect(componentIds).toContain('logical_classification');
    expect(componentIds).toContain('logical_reasoning');
    expect(componentIds).toContain('logical_analogies');
  });

  it('normalizes explicit geometry lessons payload', () => {
    const parsed = normalizeKangurLessons([
      {
        id: 'g1',
        componentId: 'geometry_shapes',
        title: 'Figury',
        description: 'Opis',
        emoji: '🔷',
        color: 'kangur-gradient-accent-violet-reverse',
        activeBg: 'bg-fuchsia-500',
        sortOrder: 1000,
        enabled: true,
      },
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.componentId).toBe('geometry_shapes');
    expect(parsed[0]?.contentMode).toBe('component');
    expect(parsed[0]?.title).toBe('Figury');
  });

  it('deduplicates lessons that point at the same component and keeps the enabled lesson', () => {
    const parsed = normalizeKangurLessons([
      {
        id: 'clock-disabled',
        componentId: 'clock',
        ageGroup: 'ten_year_old',
        title: 'Nauka zegara (archiwum)',
        enabled: false,
        sortOrder: 2000,
      },
      {
        id: 'clock-active',
        componentId: 'clock',
        ageGroup: 'ten_year_old',
        title: 'Nauka zegara',
        enabled: true,
        sortOrder: 1000,
      },
      {
        id: 'calendar',
        componentId: 'calendar',
        title: 'Nauka kalendarza',
        enabled: true,
        sortOrder: 3000,
      },
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed.map((lesson) => lesson.componentId)).toEqual(['clock', 'calendar']);
    expect(parsed[0]).toMatchObject({
      id: 'clock-active',
      componentId: 'clock',
      enabled: true,
      title: 'Nauka zegara',
    });
  });

  it('preserves explicit document render mode when provided', () => {
    const parsed = normalizeKangurLessons([
      {
        id: 'doc-lesson',
        componentId: 'geometry_shapes',
        contentMode: 'document',
        title: 'SVG lesson',
        description: 'Custom lesson body',
        emoji: '🧩',
        color: 'kangur-gradient-accent-sky',
        activeBg: 'bg-sky-500',
        sortOrder: 1000,
        enabled: true,
      },
    ]);

    expect(parsed[0]?.contentMode).toBe('document');
  });

  it('defaults narrator settings to server mode with voice', () => {
    expect(parseKangurNarratorSettings(undefined)).toEqual({
      engine: 'server',
      voice: KANGUR_TTS_DEFAULT_VOICE,
    });
    expect(parseKangurNarratorSettings(JSON.stringify({}))).toEqual({
      engine: 'server',
      voice: KANGUR_TTS_DEFAULT_VOICE,
    });
  });

  it('parses persisted client narrator mode', () => {
    expect(parseKangurNarratorSettings(JSON.stringify({ engine: 'client' }))).toEqual({
      engine: 'client',
      voice: KANGUR_TTS_DEFAULT_VOICE,
    });
  });

  it('parses persisted narrator voice override', () => {
    expect(
      parseKangurNarratorSettings(JSON.stringify({ engine: 'server', voice: 'sage' }))
    ).toEqual({
      engine: 'server',
      voice: 'sage',
    });
  });

  it('parses parent verification settings with defaults', () => {
    expect(parseKangurParentVerificationEmailSettings(undefined)).toEqual({
      resendCooldownSeconds: KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_SECONDS,
      notificationsEnabled: true,
      notificationsDisabledUntil: null,
      requireEmailVerification: true,
      requireCaptcha: true,
    });
    expect(parseKangurParentVerificationEmailSettings('null')).toEqual({
      resendCooldownSeconds: KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_SECONDS,
      notificationsEnabled: true,
      notificationsDisabledUntil: null,
      requireEmailVerification: true,
      requireCaptcha: true,
    });
    expect(parseKangurParentVerificationEmailSettings(JSON.stringify({}))).toEqual({
      resendCooldownSeconds: KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_SECONDS,
      notificationsEnabled: true,
      notificationsDisabledUntil: null,
      requireEmailVerification: true,
      requireCaptcha: true,
    });
  });

  it('parses and clamps parent verification cooldown values', () => {
    expect(
      parseKangurParentVerificationEmailSettings(JSON.stringify({ resendCooldownSeconds: 15 }))
    ).toEqual({
      resendCooldownSeconds: 15,
      notificationsEnabled: true,
      notificationsDisabledUntil: null,
      requireEmailVerification: true,
      requireCaptcha: true,
    });
    expect(
      parseKangurParentVerificationEmailSettings(JSON.stringify({ resendCooldownSeconds: -5 }))
    ).toEqual({
      resendCooldownSeconds: 1,
      notificationsEnabled: true,
      notificationsDisabledUntil: null,
      requireEmailVerification: true,
      requireCaptcha: true,
    });
    expect(
      parseKangurParentVerificationEmailSettings(JSON.stringify({ resendCooldownSeconds: 5000 }))
    ).toEqual({
      resendCooldownSeconds: 3600,
      notificationsEnabled: true,
      notificationsDisabledUntil: null,
      requireEmailVerification: true,
      requireCaptcha: true,
    });
  });

  it('parses parent verification notification settings', () => {
    expect(
      parseKangurParentVerificationEmailSettings(
        JSON.stringify({ notificationsEnabled: false })
      )
    ).toEqual({
      resendCooldownSeconds: KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_SECONDS,
      notificationsEnabled: false,
      notificationsDisabledUntil: null,
      requireEmailVerification: false,
      requireCaptcha: true,
    });
    expect(
      parseKangurParentVerificationEmailSettings(
        JSON.stringify({ notificationsDisabledUntil: '2026-03-20T10:00:00.000Z' })
      )
    ).toEqual({
      resendCooldownSeconds: KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_SECONDS,
      notificationsEnabled: true,
      notificationsDisabledUntil: '2026-03-20T10:00:00.000Z',
      requireEmailVerification: true,
      requireCaptcha: true,
    });
  });

  it('defaults launch route settings to the mobile web view', () => {
    expect(parseKangurLaunchRouteSettings(undefined)).toEqual({
      route: DEFAULT_KANGUR_LAUNCH_ROUTE,
    });
    expect(parseKangurLaunchRouteSettings(JSON.stringify({}))).toEqual({
      route: DEFAULT_KANGUR_LAUNCH_ROUTE,
    });
  });

  it('parses persisted dedicated app launch route settings', () => {
    expect(parseKangurLaunchRouteSettings(JSON.stringify({ route: 'dedicated_app' }))).toEqual({
      route: 'dedicated_app',
    });
  });

  it('appends missing geometry lessons to an existing legacy-like list', () => {
    const defaultLessons = createDefaultKangurLessons();
    const legacyLike = defaultLessons.filter(
      (lesson) =>
        lesson.componentId !== 'geometry_basics' &&
        lesson.componentId !== 'geometry_shapes' &&
        lesson.componentId !== 'geometry_symmetry' &&
        lesson.componentId !== 'geometry_perimeter'
    );

    const result = appendMissingGeometryKangurLessons(legacyLike);
    const componentIds = result.lessons.map((lesson) => lesson.componentId);

    expect(result.addedCount).toBe(4);
    expect(componentIds).toContain('geometry_basics');
    expect(componentIds).toContain('geometry_shapes');
    expect(componentIds).toContain('geometry_symmetry');
    expect(componentIds).toContain('geometry_perimeter');
  });

  it('does not duplicate geometry lessons when pack already exists', () => {
    const existing = createDefaultKangurLessons();
    const ageGroups = Array.from(new Set(existing.map((l) => l.ageGroup)));
    const result = appendMissingGeometryKangurLessons(existing, ageGroups);

    expect(result.addedCount).toBe(0);
    expect(result.lessons).toHaveLength(existing.length);
  });

  it('appends missing logical thinking lessons to an existing legacy-like list', () => {
    const defaultLessons = createDefaultKangurLessons();
    const legacyLike = defaultLessons.filter(
      (lesson) =>
        lesson.componentId !== 'logical_thinking' &&
        lesson.componentId !== 'logical_patterns' &&
        lesson.componentId !== 'logical_classification' &&
        lesson.componentId !== 'logical_reasoning' &&
        lesson.componentId !== 'logical_analogies'
    );

    const ageGroups = Array.from(new Set(defaultLessons.map((l) => l.ageGroup)));
    const result = appendMissingLogicalThinkingKangurLessons(legacyLike, ageGroups);
    const componentIds = result.lessons.map((lesson) => lesson.componentId);

    expect(result.addedCount).toBe(5);
    expect(componentIds).toContain('logical_thinking');
    expect(componentIds).toContain('logical_patterns');
    expect(componentIds).toContain('logical_classification');
    expect(componentIds).toContain('logical_reasoning');
    expect(componentIds).toContain('logical_analogies');
  });

  it('does not duplicate logical thinking lessons when pack already exists', () => {
    const existing = createDefaultKangurLessons();
    const ageGroups = Array.from(new Set(existing.map((l) => l.ageGroup)));
    const result = appendMissingLogicalThinkingKangurLessons(existing, ageGroups);

    expect(result.addedCount).toBe(0);
    expect(result.lessons).toHaveLength(existing.length);
  });
});
