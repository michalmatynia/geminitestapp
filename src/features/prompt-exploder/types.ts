import type { PromptValidationRule } from '@/features/prompt-engine/settings';

export type PromptExploderSegmentType =
  | 'metadata'
  | 'assigned_text'
  | 'list'
  | 'parameter_block'
  | 'referential_list'
  | 'sequence'
  | 'hierarchical_list'
  | 'conditional_list'
  | 'qa_matrix';

export type PromptExploderListItem = {
  id: string;
  text: string;
  children: PromptExploderListItem[];
};

export type PromptExploderSubsection = {
  id: string;
  title: string;
  code: string | null;
  items: PromptExploderListItem[];
  condition: string | null;
};

export type PromptExploderBindingType = 'references' | 'depends_on' | 'uses_param';
export type PromptExploderBindingOrigin = 'auto' | 'manual';

export type PromptExploderBinding = {
  id: string;
  type: PromptExploderBindingType;
  fromSegmentId: string;
  toSegmentId: string;
  fromSubsectionId?: string | null;
  toSubsectionId?: string | null;
  sourceLabel: string;
  targetLabel: string;
  origin: PromptExploderBindingOrigin;
};

export type PromptExploderSegment = {
  id: string;
  type: PromptExploderSegmentType;
  title: string;
  includeInOutput: boolean;
  text: string;
  raw: string;
  code: string | null;
  condition: string | null;
  listItems: PromptExploderListItem[];
  subsections: PromptExploderSubsection[];
  paramsText: string;
  paramsObject: Record<string, unknown> | null;
  matchedPatternIds: string[];
  confidence: number;
};

export type PromptExploderDocument = {
  version: 1;
  sourcePrompt: string;
  segments: PromptExploderSegment[];
  bindings: PromptExploderBinding[];
  warnings: string[];
  reassembledPrompt: string;
};

export type PromptExploderPatternRuleMap = {
  allRules: PromptValidationRule[];
  scopedRules: PromptValidationRule[];
};
