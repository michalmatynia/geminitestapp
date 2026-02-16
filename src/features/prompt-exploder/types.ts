import type { PromptValidationRule } from '@/features/prompt-engine/settings';

import type { PromptExploderValidationRuleStack } from './validation-stack';

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
  logicalOperator?: PromptExploderLogicalOperator | null;
  logicalConditions?: PromptExploderLogicalCondition[];
  referencedParamPath?: string | null;
  referencedComparator?: PromptExploderLogicalComparator | null;
  referencedValue?: unknown;
  children: PromptExploderListItem[];
};

export type PromptExploderLogicalOperator =
  | 'if'
  | 'only_if'
  | 'unless'
  | 'when';

export type PromptExploderLogicalComparator =
  | 'truthy'
  | 'falsy'
  | 'equals'
  | 'not_equals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains';

export type PromptExploderLogicalJoin = 'and' | 'or';

export type PromptExploderLogicalCondition = {
  id: string;
  paramPath: string;
  comparator: PromptExploderLogicalComparator;
  value: unknown;
  joinWithPrevious?: PromptExploderLogicalJoin | null;
};

export type PromptExploderSubsection = {
  id: string;
  title: string;
  code: string | null;
  items: PromptExploderListItem[];
  condition: string | null;
  guidance?: string | null;
};

export type PromptExploderBindingType = 'references' | 'depends_on' | 'uses_param';
export type PromptExploderBindingOrigin = 'auto' | 'manual';

export type PromptExploderParamUiControl =
  | 'auto'
  | 'checkbox'
  | 'buttons'
  | 'select'
  | 'slider'
  | 'number'
  | 'text'
  | 'textarea'
  | 'json'
  | 'rgb'
  | 'tuple2';

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
  paramUiControls?: Record<string, PromptExploderParamUiControl>;
  paramComments?: Record<string, string>;
  paramDescriptions?: Record<string, string>;
  matchedPatternIds: string[];
  matchedPatternLabels?: string[];
  matchedSequenceLabels?: string[];
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

export type PromptExploderLearnedTemplate = {
  id: string;
  segmentType: PromptExploderSegmentType;
  state: 'draft' | 'candidate' | 'active' | 'disabled';
  title: string;
  normalizedTitle: string;
  anchorTokens: string[];
  sampleText: string;
  approvals: number;
  createdAt: string;
  updatedAt: string;
};

export type PromptExploderPatternSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  ruleCount: number;
  rulesJson: string;
};

export type PromptExploderBenchmarkSuite = 'default' | 'extended' | 'custom';

export type PromptExploderBenchmarkCaseConfig = {
  id: string;
  prompt: string;
  expectedTypes: PromptExploderSegmentType[];
  minSegments: number;
};

export type PromptExploderOperationMode =
  | 'rules_only'
  | 'hybrid'
  | 'ai_assisted';

export type PromptExploderAiProvider =
  | 'auto'
  | 'ollama'
  | 'openai'
  | 'anthropic'
  | 'gemini';

export type PromptExploderSettings = {
  version: 1;
  runtime: {
    ruleProfile: 'all' | 'pattern_pack' | 'learned_only';
    validationRuleStack: PromptExploderValidationRuleStack;
    benchmarkSuite: PromptExploderBenchmarkSuite;
    benchmarkLowConfidenceThreshold: number;
    benchmarkSuggestionLimit: number;
    customBenchmarkCases: PromptExploderBenchmarkCaseConfig[];
  };
  learning: {
    enabled: boolean;
    similarityThreshold: number;
    templateMergeThreshold: number;
    benchmarkSuggestionUpsertTemplates: boolean;
    minApprovalsForMatching: number;
    maxTemplates: number;
    autoActivateLearnedTemplates: boolean;
    templates: PromptExploderLearnedTemplate[];
  };
  ai: {
    operationMode: PromptExploderOperationMode;
    provider: PromptExploderAiProvider;
    modelId: string;
    fallbackModelId: string;
    temperature: number;
    maxTokens: number;
  };
  patternSnapshots: PromptExploderPatternSnapshot[];
};
