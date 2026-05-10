import type {
  FieldValidatorIssue,
  ProductValidationPattern,
  ProductValidationPostAcceptBehavior,
} from '@/shared/contracts/products/validation';

export type { FieldValidatorIssue };

export type SequenceIssueAggregate = {
  groupId: string;
  groupLabel: string | null;
  originalValue: string;
  finalValue: string;
  severity: FieldValidatorIssue['severity'];
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  debounceMs: number;
};

export type ResolvedReplacement = {
  value: string;
  kind: 'static' | 'dynamic';
  applyMode: 'replace_whole_field' | 'replace_matched_segment';
} | null;

export type StaticPatternPlan = {
  pattern: ProductValidationPattern;
  replacementFields: string[];
  debounceMs: number;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  maxExecutions: number;
  chainMode: 'continue' | 'stop_on_match' | 'stop_on_replace';
  inSequenceGroup: boolean;
  sequenceGroupId: string | null;
  allowWithoutRegexMatch: boolean;
};

export type ProductValidationPatternRegexMatch = {
  pattern: ProductValidationPattern;
  patternId: string;
  matchText: string;
  index: number;
  length: number;
  captures: string[];
  groups: Record<string, string>;
};
