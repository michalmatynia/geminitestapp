import { describe, expect, it } from 'vitest';

import type { PromptValidationRule } from '@/features/prompt-engine/settings';
import { PROMPT_EXPLODER_PATTERN_PACK } from '@/features/prompt-exploder/pattern-pack';

const ADDRESSER_NAME_RULE_IDS = [
  'segment.case_resolver.extract.addresser.first_name',
  'segment.case_resolver.extract.addresser.middle_name',
  'segment.case_resolver.extract.addresser.last_name',
] as const;

type RegexRule = Extract<PromptValidationRule, { kind: 'regex' }>;

const getRegexRule = (id: string): RegexRule => {
  const rule = PROMPT_EXPLODER_PATTERN_PACK.find((candidate) => candidate.id === id);
  if (rule?.kind !== 'regex') {
    throw new Error(`Expected regex rule for "${id}".`);
  }
  return rule;
};

describe('case resolver addresser person-name capture rules', () => {
  it('matches valid capitalized person names', () => {
    ADDRESSER_NAME_RULE_IDS.forEach((id) => {
      const rule = getRegexRule(id);
      const regex = new RegExp(rule.pattern, rule.flags ?? 'm');
      expect(regex.test('Michał Matynia')).toBe(true);
      expect(regex.test('Jan Adam Kowalski')).toBe(true);
      expect(regex.test('Anna Maria Helena Nowak')).toBe(true);
    });
  });

  it('rejects body/legal/organization lines to reduce false positives', () => {
    ADDRESSER_NAME_RULE_IDS.forEach((id) => {
      const rule = getRegexRule(id);
      const regex = new RegExp(rule.pattern, rule.flags ?? 'm');
      expect(regex.test('z poważaniem')).toBe(false);
      expect(regex.test('Niniejszym Wnoszę')).toBe(false);
      expect(regex.test('Na Podstawie')).toBe(false);
      expect(regex.test('Inspektorat ZUS w Gryficach')).toBe(false);
      expect(regex.test('Dotyczy Postępowania Administracyjnego')).toBe(false);
      expect(regex.test('Michał 2026 Matynia')).toBe(false);
    });
  });
});
