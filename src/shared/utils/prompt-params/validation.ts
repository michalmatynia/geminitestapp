import { type ParamSpec, type ParamIssue } from '@/shared/contracts/prompt-engine';

import { getDeepValue, isRgbArray, isTuple2NumberArray } from './utils';

const validateNumber = (value: unknown, spec: ParamSpec & { kind: 'number' }): ParamIssue[] => {
  const issues: ParamIssue[] = [];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'type',
      message: 'Expected number.',
    });
    return issues;
  }
  if (spec.integer === true && !Number.isInteger(value)) {
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
  return issues;
};

const validateRgb = (value: unknown, spec: ParamSpec & { kind: 'rgb' }): ParamIssue[] => {
  const issues: ParamIssue[] = [];
  if (!isRgbArray(value)) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'type',
      message: 'Expected [R,G,B] array.',
    });
    return issues;
  }
  const numericArray = value as number[];
  if (numericArray.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'type',
      message: 'RGB must be numeric.',
    });
    return issues;
  }
  if (spec.integer === true && numericArray.some((v) => !Number.isInteger(v))) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'integer',
      message: 'RGB values must be integers.',
    });
  }
  if (spec.min !== undefined && numericArray.some((v) => v < spec.min!)) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'min',
      message: `RGB values must be >= ${spec.min}.`,
    });
  }
  if (spec.max !== undefined && numericArray.some((v) => v > spec.max!)) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'max',
      message: `RGB values must be <= ${spec.max}.`,
    });
  }
  return issues;
};

const validateTuple2 = (value: unknown, spec: ParamSpec & { kind: 'tuple2' }): ParamIssue[] => {
  const issues: ParamIssue[] = [];
  if (!isTuple2NumberArray(value)) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'type',
      message: 'Expected [x,y] numeric array.',
    });
    return issues;
  }
  const numericArray = value as number[];
  if (spec.integer === true && numericArray.some((v) => !Number.isInteger(v))) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'integer',
      message: 'Values must be integers.',
    });
  }
  if (spec.min !== undefined && numericArray.some((v) => v < spec.min!)) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'min',
      message: `Values must be >= ${spec.min}.`,
    });
  }
  if (spec.max !== undefined && numericArray.some((v) => v > spec.max!)) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'max',
      message: `Values must be <= ${spec.max}.`,
    });
  }
  return issues;
};

const validateSingleParam = (value: unknown, spec: ParamSpec): ParamIssue[] => {
  if (value === undefined) {
    return [
      {
        path: spec.path,
        severity: 'error',
        code: 'missing',
        message: 'Missing value.',
      },
    ];
  }

  if (spec.kind === 'boolean') {
    return typeof value !== 'boolean'
      ? [{ path: spec.path, severity: 'error', code: 'type', message: 'Expected boolean.' }]
      : [];
  }

  if (spec.kind === 'string') {
    return typeof value !== 'string'
      ? [{ path: spec.path, severity: 'error', code: 'type', message: 'Expected string.' }]
      : [];
  }

  if (spec.kind === 'enum') {
    if (typeof value !== 'string') {
      return [{ path: spec.path, severity: 'error', code: 'type', message: 'Expected string enum.' }];
    }
    if (spec.enumOptions && !spec.enumOptions.includes(value)) {
      return [
        {
          path: spec.path,
          severity: 'error',
          code: 'enum',
          message: `Value must be one of: ${spec.enumOptions.join(', ')}`,
        },
      ];
    }
    return [];
  }

  if (spec.kind === 'number') {
    return validateNumber(value, spec as ParamSpec & { kind: 'number' });
  }

  if (spec.kind === 'rgb') {
    return validateRgb(value, spec as ParamSpec & { kind: 'rgb' });
  }

  if (spec.kind === 'tuple2') {
    return validateTuple2(value, spec as ParamSpec & { kind: 'tuple2' });
  }

  return [];
};

export function validateParamsAgainstSpecs(
  params: Record<string, unknown>,
  specs: Record<string, ParamSpec>
): ParamIssue[] {
  const issues: ParamIssue[] = [];

  Object.values(specs).forEach((spec: ParamSpec) => {
    const value = getDeepValue(params, spec.path);
    issues.push(...validateSingleParam(value, spec));
  });

  return issues;
}
