import {
  defaultPromptEngineSettings,
  type PromptExploderRuleSegmentType,
  type PromptEngineSettings,
  type PromptValidationRule,
} from '@/features/prompt-engine/settings';

const PROMPT_EXPLODER_SCOPE = ['prompt_exploder'] as const;

const createRegexRule = (rule: {
  id: string;
  title: string;
  description: string;
  pattern: string;
  flags?: string;
  message: string;
  sequence: number;
  sequenceGroupId: string;
  sequenceGroupLabel: string;
  promptExploderSegmentType?: PromptExploderRuleSegmentType;
  promptExploderPriority?: number;
  promptExploderConfidenceBoost?: number;
  promptExploderTreatAsHeading?: boolean;
}): PromptValidationRule => ({
  kind: 'regex',
  id: rule.id,
  enabled: true,
  severity: 'info',
  title: rule.title,
  description: rule.description,
  pattern: rule.pattern,
  flags: rule.flags ?? 'm',
  message: rule.message,
  similar: [],
  autofix: {
    enabled: false,
    operations: [],
  },
  sequenceGroupId: rule.sequenceGroupId,
  sequenceGroupLabel: rule.sequenceGroupLabel,
  sequenceGroupDebounceMs: 0,
  sequence: rule.sequence,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  appliesToScopes: [...PROMPT_EXPLODER_SCOPE],
  launchEnabled: false,
  launchAppliesToScopes: [...PROMPT_EXPLODER_SCOPE],
  launchScopeBehavior: 'gate',
  launchOperator: 'contains',
  launchValue: null,
  launchFlags: null,
  promptExploderSegmentType: rule.promptExploderSegmentType ?? null,
  promptExploderPriority: rule.promptExploderPriority ?? 0,
  promptExploderConfidenceBoost: rule.promptExploderConfidenceBoost ?? 0,
  promptExploderTreatAsHeading: rule.promptExploderTreatAsHeading ?? false,
});

export const PROMPT_EXPLODER_PATTERN_PACK: PromptValidationRule[] = [
  createRegexRule({
    id: 'segment.metadata.banner',
    title: 'Metadata Banner',
    description: 'Recognizes versioned metadata banners framed by ===.',
    pattern: '^\\s*={3,}.+={3,}\\s*$',
    flags: 'm',
    message: 'Metadata banner section detected.',
    sequence: 10,
    sequenceGroupId: 'exploder_metadata',
    sequenceGroupLabel: 'Exploder Metadata',
    promptExploderSegmentType: 'metadata',
    promptExploderPriority: 40,
    promptExploderConfidenceBoost: 0.2,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.metadata.pipe_header',
    title: 'Metadata Pipe Header',
    description: 'Detects first-line pipe-delimited product metadata.',
    pattern: '^\\s*[^|\\n]+(?:\\s*\\|\\s*[^|\\n]+){2,}\\s*$',
    flags: 'm',
    message: 'Pipe metadata header detected.',
    sequence: 15,
    sequenceGroupId: 'exploder_metadata',
    sequenceGroupLabel: 'Exploder Metadata',
    promptExploderSegmentType: 'metadata',
    promptExploderPriority: 30,
    promptExploderConfidenceBoost: 0.18,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.heading.block',
    title: 'Section Heading',
    description: 'Detects uppercase section headings.',
    pattern: '^\\s*[A-Z][A-Z0-9 _()\\-/:&+.,]{3,}\\s*$',
    flags: 'm',
    message: 'Section heading detected.',
    sequence: 20,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.heading.markdown',
    title: 'Markdown Heading',
    description: 'Detects markdown section headings (## ROLE, ### ProductRecord).',
    pattern: '^\\s*#{1,6}\\s+\\S+',
    flags: 'm',
    message: 'Markdown heading detected.',
    sequence: 22,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.heading.bracket',
    title: 'Bracket Heading',
    description: 'Detects bracketed module headings ([PURPOSE], [MODULES], [VALIDATION_MODULE]).',
    pattern: '^\\s*\\[[A-Z0-9 _()\\-/:&+.,]{2,}]\\s*$',
    flags: 'm',
    message: 'Bracket heading detected.',
    sequence: 24,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.heading.numeric_section',
    title: 'Numeric Section Heading',
    description:
      'Detects numbered section headings like "1. Preserve the Product Exactly".',
    pattern: '^\\s*\\d+\\.\\s+[A-Z][^\\n.:]{4,}$',
    flags: 'm',
    message: 'Numeric section heading detected.',
    sequence: 26,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 18,
    promptExploderConfidenceBoost: 0.1,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.params.block',
    title: 'Parameters Block',
    description: 'Detects params assignment block.',
    pattern: '\\bparams\\s*=\\s*\\{',
    flags: 'mi',
    message: 'Parameters block detected.',
    sequence: 30,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'parameter_block',
    promptExploderPriority: 35,
    promptExploderConfidenceBoost: 0.2,
  }),
  createRegexRule({
    id: 'segment.params.global_settings',
    title: 'Global Settings Block',
    description: 'Detects GLOBAL_SETTINGS blocks and key-value setting lists.',
    pattern: '(\\[GLOBAL_SETTINGS\\]|GLOBAL[_\\s]SETTINGS)\\b[\\s\\S]{0,220}(\\[[A-Z_]+\\]\\s*=\\s*`?|\\[DRY_RUN\\]\\s*=)',
    flags: 'mi',
    message: 'Global settings block detected.',
    sequence: 34,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'parameter_block',
    promptExploderPriority: 28,
    promptExploderConfidenceBoost: 0.16,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.list.numeric',
    title: 'Numeric List',
    description: 'Detects numeric lists with 1) or 1. prefixes.',
    pattern: '^\\s*\\d+[.)]\\s+',
    flags: 'm',
    message: 'Numeric list detected.',
    sequence: 40,
    sequenceGroupId: 'exploder_lists',
    sequenceGroupLabel: 'Exploder Lists',
    promptExploderSegmentType: 'list',
    promptExploderPriority: 4,
  }),
  createRegexRule({
    id: 'segment.list.bullet',
    title: 'Bullet List',
    description: 'Detects bullet lists with * or - markers.',
    pattern: '^\\s*[*-]\\s+',
    flags: 'm',
    message: 'Bullet list detected.',
    sequence: 50,
    sequenceGroupId: 'exploder_lists',
    sequenceGroupLabel: 'Exploder Lists',
    promptExploderSegmentType: 'list',
    promptExploderPriority: 4,
  }),
  createRegexRule({
    id: 'segment.list.alpha_sequence',
    title: 'Alpha Sequence',
    description: 'Detects A) B) C) sequence headers.',
    pattern: '^\\s*[A-Z]\\)\\s+.+$',
    flags: 'm',
    message: 'Alpha sequence section detected.',
    sequence: 60,
    sequenceGroupId: 'exploder_lists',
    sequenceGroupLabel: 'Exploder Lists',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 10,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.reference.code',
    title: 'Reference Code',
    description: 'Detects referential section codes like P0, RL2, QA_R1.',
    pattern: '^\\s*(P\\d+|RL\\d+|QA(?:_R)?\\d+)\\b',
    flags: 'i',
    message: 'Reference code section detected.',
    sequence: 70,
    sequenceGroupId: 'exploder_references',
    sequenceGroupLabel: 'Exploder References',
    promptExploderSegmentType: 'referential_list',
    promptExploderPriority: 8,
    promptExploderConfidenceBoost: 0.04,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.conditional.only_if',
    title: 'Conditional: only if',
    description: 'Detects conditional blocks using “only if”.',
    pattern: '\\bonly if\\b',
    flags: 'mi',
    message: 'Conditional (only if) detected.',
    sequence: 80,
    sequenceGroupId: 'exploder_conditionals',
    sequenceGroupLabel: 'Exploder Conditionals',
    promptExploderSegmentType: 'conditional_list',
    promptExploderPriority: 12,
    promptExploderConfidenceBoost: 0.08,
  }),
  createRegexRule({
    id: 'segment.conditional.fix_until',
    title: 'Conditional: fix until',
    description: 'Detects iterative pass/fail constraints.',
    pattern: '\\bfix\\s+until\\b',
    flags: 'mi',
    message: 'Fix-until conditional detected.',
    sequence: 90,
    sequenceGroupId: 'exploder_conditionals',
    sequenceGroupLabel: 'Exploder Conditionals',
    promptExploderSegmentType: 'conditional_list',
    promptExploderPriority: 12,
    promptExploderConfidenceBoost: 0.08,
  }),
  createRegexRule({
    id: 'segment.pipeline.step',
    title: 'Pipeline Steps',
    description: 'Detects pipeline steps by ordered numbers.',
    pattern: '^\\s*\\d+\\.\\s+',
    flags: 'm',
    message: 'Pipeline step detected.',
    sequence: 100,
    sequenceGroupId: 'exploder_pipeline',
    sequenceGroupLabel: 'Exploder Pipeline',
    promptExploderSegmentType: 'hierarchical_list',
    promptExploderPriority: 14,
    promptExploderConfidenceBoost: 0.08,
  }),
  createRegexRule({
    id: 'segment.comment.patch',
    title: 'Patch Comment',
    description: 'Detects in-prompt patch comments.',
    pattern: '^\\s*//\\s*PATCH\\b',
    flags: 'mi',
    message: 'Patch comment detected.',
    sequence: 110,
    sequenceGroupId: 'exploder_metadata',
    sequenceGroupLabel: 'Exploder Metadata',
    promptExploderSegmentType: 'metadata',
    promptExploderPriority: 6,
    promptExploderConfidenceBoost: 0.04,
  }),
  createRegexRule({
    id: 'segment.infer.list.non_negotiable',
    title: 'Infer List: Non-negotiable',
    description: 'Recognizes non-negotiable requirement list headings.',
    pattern: '^\\s*NON[-\\s]?NEGOTIABLE\\s+GOAL\\b',
    flags: 'mi',
    message: 'Likely non-negotiable list segment.',
    sequence: 120,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'list',
    promptExploderPriority: 20,
    promptExploderConfidenceBoost: 0.12,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.parameter_block.params_heading',
    title: 'Infer Parameter Block',
    description: 'Recognizes parameter heading variants tied to params object.',
    pattern: '^\\s*(PARAMS|PARAMETERS|CONFIG)\\b[\\s\\S]{0,220}\\bparams\\s*=\\s*\\{',
    flags: 'mi',
    message: 'Likely parameter block segment.',
    sequence: 130,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'parameter_block',
    promptExploderPriority: 24,
    promptExploderConfidenceBoost: 0.14,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.sequence.requirements',
    title: 'Infer Sequence: Requirements',
    description: 'Recognizes requirements-like sequence blocks.',
    pattern: '^\\s*(REQUIREMENTS|GUIDELINES|CONSTRAINTS|RULESET)\\b',
    flags: 'mi',
    message: 'Likely sequence segment.',
    sequence: 140,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 16,
    promptExploderConfidenceBoost: 0.1,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.hierarchical_list.pipeline',
    title: 'Infer Hierarchical List: Pipeline',
    description: 'Recognizes process and pipeline sections.',
    pattern: '^\\s*(PIPELINE|WORKFLOW|PROCESS)\\b',
    flags: 'mi',
    message: 'Likely hierarchical list segment.',
    sequence: 150,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'hierarchical_list',
    promptExploderPriority: 18,
    promptExploderConfidenceBoost: 0.12,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.qa_matrix.quality_checks',
    title: 'Infer QA Matrix',
    description: 'Recognizes QA and quality-gate matrix sections.',
    pattern: '^\\s*(FINAL\\s+QA|QUALITY\\s+GATE|QUALITY\\s+CHECKS?)\\b',
    flags: 'mi',
    message: 'Likely QA matrix segment.',
    sequence: 160,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'qa_matrix',
    promptExploderPriority: 22,
    promptExploderConfidenceBoost: 0.14,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.qa_matrix.pass_fail',
    title: 'Infer QA Matrix: PASS/FAIL',
    description: 'Recognizes explicit pass/fail evaluation blocks.',
    pattern: '\\bPASS\\b[\\s\\S]{0,160}\\bFAIL\\b',
    flags: 'mi',
    message: 'PASS/FAIL matrix markers detected.',
    sequence: 170,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'qa_matrix',
    promptExploderPriority: 20,
    promptExploderConfidenceBoost: 0.12,
  }),
  createRegexRule({
    id: 'segment.infer.conditional_list.if_then',
    title: 'Infer Conditional Segment',
    description: 'Recognizes if/then/unless conditional fragments.',
    pattern: '(\\bonly if\\b|\\bif\\b[\\s\\S]{0,120}\\bthen\\b|\\bunless\\b)',
    flags: 'mi',
    message: 'Conditional segment markers detected.',
    sequence: 180,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'conditional_list',
    promptExploderPriority: 12,
    promptExploderConfidenceBoost: 0.08,
  }),
  createRegexRule({
    id: 'segment.infer.referential_list.code_title',
    title: 'Infer Referential List',
    description: 'Recognizes code-prefixed referential headings.',
    pattern: '^\\s*(P\\d+|RL\\d+|QA(?:_R)?\\d+)\\s*[—:-]',
    flags: 'i',
    message: 'Likely referential list segment.',
    sequence: 190,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'referential_list',
    promptExploderPriority: 10,
    promptExploderConfidenceBoost: 0.06,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.sequence.alpha_sections',
    title: 'Infer Sequence: Alpha Sections',
    description: 'Recognizes A) B) C) subsection sequences.',
    pattern: '^\\s*[A-Z]\\)\\s+.+$',
    flags: 'm',
    message: 'Likely alpha-sequence segment.',
    sequence: 200,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 14,
    promptExploderConfidenceBoost: 0.1,
  }),
  createRegexRule({
    id: 'segment.infer.metadata.versioned_banner',
    title: 'Infer Metadata: Versioned Banner',
    description: 'Recognizes versioned metadata banners with framing marks.',
    pattern: '^\\s*(={3,}|-{3,}).*\\bver\\.?\\s*\\d+(\\.\\d+)*.*(={3,}|-{3,})\\s*$',
    flags: 'mi',
    message: 'Likely metadata banner segment.',
    sequence: 210,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'metadata',
    promptExploderPriority: 26,
    promptExploderConfidenceBoost: 0.16,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.sequence.modules',
    title: 'Infer Sequence: Modules',
    description: 'Recognizes module-based sequences and execution module headers.',
    pattern: '(\\[MODULES\\]|\\[[A-Z_]+_MODULE\\]|^\\s*\\d+\\.\\s*\\[[A-Z_]+\\])',
    flags: 'mi',
    message: 'Likely module sequence segment.',
    sequence: 220,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 20,
    promptExploderConfidenceBoost: 0.14,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.hierarchical_list.execution_template',
    title: 'Infer Hierarchical List: Execution Template',
    description: 'Recognizes execution templates and numbered run sequences.',
    pattern: '(\\[EXECUTION_TEMPLATE\\]|EXECUTION\\s+TEMPLATE)[\\s\\S]{0,240}\\b1\\.\\s+',
    flags: 'mi',
    message: 'Likely execution-template hierarchical segment.',
    sequence: 230,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'hierarchical_list',
    promptExploderPriority: 19,
    promptExploderConfidenceBoost: 0.12,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.qa_matrix.validation_module',
    title: 'Infer QA Matrix: Validation Module',
    description: 'Recognizes validation/checklist modules with pass/fail style outcomes.',
    pattern: '(\\[VALIDATION_MODULE\\]|VALIDATION\\s+MODULE|FINAL\\s+QA)[\\s\\S]{0,260}(PASS|FAIL|Sanity checks)',
    flags: 'mi',
    message: 'Likely validation QA segment.',
    sequence: 240,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'qa_matrix',
    promptExploderPriority: 21,
    promptExploderConfidenceBoost: 0.13,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.sequence.data_model',
    title: 'Infer Sequence: Data Model',
    description: 'Recognizes DATA MODEL and schema-style definition sections.',
    pattern: '(\\[DATA\\s*MODEL\\]|DATA\\s*MODEL)\\b|\\bProductRecord\\b|\\bMarketplaceListingRecord\\b|\\bZeroStockMappingRecord\\b',
    flags: 'mi',
    message: 'Likely data model sequence segment.',
    sequence: 250,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 17,
    promptExploderConfidenceBoost: 0.1,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.conditional_list.dry_run',
    title: 'Infer Conditional: DRY_RUN Flow',
    description: 'Recognizes DRY_RUN if/else behavior segments.',
    pattern: '(\\[DRY_RUN_BEHAVIOR\\]|DRY[_\\s]RUN)[\\s\\S]{0,260}(If\\s+\\[?DRY_RUN\\]?\\s*=\\s*true|If\\s+\\[?DRY_RUN\\]?\\s*=\\s*false)',
    flags: 'mi',
    message: 'Likely DRY_RUN conditional segment.',
    sequence: 260,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'conditional_list',
    promptExploderPriority: 18,
    promptExploderConfidenceBoost: 0.12,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.sequence.logging_audit',
    title: 'Infer Sequence: Logging and Audit',
    description: 'Recognizes logging and audit governance sections.',
    pattern: '(\\[LOGGING_AND_AUDIT\\]|LOGGING\\s+AND\\s+AUDIT)\\b',
    flags: 'mi',
    message: 'Likely logging/audit sequence segment.',
    sequence: 270,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 18,
    promptExploderConfidenceBoost: 0.1,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.sequence.error_handling',
    title: 'Infer Sequence: Error Handling',
    description: 'Recognizes error handling sections and retry policies.',
    pattern: '(\\[ERROR_HANDLING\\]|ERROR\\s+HANDLING)\\b[\\s\\S]{0,220}(retry|auth_error|network_error|ambiguous_match)',
    flags: 'mi',
    message: 'Likely error-handling sequence segment.',
    sequence: 280,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 19,
    promptExploderConfidenceBoost: 0.11,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.infer.sequence.security_notes',
    title: 'Infer Sequence: Security Notes',
    description: 'Recognizes security notes and credential-handling constraints.',
    pattern: '(\\[SECURITY_NOTES\\]|SECURITY\\s+NOTES)\\b[\\s\\S]{0,220}(credentials|token|cookie|mfa|secret)',
    flags: 'mi',
    message: 'Likely security-notes sequence segment.',
    sequence: 290,
    sequenceGroupId: 'exploder_infer',
    sequenceGroupLabel: 'Exploder Inference',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 19,
    promptExploderConfidenceBoost: 0.11,
    promptExploderTreatAsHeading: true,
  }),
];

export type PromptExploderPatternPackResult = {
  nextSettings: PromptEngineSettings;
  addedRuleIds: string[];
  updatedRuleIds: string[];
};

export const PROMPT_EXPLODER_PATTERN_PACK_IDS = new Set(
  PROMPT_EXPLODER_PATTERN_PACK.map((rule) => rule.id)
);

export function ensurePromptExploderPatternPack(
  settings: PromptEngineSettings
): PromptExploderPatternPackResult {
  const baseSettings = settings?.promptValidation
    ? settings
    : defaultPromptEngineSettings;

  const existingById = new Map(
    baseSettings.promptValidation.rules.map((rule) => [rule.id, rule])
  );

  const nextRules = [...baseSettings.promptValidation.rules];
  const addedRuleIds: string[] = [];
  const updatedRuleIds: string[] = [];

  PROMPT_EXPLODER_PATTERN_PACK.forEach((packRule) => {
    const existing = existingById.get(packRule.id);
    if (!existing) {
      nextRules.push(packRule);
      addedRuleIds.push(packRule.id);
      return;
    }

    const existingScopes = existing.appliesToScopes ?? [];
    const missingPromptExploderScope = !existingScopes.includes('prompt_exploder');
    const existingLaunchScopes = existing.launchAppliesToScopes ?? [];
    const missingPromptExploderLaunchScope =
      !existingLaunchScopes.includes('prompt_exploder');
    const merged: PromptValidationRule = {
      ...existing,
      appliesToScopes: missingPromptExploderScope
        ? [...new Set([...existingScopes, 'prompt_exploder'])]
        : existing.appliesToScopes,
      launchAppliesToScopes: missingPromptExploderLaunchScope
        ? [...new Set([...existingLaunchScopes, 'prompt_exploder'])]
        : existing.launchAppliesToScopes,
      promptExploderSegmentType:
        existing.promptExploderSegmentType ??
        packRule.promptExploderSegmentType ??
        null,
      promptExploderPriority:
        existing.promptExploderPriority && existing.promptExploderPriority !== 0
          ? existing.promptExploderPriority
          : (packRule.promptExploderPriority ?? 0),
      promptExploderConfidenceBoost:
        existing.promptExploderConfidenceBoost &&
          existing.promptExploderConfidenceBoost !== 0
          ? existing.promptExploderConfidenceBoost
          : (packRule.promptExploderConfidenceBoost ?? 0),
      promptExploderTreatAsHeading:
        existing.promptExploderTreatAsHeading ??
        (packRule.promptExploderTreatAsHeading ?? false),
    };

    const changed =
      missingPromptExploderScope ||
      missingPromptExploderLaunchScope ||
      merged.promptExploderSegmentType !== existing.promptExploderSegmentType ||
      merged.promptExploderPriority !== existing.promptExploderPriority ||
      merged.promptExploderConfidenceBoost !==
      existing.promptExploderConfidenceBoost ||
      merged.promptExploderTreatAsHeading !==
      existing.promptExploderTreatAsHeading;

    if (changed) {
      const index = nextRules.findIndex((rule) => rule.id === existing.id);
      if (index >= 0) nextRules[index] = merged;
      updatedRuleIds.push(existing.id);
    }
  });

  return {
    nextSettings: {
      ...baseSettings,
      promptValidation: {
        ...baseSettings.promptValidation,
        rules: nextRules,
      },
    },
    addedRuleIds,
    updatedRuleIds,
  };
}

export function getPromptExploderScopedRules(
  settings: PromptEngineSettings
): PromptValidationRule[] {
  const mergedRules = [
    ...settings.promptValidation.rules,
    ...(settings.promptValidation.learnedRules ?? []),
  ];
  return mergedRules.filter((rule) => {
    const scopes = rule.appliesToScopes ?? [];
    return scopes.includes('prompt_exploder') || scopes.includes('global');
  });
}
