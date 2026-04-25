import type { ParsedLegacyValue } from './filemaker-values-import.parser';
import type { FilemakerValue } from './types';

const preferFirstDefined = <T>(first: T | undefined, second: T | undefined): T | undefined => {
  if (first !== undefined) return first;
  return second;
};

export const resolveImportedValueAuditFields = (
  value: ParsedLegacyValue,
  existingValue: FilemakerValue | undefined
): Pick<FilemakerValue, 'createdAt' | 'updatedAt'> & {
  createdBy?: string;
  updatedBy?: string;
} => ({
  createdBy: preferFirstDefined(existingValue?.createdBy, value.createdBy),
  updatedBy: preferFirstDefined(value.updatedBy, existingValue?.updatedBy),
  createdAt: preferFirstDefined(existingValue?.createdAt, value.createdAt),
  updatedAt: preferFirstDefined(value.updatedAt, existingValue?.updatedAt),
});
