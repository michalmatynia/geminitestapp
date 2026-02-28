import {
  FILEMAKER_EMAIL_PARSER_RULE_PREFIX,
  FILEMAKER_PHONE_VALIDATION_RULE_PREFIX,
} from './settings-constants';

export type FilemakerEmailParserRule = {
  id: string;
  pattern: string;
  flags?: string | null;
  sequence?: number | null;
};

export type FilemakerEmailExtractionResult = {
  emails: string[];
  totalMatches: number;
  invalidMatches: number;
  usedDefaultRules: boolean;
};

export type FilemakerPhoneValidationRule = {
  id: string;
  pattern: string;
  flags?: string | null;
  sequence?: number | null;
};

export type FilemakerPhoneValidationResult = {
  isValid: boolean;
  normalizedPhoneNumber: string;
  matchedRuleId: string | null;
  usedDefaultRules: boolean;
};

export const DEFAULT_FILEMAKER_EMAIL_PARSER_RULES: FilemakerEmailParserRule[] = [
  {
    id: `${FILEMAKER_EMAIL_PARSER_RULE_PREFIX}mailto`,
    pattern: 'mailto:\\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})',
    flags: 'gi',
    sequence: 10,
  },
  {
    id: `${FILEMAKER_EMAIL_PARSER_RULE_PREFIX}angle`,
    pattern: '<\\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})\\s*>',
    flags: 'gi',
    sequence: 20,
  },
  {
    id: `${FILEMAKER_EMAIL_PARSER_RULE_PREFIX}quoted`,
    pattern: '["\']([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})["\']',
    flags: 'gi',
    sequence: 30,
  },
  {
    id: `${FILEMAKER_EMAIL_PARSER_RULE_PREFIX}plain`,
    pattern: '(?:^|[^A-Z0-9._%+-])([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})(?=$|[^A-Z0-9._%+-])',
    flags: 'gi',
    sequence: 40,
  },
];

export const DEFAULT_FILEMAKER_PHONE_VALIDATION_RULES: FilemakerPhoneValidationRule[] = [
  {
    id: `${FILEMAKER_PHONE_VALIDATION_RULE_PREFIX}e164_plus`,
    pattern: '^\\+[1-9]\\d{6,14}$',
    sequence: 10,
  },
  {
    id: `${FILEMAKER_PHONE_VALIDATION_RULE_PREFIX}national_nonzero`,
    pattern: '^[1-9]\\d{6,14}$',
    sequence: 20,
  },
  {
    id: `${FILEMAKER_PHONE_VALIDATION_RULE_PREFIX}national_leading_zero`,
    pattern: '^0\\d{6,14}$',
    sequence: 30,
  },
];
