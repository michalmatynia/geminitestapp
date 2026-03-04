import { z } from 'zod';
import {
  type PromptExploderSegmentType,
  promptExploderSegmentTypeSchema,
} from './base';

/**
 * Prompt Exploder Pattern & Template DTOs
 */

export const promptExploderPatternRuleMapSchema = z.record(z.string(), z.array(z.string()));
export type PromptExploderPatternRuleMap = z.infer<typeof promptExploderPatternRuleMapSchema>;

export const PROMPT_EXPLODER_PARSER_TUNING_RULE_IDS = [
  'segment.boundary.hr_line',
  'segment.boundary.final_qa',
  'segment.not_heading.rule_line',
  'segment.subsection.alpha_heading',
  'segment.subsection.reference_named',
  'segment.subsection.reference_plain',
  'segment.subsection.qa_code',
  'segment.subsection.numeric_bracket_heading',
  'segment.subsection.bracket_heading',
  'segment.subsection.markdown_heading',
  'segment.boundary.requirements',
  'segment.boundary.studio_relighting',
  'segment.boundary.pipeline',
] as const;

export type PromptExploderParserTuningRuleId =
  (typeof PROMPT_EXPLODER_PARSER_TUNING_RULE_IDS)[number];

export type PromptExploderParserTuningRuleDraft = {
  id: PromptExploderParserTuningRuleId;
  label: string;
  title: string;
  description: string | null;
  pattern: string;
  flags: string;
  enabled: boolean;
  promptExploderSegmentType: PromptExploderSegmentType | null;
  promptExploderPriority: number;
  promptExploderConfidenceBoost: number;
  promptExploderTreatAsHeading: boolean;
};
