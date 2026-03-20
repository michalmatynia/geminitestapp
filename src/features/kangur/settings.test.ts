import { describe, expect, it } from 'vitest';

import {
  appendMissingGeometryKangurLessons,
  appendMissingLogicalThinkingKangurLessons,
  createDefaultKangurLessons,
  KANGUR_PHONE_SIMULATION_DEFAULT_ENABLED,
  KANGUR_LESSON_LIBRARY,
  KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_SECONDS,
  parseKangurNarratorSettings,
  parseKangurPhoneSimulationSettings,
  parseKangurParentVerificationEmailSettings,
  normalizeKangurLessons,
} from '@/features/kangur/settings';
import { KANGUR_TTS_DEFAULT_VOICE } from '@/features/kangur/tts/contracts';

describe('kangur lesson settings', () => {
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

  it('defaults phone simulation settings to enabled', () => {
    expect(parseKangurPhoneSimulationSettings(undefined)).toEqual({
      enabled: KANGUR_PHONE_SIMULATION_DEFAULT_ENABLED,
    });
    expect(parseKangurPhoneSimulationSettings(JSON.stringify({}))).toEqual({
      enabled: KANGUR_PHONE_SIMULATION_DEFAULT_ENABLED,
    });
  });

  it('parses persisted phone simulation settings', () => {
    expect(parseKangurPhoneSimulationSettings(JSON.stringify({ enabled: false }))).toEqual({
      enabled: false,
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
