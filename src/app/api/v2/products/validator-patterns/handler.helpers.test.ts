import { beforeEach, describe, expect, it, vi } from 'vitest';

const { validateAndNormalizeRuntimeConfigMock } = vi.hoisted(() => ({
  validateAndNormalizeRuntimeConfigMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  validateAndNormalizeRuntimeConfig: (...args: unknown[]) =>
    validateAndNormalizeRuntimeConfigMock(...args),
}));

import {
  buildValidatorPatternCreateInput,
  normalizeValidatorPatternCreateReplacementFields,
  resolveValidatorPatternCreateState,
} from './handler.helpers';

describe('validator-patterns handler helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateAndNormalizeRuntimeConfigMock.mockImplementation(
      ({ runtimeConfig }: { runtimeConfig: string | null }) =>
        runtimeConfig ? `normalized:${runtimeConfig}` : null
    );
  });

  it('dedupes replacement fields and resolves create state', () => {
    expect(normalizeValidatorPatternCreateReplacementFields(['sku', 'sku', 'name'])).toEqual([
      'sku',
      'name',
    ]);

    expect(
      resolveValidatorPatternCreateState({
        label: ' Pattern ',
        target: 'name',
        locale: ' EN ',
        regex: ' next-regex ',
        flags: ' gi ',
        message: ' Updated message ',
        replacementFields: ['sku', 'sku', 'name'],
        runtimeEnabled: true,
        runtimeType: 'database_query',
        runtimeConfig: ' config ',
        launchEnabled: true,
        launchSourceMode: 'form_field',
        launchSourceField: ' field-1 ',
        launchAppliesToScopes: ['product_create', 'product_create'],
        appliesToScopes: ['product_edit', 'product_edit'],
      })
    ).toMatchObject({
      label: 'Pattern',
      locale: 'en',
      regex: 'next-regex',
      flags: 'gi',
      message: 'Updated message',
      replacementFields: ['sku', 'name'],
      runtimeConfig: 'normalized:config',
      launchSourceField: 'field-1',
      launchAppliesToScopes: ['product_create'],
      appliesToScopes: ['product_edit'],
    });
  });

  it('rejects invalid replacement and launch state combinations', () => {
    expect(() =>
      resolveValidatorPatternCreateState({
        label: 'Pattern',
        target: 'name',
        regex: 'next-regex',
        message: 'Updated message',
        replacementEnabled: true,
      })
    ).toThrow(
      'replacementValue is required when replacementEnabled is true unless runtime replacement is enabled'
    );

    expect(() =>
      resolveValidatorPatternCreateState({
        label: 'Pattern',
        target: 'name',
        regex: 'next-regex',
        message: 'Updated message',
        launchEnabled: true,
        launchSourceMode: 'form_field',
      })
    ).toThrow('launchSourceField is required when launchSourceMode is not current_field');
  });

  it('builds the create payload with normalized defaults', () => {
    const state = resolveValidatorPatternCreateState({
      label: ' Pattern ',
      target: 'name',
      locale: ' EN ',
      regex: ' next-regex ',
      flags: ' gi ',
      message: ' Updated message ',
      replacementFields: ['sku', 'sku', 'name'],
      runtimeEnabled: true,
      runtimeType: 'database_query',
      runtimeConfig: ' config ',
      denyBehaviorOverride: 'mute_session',
    });

    expect(
      buildValidatorPatternCreateInput({
        body: {
          label: ' Pattern ',
          target: 'name',
          locale: ' EN ',
          regex: ' next-regex ',
          flags: ' gi ',
          message: ' Updated message ',
          replacementFields: ['sku', 'sku', 'name'],
          runtimeEnabled: true,
          runtimeType: 'database_query',
          runtimeConfig: ' config ',
          denyBehaviorOverride: 'mute_session',
        },
        state,
      })
    ).toMatchObject({
      label: 'Pattern',
      target: 'name',
      locale: 'en',
      regex: 'next-regex',
      flags: 'gi',
      message: 'Updated message',
      severity: 'error',
      enabled: true,
      replacementFields: ['sku', 'name'],
      runtimeEnabled: true,
      runtimeType: 'database_query',
      runtimeConfig: 'normalized:config',
      denyBehaviorOverride: 'mute_session',
      sequence: null,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: true,
    });
  });
});
