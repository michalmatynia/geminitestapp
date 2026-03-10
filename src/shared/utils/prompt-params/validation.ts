import { ParamSpec, ParamIssue } from '@/shared/contracts/prompt-engine';

import { getDeepValue, isRgbArray, isTuple2NumberArray } from './utils';

export function validateParamsAgainstSpecs(
  params: Record<string, unknown>,
  specs: Record<string, ParamSpec>
): ParamIssue[] {
  const issues: ParamIssue[] = [];

  Object.values(specs).forEach((spec: ParamSpec) => {
    const value = getDeepValue(params, spec.path);
    if (value === undefined) {
      issues.push({
        path: spec.path,
        severity: 'error',
        code: 'missing',
        message: 'Missing value.',
      });
      return;
    }

    if (spec.kind === 'boolean') {
      if (typeof value !== 'boolean') {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected boolean.',
        });
      }
      return;
    }

    if (spec.kind === 'string') {
      if (typeof value !== 'string') {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected string.',
        });
      }
      return;
    }

    if (spec.kind === 'enum') {
      if (typeof value !== 'string') {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected string enum.',
        });
        return;
      }
      if (spec.enumOptions && !spec.enumOptions.includes(value)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'enum',
          message: `Value must be one of: ${spec.enumOptions.join(', ')}`,
        });
      }
      return;
    }

    if (spec.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected number.',
        });
        return;
      }
      if (spec.integer && !Number.isInteger(value)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'integer',
          message: 'Must be an integer.',
        });
      }
      if (spec.min !== undefined && value < spec.min) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'min',
          message: `Must be >= ${spec.min}.`,
        });
      }
      if (spec.max !== undefined && value > spec.max) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'max',
          message: `Must be <= ${spec.max}.`,
        });
      }
      return;
    }

    if (spec.kind === 'rgb') {
      if (!isRgbArray(value)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected [R,G,B] array.',
        });
        return;
      }
      if (value.some((v: unknown) => typeof v !== 'number' || !Number.isFinite(v))) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'RGB must be numeric.',
        });
        return;
      }
      if (spec.integer && value.some((v: unknown) => !Number.isInteger(v))) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'integer',
          message: 'RGB values must be integers.',
        });
      }
      const min = spec.min;
      if (min !== undefined && value.some((v: unknown) => (v as number) < min)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'min',
          message: `RGB values must be >= ${min}.`,
        });
      }
      const max = spec.max;
      if (max !== undefined && value.some((v: unknown) => (v as number) > max)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'max',
          message: `RGB values must be <= ${max}.`,
        });
      }
      return;
    }

    if (spec.kind === 'tuple2') {
      if (!isTuple2NumberArray(value)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'type',
          message: 'Expected [x,y] numeric array.',
        });
        return;
      }
      if (spec.integer && value.some((v: unknown) => !Number.isInteger(v))) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'integer',
          message: 'Values must be integers.',
        });
      }
      const min = spec.min;
      if (min !== undefined && value.some((v: unknown) => (v as number) < min)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'min',
          message: `Values must be >= ${min}.`,
        });
      }
      const max = spec.max;
      if (max !== undefined && value.some((v: unknown) => (v as number) > max)) {
        issues.push({
          path: spec.path,
          severity: 'error',
          code: 'max',
          message: `Values must be <= ${max}.`,
        });
      }
      return;
    }
  });

  return issues;
}
