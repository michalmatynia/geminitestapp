import { type ParamSpec, type ParamIssue } from '@/shared/contracts/prompt-engine';

import { getDeepValue, isRgbArray, isTuple2NumberArray } from './utils';

const validateNumberBounds = (value: number, spec: ParamSpec & { kind: 'number' }): ParamIssue[] => {
  const issues: ParamIssue[] = [];
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

const validateNumber = (value: unknown, spec: ParamSpec & { kind: 'number' }): ParamIssue[] => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return [
      {
        path: spec.path,
        severity: 'error',
        code: 'type',
        message: 'Expected number.',
      },
    ];
  }
  const issues: ParamIssue[] = [];
  if (spec.integer === true && !Number.isInteger(value)) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'integer',
      message: 'Must be an integer.',
    });
  }
  issues.push(...validateNumberBounds(value, spec));
  return issues;
};

const validateArrayBounds = (
  values: number[],
  spec: { path: string; min?: number; max?: number }
): ParamIssue[] => {
  const { path, min, max } = spec;
  const issues: ParamIssue[] = [];
  if (min !== undefined && values.some((v) => v < min)) {
    issues.push({
      path,
      severity: 'error',
      code: 'min',
      message: `Values must be >= ${min}.`,
    });
  }
  if (max !== undefined && values.some((v) => v > max)) {
    issues.push({
      path,
      severity: 'error',
      code: 'max',
      message: `Values must be <= ${max}.`,
    });
  }
  return issues;
};

const validateRgb = (value: unknown, spec: ParamSpec & { kind: 'rgb' }): ParamIssue[] => {
  if (!isRgbArray(value)) {
    return [
      {
        path: spec.path,
        severity: 'error',
        code: 'type',
        message: 'Expected [R,G,B] array.',
      },
    ];
  }
  const numericArray = value as number[];
  if (numericArray.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
    return [
      {
        path: spec.path,
        severity: 'error',
        code: 'type',
        message: 'RGB must be numeric.',
      },
    ];
  }
  const issues: ParamIssue[] = [];
  if (spec.integer === true && numericArray.some((v) => !Number.isInteger(v))) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'integer',
      message: 'RGB values must be integers.',
    });
  }
  issues.push(...validateArrayBounds(numericArray, spec));
  return issues;
};

const validateTuple2 = (value: unknown, spec: ParamSpec & { kind: 'tuple2' }): ParamIssue[] => {
  if (!isTuple2NumberArray(value)) {
    return [
      {
        path: spec.path,
        severity: 'error',
        code: 'type',
        message: 'Expected [x,y] numeric array.',
      },
    ];
  }
  const numericArray = value as number[];
  const issues: ParamIssue[] = [];
  if (spec.integer === true && numericArray.some((v) => !Number.isInteger(v))) {
    issues.push({
      path: spec.path,
      severity: 'error',
      code: 'integer',
      message: 'Values must be integers.',
    });
  }
  issues.push(...validateArrayBounds(numericArray, spec));
  return issues;
};

const validateEnum = (value: unknown, spec: ParamSpec & { kind: 'enum' }): ParamIssue[] => {
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
};

const validateBoolean = (value: unknown, spec: ParamSpec): ParamIssue[] =>
  typeof value !== 'boolean'
    ? [{ path: spec.path, severity: 'error', code: 'type', message: 'Expected boolean.' }]
    : [];

const validateString = (value: unknown, spec: ParamSpec): ParamIssue[] =>
  typeof value !== 'string'
    ? [{ path: spec.path, severity: 'error', code: 'type', message: 'Expected string.' }]
    : [];

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

  switch (spec.kind) {
    case 'boolean':
      return validateBoolean(value, spec);
    case 'string':
      return validateString(value, spec);
    case 'enum':
      return validateEnum(value, spec);
    case 'number':
      return validateNumber(value, spec);
    case 'rgb':
      return validateRgb(value, spec);
    case 'tuple2':
      return validateTuple2(value, spec);
    default:
      return [];
  }
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
