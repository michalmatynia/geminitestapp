import type { FieldValidatorIssue } from '@/shared/contracts/products/validation';

export const mergeFieldIssueMaps = (
  staticIssues: Record<string, FieldValidatorIssue[]>,
  runtimeIssues: Record<string, FieldValidatorIssue[]>
): Record<string, FieldValidatorIssue[]> => {
  const merged: Record<string, FieldValidatorIssue[]> = {};
  const keys = new Set<string>([...Object.keys(staticIssues), ...Object.keys(runtimeIssues)]);
  for (const key of keys) {
    merged[key] = [...(staticIssues[key] ?? []), ...(runtimeIssues[key] ?? [])];
  }
  return merged;
};

const ISSUE_COMPARISON_FIELDS: readonly (keyof FieldValidatorIssue)[] = [
  'patternId',
  'message',
  'severity',
  'matchText',
  'index',
  'length',
  'regex',
  'flags',
  'replacementValue',
  'replacementApplyMode',
  'replacementScope',
  'replacementActive',
  'postAcceptBehavior',
  'debounceMs',
];

const areIssuesEquivalent = (
  leftIssue: FieldValidatorIssue,
  rightIssue: FieldValidatorIssue
): boolean =>
  ISSUE_COMPARISON_FIELDS.every((field) => leftIssue[field] === rightIssue[field]);

const areIssueListsEquivalent = (
  leftList: FieldValidatorIssue[],
  rightList: FieldValidatorIssue[]
): boolean => {
  if (leftList.length !== rightList.length) return false;
  return leftList.every((leftIssue, index) => {
    const rightIssue = rightList[index];
    return rightIssue !== undefined && areIssuesEquivalent(leftIssue, rightIssue);
  });
};

export const areIssueMapsEquivalent = (
  left: Record<string, FieldValidatorIssue[]>,
  right: Record<string, FieldValidatorIssue[]>
): boolean => {
  if (left === right) return true;
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every((key) => areIssueListsEquivalent(left[key] ?? [], right[key] ?? []));
};
