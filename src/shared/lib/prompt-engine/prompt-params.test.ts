/**
 * @vitest-environment node
 */

import type { ParamSpec } from '@/shared/contracts/prompt-engine';
import { describe, expect, it } from 'vitest';

import { getDeepValue, validateImageStudioParams } from './prompt-params';

describe('prompt-engine prompt-params', () => {
  it('re-exports shared prompt-param helpers and reports base spec validation issues', () => {
    const specs: Record<string, ParamSpec> = {
      exposure: {
        path: 'camera.exposure',
        kind: 'number',
        integer: true,
        min: 0,
        max: 10,
      },
      profile: {
        path: 'output_profile',
        kind: 'enum',
        enumOptions: ['ecommerce_strict', 'editorial_white'],
      },
    };

    expect(getDeepValue({ camera: { exposure: 4 } }, 'camera.exposure')).toBe(4);
    expect(validateImageStudioParams({}, specs)).toEqual([
      {
        path: 'camera.exposure',
        severity: 'error',
        code: 'missing',
        message: 'Missing value.',
      },
      {
        path: 'output_profile',
        severity: 'error',
        code: 'missing',
        message: 'Missing value.',
      },
    ]);
  });

  it('adds image-studio-specific errors and warnings for conflicting prompt params', () => {
    const params = {
      output_profile: 'ecommerce_strict',
      background_rgb: [240, 240, 240],
      background_policy: { mode: 'allow_editorial_vignette' },
      add_new_ground_shadow: true,
      preserve_original_shadows: true,
      shadow_control: {
        distribution_model: 'directional_cast',
        assume_object_pose: 'standing',
      },
      lighting_style_overrides: true,
      lighting_style: 'manual',
      shadow_style: 'none',
    };

    const issues = validateImageStudioParams(params, {});

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          path: 'background_rgb',
          severity: 'error',
          code: 'white_bg',
          message:
            'For ecommerce_strict/editorial_white, background_rgb must be [255,255,255].',
        },
        {
          path: 'background_policy.mode',
          severity: 'error',
          code: 'white_bg_mode',
          message:
            'For ecommerce_strict/editorial_white, background_policy.mode cannot be allow_editorial_vignette.',
        },
        {
          path: 'preserve_original_shadows',
          severity: 'warning',
          code: 'double_shadow',
          message:
            'preserve_original_shadows=true with add_new_ground_shadow=true can create double shadows.',
        },
        {
          path: 'shadow_control.distribution_model',
          severity: 'warning',
          code: 'shadow_directional_cast',
          message:
            'directional_cast is discouraged for flat-lay prompts (prefer flat_lay_contact/compact_under_base).',
        },
        {
          path: 'shadow_control.assume_object_pose',
          severity: 'warning',
          code: 'shadow_pose',
          message: 'assume_object_pose should be flat_lay for flat-lay enforcement.',
        },
        {
          path: 'lighting_style',
          severity: 'warning',
          code: 'lighting_manual_overrides',
          message:
            'lighting_style_overrides=true with lighting_style=manual is inconsistent (manual implies no preset override).',
        },
        {
          path: 'shadow_style',
          severity: 'warning',
          code: 'shadow_style_none',
          message:
            'add_new_ground_shadow=true with shadow_style=none will likely produce no visible shadow.',
        },
      ])
    );
  });

  it('accepts clean image-studio params without emitting prompt-specific issues', () => {
    const params = {
      output_profile: 'editorial_white',
      background_rgb: [255, 255, 255],
      background_policy: { mode: 'solid' },
      add_new_ground_shadow: false,
      preserve_original_shadows: true,
      shadow_control: {
        distribution_model: 'compact_under_base',
        assume_object_pose: 'flat_lay',
      },
      lighting_style_overrides: false,
      lighting_style: 'manual',
      shadow_style: 'soft',
    };

    expect(validateImageStudioParams(params, {})).toEqual([]);
  });
});
