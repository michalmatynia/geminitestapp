import { beforeEach, describe, expect, it, vi } from 'vitest';

const { validateAndNormalizeRuntimeConfigMock } = vi.hoisted(() => ({
  validateAndNormalizeRuntimeConfigMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  validateAndNormalizeRuntimeConfig: (...args: unknown[]) =>
    validateAndNormalizeRuntimeConfigMock(...args),
}));

import {
  buildDeleteValidatorPatternResponse,
  buildValidatorPatternUpdateInput,
  normalizeValidatorPatternReplacementFields,
  resolveValidatorPatternUpdateState,
} from './handler.helpers';

describe('validator-patterns by-id handler helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateAndNormalizeRuntimeConfigMock.mockImplementation(
      ({ runtimeConfig }: { runtimeConfig: string | null }) =>
        runtimeConfig ? `normalized:${runtimeConfig}` : null
    );
  });

  it('dedupes replacement fields and resolves update state', () => {
    expect(normalizeValidatorPatternReplacementFields(['sku', 'sku', 'name'])).toEqual([
      'sku',
      'name',
    ]);

    expect(
      resolveValidatorPatternUpdateState({
        current: {
          regex: 'existing',
          flags: null,
          replacementEnabled: false,
          replacementValue: null,
          replacementFields: ['sku'],
          replacementAppliesToScopes: ['product_edit'],
          runtimeEnabled: false,
          runtimeType: 'none',
          runtimeConfig: null,
          launchEnabled: false,
          launchAppliesToScopes: ['product_edit'],
          launchScopeBehavior: 'gate',
          launchSourceMode: 'current_field',
          launchSourceField: null,
          launchOperator: 'equals',
          launchValue: null,
          launchFlags: null,
          appliesToScopes: ['product_edit'],
        },
        body: {
          regex: ' next-regex ',
          flags: ' gi ',
          replacementFields: ['sku', 'sku', 'name'],
          runtimeEnabled: true,
          runtimeType: 'database_query',
          runtimeConfig: ' config ',
          launchEnabled: true,
          launchSourceMode: 'form_field',
          launchSourceField: ' field-1 ',
          launchAppliesToScopes: ['product_create', 'product_create'],
          appliesToScopes: ['product_edit', 'product_edit'],
        },
      })
    ).toMatchObject({
      nextRegex: 'next-regex',
      nextFlags: 'gi',
      nextReplacementFields: ['sku', 'name'],
      nextRuntimeConfig: 'normalized:config',
      shouldPersistRuntimeConfig: true,
      nextLaunchSourceField: 'field-1',
      nextLaunchAppliesToScopes: ['product_create'],
      nextAppliesToScopes: ['product_edit'],
    });
  });

  it('rejects invalid replacement and launch state combinations', () => {
    expect(() =>
      resolveValidatorPatternUpdateState({
        current: {
          regex: 'existing',
          flags: null,
          replacementEnabled: false,
          replacementValue: null,
          replacementFields: [],
          replacementAppliesToScopes: ['product_edit'],
          runtimeEnabled: false,
          runtimeType: 'none',
          runtimeConfig: null,
          launchEnabled: false,
          launchAppliesToScopes: ['product_edit'],
          launchScopeBehavior: 'gate',
          launchSourceMode: 'current_field',
          launchSourceField: null,
          launchOperator: 'equals',
          launchValue: null,
          launchFlags: null,
          appliesToScopes: ['product_edit'],
        },
        body: {
          replacementEnabled: true,
        },
      })
    ).toThrow(
      'replacementValue is required when replacementEnabled is true unless runtime replacement is enabled'
    );

    expect(() =>
      resolveValidatorPatternUpdateState({
        current: {
          regex: 'existing',
          flags: null,
          replacementEnabled: false,
          replacementValue: null,
          replacementFields: [],
          replacementAppliesToScopes: ['product_edit'],
          runtimeEnabled: false,
          runtimeType: 'none',
          runtimeConfig: null,
          launchEnabled: false,
          launchAppliesToScopes: ['product_edit'],
          launchScopeBehavior: 'gate',
          launchSourceMode: 'current_field',
          launchSourceField: null,
          launchOperator: 'equals',
          launchValue: null,
          launchFlags: null,
          appliesToScopes: ['product_edit'],
        },
        body: {
          launchEnabled: true,
          launchSourceMode: 'form_field',
        },
      })
    ).toThrow('launchSourceField is required when launchSourceMode is not current_field');
  });

  it('builds the update patch and delete response', () => {
    const input = buildValidatorPatternUpdateInput({
      body: {
        label: ' Pattern ',
        locale: ' EN ',
        message: ' Updated ',
        replacementFields: ['sku', 'name'],
        runtimeEnabled: true,
        runtimeType: 'database_query',
        runtimeConfig: ' config ',
        denyBehaviorOverride: 'mute_session',
        expectedUpdatedAt: ' 2026-04-04T00:00:00.000Z ',
      },
      state: {
        nextRegex: 'existing',
        nextFlags: null,
        nextReplacementEnabled: false,
        nextReplacementValue: null,
        nextReplacementFields: ['sku', 'name'],
        nextReplacementAppliesToScopes: ['product_edit'],
        nextRuntimeEnabled: true,
        nextRuntimeType: 'database_query',
        nextRuntimeConfig: 'normalized:config',
        shouldPersistRuntimeConfig: true,
        nextLaunchEnabled: false,
        nextLaunchAppliesToScopes: ['product_edit'],
        nextLaunchScopeBehavior: 'gate',
        nextLaunchSourceMode: 'current_field',
        nextLaunchSourceField: null,
        nextLaunchOperator: 'equals',
        nextLaunchValue: null,
        nextLaunchFlags: null,
        nextAppliesToScopes: ['product_edit'],
      },
    });

    expect(input).toMatchObject({
      label: 'Pattern',
      locale: 'en',
      message: 'Updated',
      replacementFields: ['sku', 'name'],
      runtimeEnabled: true,
      runtimeType: 'database_query',
      runtimeConfig: 'normalized:config',
      denyBehaviorOverride: 'mute_session',
      expectedUpdatedAt: '2026-04-04T00:00:00.000Z',
    });

    expect(buildDeleteValidatorPatternResponse().status).toBe(204);
  });
});
