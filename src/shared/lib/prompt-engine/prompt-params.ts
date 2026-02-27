import type { 
  ParamSpecDto as ParamSpec,
  ParamIssueDto as ParamIssue,
} from '@/shared/contracts/prompt-engine';
import { 
  validateParamsAgainstSpecs,
  getDeepValue,
} from '@/shared/utils/prompt-params';

export * from '@/shared/utils/prompt-params';

function isRgbArray(value: unknown): value is [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) return false;
  return value.every((v: unknown) => typeof v === 'number' && Number.isFinite(v));
}

function isExactRgb(value: unknown, rgb: [number, number, number]): boolean {
  if (!isRgbArray(value)) return false;
  return value[0] === rgb[0] && value[1] === rgb[1] && value[2] === rgb[2];
}

export function validateImageStudioParams(
  params: Record<string, unknown>,
  specs: Record<string, ParamSpec>
): ParamIssue[] {
  const issues: ParamIssue[] = [...validateParamsAgainstSpecs(params, specs)];

  const outputProfile = getDeepValue(params, 'output_profile');
  const bgMode = getDeepValue(params, 'background_policy.mode');

  if (outputProfile === 'ecommerce_strict' || outputProfile === 'editorial_white') {
    if (!isExactRgb(getDeepValue(params, 'background_rgb'), [255, 255, 255])) {
      issues.push({
        path: 'background_rgb',
        severity: 'error',
        code: 'white_bg',
        message: 'For ecommerce_strict/editorial_white, background_rgb must be [255,255,255].',
      });
    }

    if (bgMode === 'allow_editorial_vignette') {
      issues.push({
        path: 'background_policy.mode',
        severity: 'error',
        code: 'white_bg_mode',
        message: 'For ecommerce_strict/editorial_white, background_policy.mode cannot be allow_editorial_vignette.',
      });
    }
  }

  const addNewShadow = getDeepValue(params, 'add_new_ground_shadow');
  const preserveOriginalShadows = getDeepValue(params, 'preserve_original_shadows');
  if (addNewShadow === true && preserveOriginalShadows === true) {
    issues.push({
      path: 'preserve_original_shadows',
      severity: 'warning',
      code: 'double_shadow',
      message: 'preserve_original_shadows=true with add_new_ground_shadow=true can create double shadows.',
    });
  }

  const distributionModel = getDeepValue(params, 'shadow_control.distribution_model');
  if (distributionModel === 'directional_cast') {
    issues.push({
      path: 'shadow_control.distribution_model',
      severity: 'warning',
      code: 'shadow_directional_cast',
      message: 'directional_cast is discouraged for flat-lay prompts (prefer flat_lay_contact/compact_under_base).',
    });
  }

  const assumePose = getDeepValue(params, 'shadow_control.assume_object_pose');
  if (assumePose && assumePose !== 'flat_lay') {
    issues.push({
      path: 'shadow_control.assume_object_pose',
      severity: 'warning',
      code: 'shadow_pose',
      message: 'assume_object_pose should be flat_lay for flat-lay enforcement.',
    });
  }

  const lightingOverrides = getDeepValue(params, 'lighting_style_overrides');
  const lightingStyle = getDeepValue(params, 'lighting_style');
  if (lightingOverrides === true && lightingStyle === 'manual') {
    issues.push({
      path: 'lighting_style',
      severity: 'warning',
      code: 'lighting_manual_overrides',
      message: 'lighting_style_overrides=true with lighting_style=manual is inconsistent (manual implies no preset override).',
    });
  }

  const shadowStyle = getDeepValue(params, 'shadow_style');
  if (addNewShadow === true && shadowStyle === 'none') {
    issues.push({
      path: 'shadow_style',
      severity: 'warning',
      code: 'shadow_style_none',
      message: 'add_new_ground_shadow=true with shadow_style=none will likely produce no visible shadow.',
    });
  }

  return issues;
}
