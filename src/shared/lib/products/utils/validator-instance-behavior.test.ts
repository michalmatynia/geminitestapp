/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PRODUCT_VALIDATION_INSTANCE_DENY_BEHAVIOR,
  PRODUCT_VALIDATION_INSTANCE_SCOPES,
  isPatternEnabledForValidationScope,
  isPatternLaunchEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
  normalizeProductValidationDenyBehavior,
  normalizeProductValidationInstanceDenyBehaviorMap,
  normalizeProductValidationInstanceScope,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationSkipNoopReplacementProposal,
} from './validator-instance-behavior';

describe('products validator-instance-behavior utils', () => {
  it('normalizes scope lists with defaults, deduping, and canonical ordering', () => {
    expect(PRODUCT_VALIDATION_INSTANCE_SCOPES).toEqual([
      'draft_template',
      'product_create',
      'product_edit',
    ]);
    expect(normalizeProductValidationPatternScopes(undefined)).toEqual(
      PRODUCT_VALIDATION_INSTANCE_SCOPES
    );
    expect(
      normalizeProductValidationPatternScopes([
        'product_edit',
        'product_create',
        'product_edit',
        'unknown',
      ])
    ).toEqual(['product_create', 'product_edit']);
    expect(normalizeProductValidationPatternScopes(['unknown'])).toEqual(
      PRODUCT_VALIDATION_INSTANCE_SCOPES
    );
  });

  it('normalizes replacement and launch scopes and exposes scope checks', () => {
    expect(
      normalizeProductValidationPatternReplacementScopes([
        'draft_template',
        'draft_template',
        'product_edit',
      ])
    ).toEqual(['draft_template', 'product_edit']);
    expect(normalizeProductValidationPatternReplacementScopes('bad')).toEqual(
      PRODUCT_VALIDATION_INSTANCE_SCOPES
    );
    expect(
      normalizeProductValidationPatternLaunchScopes(['product_edit', 'product_create', 'bad'])
    ).toEqual(['product_create', 'product_edit']);
    expect(normalizeProductValidationPatternLaunchScopes([])).toEqual(
      PRODUCT_VALIDATION_INSTANCE_SCOPES
    );

    expect(isPatternEnabledForValidationScope(['product_edit'], 'product_edit')).toBe(true);
    expect(isPatternEnabledForValidationScope(['product_edit'], 'product_create')).toBe(false);
    expect(
      isPatternReplacementEnabledForValidationScope(['draft_template'], 'draft_template')
    ).toBe(true);
    expect(isPatternLaunchEnabledForValidationScope(['product_create'], 'product_create')).toBe(
      true
    );
  });

  it('normalizes launch behavior, noop replacement flags, deny behavior, and overrides', () => {
    expect(normalizeProductValidationLaunchScopeBehavior('condition_only')).toBe(
      'condition_only'
    );
    expect(normalizeProductValidationLaunchScopeBehavior('anything-else')).toBe('gate');
    expect(normalizeProductValidationSkipNoopReplacementProposal(false)).toBe(false);
    expect(normalizeProductValidationSkipNoopReplacementProposal(undefined)).toBe(true);
    expect(normalizeProductValidationDenyBehavior('ask_again')).toBe('ask_again');
    expect(normalizeProductValidationDenyBehavior('invalid')).toBe('mute_session');
    expect(normalizeProductValidationPatternDenyBehaviorOverride('ask_again')).toBe('ask_again');
    expect(normalizeProductValidationPatternDenyBehaviorOverride('mute_session')).toBe(
      'mute_session'
    );
    expect(normalizeProductValidationPatternDenyBehaviorOverride('invalid')).toBeNull();
  });

  it('normalizes instance scopes and deny behavior maps with defaults', () => {
    expect(normalizeProductValidationInstanceScope('draft_template')).toBe('draft_template');
    expect(normalizeProductValidationInstanceScope('product_edit')).toBe('product_edit');
    expect(normalizeProductValidationInstanceScope('anything-else')).toBe('product_create');
    expect(DEFAULT_PRODUCT_VALIDATION_INSTANCE_DENY_BEHAVIOR).toEqual({
      draft_template: 'mute_session',
      product_create: 'mute_session',
      product_edit: 'mute_session',
    });
    expect(
      normalizeProductValidationInstanceDenyBehaviorMap({
        draft_template: 'ask_again',
        product_create: 'invalid',
      })
    ).toEqual({
      draft_template: 'ask_again',
      product_create: 'mute_session',
      product_edit: 'mute_session',
    });
    expect(normalizeProductValidationInstanceDenyBehaviorMap(null)).toEqual(
      DEFAULT_PRODUCT_VALIDATION_INSTANCE_DENY_BEHAVIOR
    );
  });
});
