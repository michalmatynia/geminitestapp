import {
  type PromptExploderCaptureApplyTo,
  type PromptExploderCaptureNormalize,
  type PromptExploderRuleSegmentType,
  type PromptValidationRule,
  type PromptValidationScope,
} from '@/features/prompt-engine/settings';

import { PROMPT_EXPLODER_PATTERN_PACK_EXTRA } from './pattern-pack-rules-extra';

import type { PromptExploderRuntimeValidationScope } from './validation-stack';

const PROMPT_EXPLODER_SCOPE = ['prompt_exploder'] as const;
const CASE_RESOLVER_PROMPT_EXPLODER_SCOPE = ['case_resolver_prompt_exploder'] as const;

const isCaseResolverExploderScope = (scope: string | null | undefined): boolean =>
  scope === 'case_resolver_prompt_exploder';

const normalizeRuleScopes = (
  scopes: readonly PromptValidationScope[] | null | undefined,
  fallbackScope: PromptExploderRuntimeValidationScope | 'case_resolver_prompt_exploder'
): PromptValidationScope[] => {
  if (Array.isArray(scopes) && scopes.length > 0) {
    return [...new Set(scopes)] as PromptValidationScope[];
  }
  const activeRuleScope = isCaseResolverExploderScope(fallbackScope)
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';
  return [activeRuleScope as PromptValidationScope];
};

export const includesScope = (
  scopes: readonly PromptValidationScope[] | null | undefined,
  scope: PromptExploderRuntimeValidationScope | 'case_resolver_prompt_exploder'
): boolean => {
  if (!Array.isArray(scopes) || scopes.length === 0) return true;
  const activeRuleScope = isCaseResolverExploderScope(scope)
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';
  return scopes.includes(activeRuleScope as PromptValidationScope) || scopes.includes('global');
};

export const remapExploderScopesForTarget = (
  scopes: readonly PromptValidationScope[] | null | undefined,
  targetScope: PromptExploderRuntimeValidationScope | 'case_resolver_prompt_exploder'
): PromptValidationScope[] => {
  const normalizedScopes = normalizeRuleScopes(scopes, targetScope);
  if (includesScope(normalizedScopes, targetScope)) {
    return normalizedScopes;
  }

  const activeRuleScope = isCaseResolverExploderScope(targetScope)
    ? 'case_resolver_prompt_exploder'
    : 'prompt_exploder';

  const remapped = normalizedScopes.map((scope) => {
    if (scope === 'prompt_exploder' || scope === 'case_resolver_prompt_exploder') {
      return activeRuleScope as PromptValidationScope;
    }
    return scope;
  });

  const deduped = [...new Set(remapped)];
  if (!deduped.includes(activeRuleScope as PromptValidationScope) && !deduped.includes('global')) {
    deduped.push(activeRuleScope as PromptValidationScope);
  }
  return deduped;
};

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
  promptExploderCaptureTarget?: string | null;
  promptExploderCaptureGroup?: number | null;
  promptExploderCaptureApplyTo?: PromptExploderCaptureApplyTo;
  promptExploderCaptureNormalize?: PromptExploderCaptureNormalize;
  promptExploderCaptureOverwrite?: boolean;
  appliesToScopes?: PromptValidationScope[];
  launchAppliesToScopes?: PromptValidationScope[];
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
  appliesToScopes: rule.appliesToScopes ?? [...PROMPT_EXPLODER_SCOPE],
  launchEnabled: false,
  launchAppliesToScopes: rule.launchAppliesToScopes ?? rule.appliesToScopes ?? [...PROMPT_EXPLODER_SCOPE],
  launchScopeBehavior: 'gate',
  launchOperator: 'contains',
  launchValue: null,
  launchFlags: null,
  promptExploderSegmentType: rule.promptExploderSegmentType ?? null,
  promptExploderPriority: rule.promptExploderPriority ?? 0,
  promptExploderConfidenceBoost: rule.promptExploderConfidenceBoost ?? 0,
  promptExploderTreatAsHeading: rule.promptExploderTreatAsHeading ?? false,
  promptExploderCaptureTarget: rule.promptExploderCaptureTarget ?? null,
  promptExploderCaptureGroup:
    typeof rule.promptExploderCaptureGroup === 'number' &&
    Number.isFinite(rule.promptExploderCaptureGroup)
      ? Math.max(0, Math.floor(rule.promptExploderCaptureGroup))
      : null,
  promptExploderCaptureApplyTo: rule.promptExploderCaptureApplyTo ?? 'segment',
  promptExploderCaptureNormalize: rule.promptExploderCaptureNormalize ?? 'trim',
  promptExploderCaptureOverwrite: rule.promptExploderCaptureOverwrite ?? false,
});

const CASE_RESOLVER_BODY_SENTENCE_NEGATIVE_LOOKAHEAD =
  'niniejszym|dotyczy|uzasadnienie|wnosz[ęe]|na\\s+podstawie|post[ęe]powani\\p{L}*';
const CASE_RESOLVER_ORGANIZATION_KEYWORD_PATTERN =
  'komisariat|komenda|policj\\p{L}*|prokuratur\\p{L}*|rzecznik|inspektorat|urz\\p{L}*|s[ąa]d\\p{L}*|minister\\p{L}*|zak[łl]ad\\p{L}*|oddzia\\p{L}*|fundacj\\p{L}*|stowarzysz\\p{L}*|sp\\.?\\s*z\\s*o\\.?\\s*o\\.?|s\\.?a\\.?|llc|ltd|inc|corp|office|depart\\p{L}*|agency|authority|institut\\p{L}*|universit\\p{L}*|bank|court|police|bureau|commission|ministry';
const CASE_RESOLVER_PERSON_HEADING_STOPWORDS_PATTERN =
  'z|ze|na|w|we|do|od|dotyczy|wniosek|uzasadnienie|niniejszym|sincerely|regards|organ|inspektorat|komisariat|komenda|policj\\p{L}*|prokuratur\\p{L}*|rzecznik|urz\\p{L}*|s[ąa]d\\p{L}*|minister\\p{L}*|zak[łl]ad\\p{L}*|oddzia\\p{L}*|fundacj\\p{L}*|stowarzysz\\p{L}*|bank|court|police|bureau|ministry|office|agency|authority';
const CASE_RESOLVER_PERSON_NAME_LINE_PATTERN =
  `^\\s*(?!(?:${CASE_RESOLVER_PERSON_HEADING_STOPWORDS_PATTERN})\\b)([\\p{Lu}][\\p{L}\'’.-]{1,40}(?:\\s+[\\p{Lu}][\\p{L}\'’.-]{1,40}){1,3})\\s*$`;
const CASE_RESOLVER_PERSON_NAME_CAPTURE_PATTERN =
  `^\\s*(?!(?:${CASE_RESOLVER_PERSON_HEADING_STOPWORDS_PATTERN})\\b)([\\p{Lu}][\\p{L}\'’.-]+)(?:\\s+([\\p{Lu}][\\p{L}\'’.-]+(?:\\s+[\\p{Lu}][\\p{L}\'’.-]+){0,2}))?\\s+([\\p{Lu}][\\p{L}\'’.-]+)\\s*$`;
const CASE_RESOLVER_ORGANIZATION_LINE_PATTERN =
  `^\\s*(?!.*\\b(?:${CASE_RESOLVER_BODY_SENTENCE_NEGATIVE_LOOKAHEAD})\\b)(?=.*\\b(?:${CASE_RESOLVER_ORGANIZATION_KEYWORD_PATTERN})\\b)[\\p{L}0-9][\\p{L}0-9&.,'’"\\-\\p{Pd}\\/()\\s]{2,120}\\s*$`;
const CASE_RESOLVER_ORGANIZATION_LINE_CAPTURE_PATTERN =
  `^\\s*((?!.*\\b(?:${CASE_RESOLVER_BODY_SENTENCE_NEGATIVE_LOOKAHEAD})\\b)(?=.*\\b(?:${CASE_RESOLVER_ORGANIZATION_KEYWORD_PATTERN})\\b)[\\p{L}0-9][\\p{L}0-9&.,'’"\\-\\p{Pd}\\/()\\s]{2,120})\\s*$`;

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
    id: 'segment.not_heading.rule_line',
    title: 'Not Heading: Rule Continuation',
    description:
      'Prevents indented/list continuation lines that begin with "Rule:" from being interpreted as headings.',
    pattern: '^\\s*Rule\\s*:\\s+.+$',
    flags: 'mi',
    message: 'Rule continuation line detected (not a heading).',
    sequence: 26,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderPriority: 35,
    promptExploderConfidenceBoost: 0.05,
    promptExploderTreatAsHeading: false,
  }),
  createRegexRule({
    id: 'segment.subsection.alpha_heading',
    title: 'Subsection: Alpha Heading',
    description: 'Detects A) / B) style subsection headings inside sequence segments.',
    pattern: '^\\s*([A-Z])\\)\\s+(.+)$',
    flags: 'm',
    message: 'Alpha subsection heading detected.',
    sequence: 27,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 16,
    promptExploderConfidenceBoost: 0.1,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.subsection.reference_named',
    title: 'Subsection: Named Reference Header',
    description:
      'Detects RL/P/QA subsection headers with named bracket labels (e.g. RL0 (Mandatory): ...).',
    pattern: '^\\s*(RL\\d+|P\\d+|QA(?:_R)?\\d+)\\s+\\(([^)]+)\\)\\s*:\\s*(.*)$',
    flags: 'mi',
    message: 'Named reference subsection heading detected.',
    sequence: 31,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 20,
    promptExploderConfidenceBoost: 0.12,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.subsection.reference_plain',
    title: 'Subsection: Plain Reference Header',
    description:
      'Detects RL/P/QA subsection headers without bracket labels.',
    pattern: '^\\s*(RL\\d+|P\\d+|QA(?:_R)?\\d+)\\b\\s*[—:-]?\\s*(.*)$',
    flags: 'mi',
    message: 'Plain reference subsection heading detected.',
    sequence: 32,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'referential_list',
    promptExploderPriority: 18,
    promptExploderConfidenceBoost: 0.1,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.subsection.qa_code',
    title: 'Subsection: QA Code Header',
    description:
      'Detects QA/QA_R subsection rows for QA matrix parsing.',
    pattern: '^\\s*(QA(?:_R)?\\d+)\\b\\s*[—:-]?\\s*(.*)$',
    flags: 'mi',
    message: 'QA subsection heading detected.',
    sequence: 33,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'qa_matrix',
    promptExploderPriority: 19,
    promptExploderConfidenceBoost: 0.11,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.boundary.requirements',
    title: 'Boundary: Requirements',
    description:
      'Defines section headings treated as requirements sequences (default: REQUIREMENTS / COMPOSITING REQUIREMENTS).',
    pattern: '^\\s*(REQUIREMENTS|COMPOSITING\\s+REQUIREMENTS)\\b',
    flags: 'mi',
    message: 'Requirements boundary heading detected.',
    sequence: 28,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 24,
    promptExploderConfidenceBoost: 0.14,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.boundary.studio_relighting',
    title: 'Boundary: Studio Relighting',
    description:
      'Defines headings that start the studio relighting extension section.',
    pattern: '^(\\s*===\\s*STUDIO\\s+RELIGHTING|\\s*STUDIO\\s+RELIGHTING\\b)',
    flags: 'mi',
    message: 'Studio relighting boundary heading detected.',
    sequence: 29,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'sequence',
    promptExploderPriority: 24,
    promptExploderConfidenceBoost: 0.14,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.boundary.pipeline',
    title: 'Boundary: Pipeline',
    description:
      'Defines headings that should be parsed as hierarchical process lists.',
    pattern: '^\\s*(PIPELINE|WORKFLOW|PROCESS|EXECUTION\\s+TEMPLATE)\\b',
    flags: 'mi',
    message: 'Pipeline boundary heading detected.',
    sequence: 30,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'hierarchical_list',
    promptExploderPriority: 25,
    promptExploderConfidenceBoost: 0.14,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.boundary.final_qa',
    title: 'Boundary: Final QA',
    description:
      'Defines headings that should open QA matrix parsing.',
    pattern: '^\\s*FINAL\\s+QA\\b',
    flags: 'mi',
    message: 'Final QA boundary heading detected.',
    sequence: 34,
    sequenceGroupId: 'exploder_structure',
    sequenceGroupLabel: 'Exploder Structure',
    promptExploderSegmentType: 'qa_matrix',
    promptExploderPriority: 25,
    promptExploderConfidenceBoost: 0.14,
    promptExploderTreatAsHeading: true,
  }),
  createRegexRule({
    id: 'segment.case_resolver.heading.place_date',
    title: 'Case Resolver Heading: Place + Date',
    description:
      'Detects a location-and-date heading line used in legal letters (for example: "Szczecin 25.01.2026").',
    pattern:
      '^\\s*[\\p{L}][\\p{L}\\s\\-.\'’]{1,60}?(?:,)?(?:\\s+dnia)?\\s+(?:\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}|\\[(?:\\d{1,2}|DD)[./-](?:\\d{1,2}|MM)[./-](?:\\d{2,4}|YYYY|RRRR)\\])(?:\\s*r\\.?\\s*)?$',
    flags: 'imu',
    message: 'Place and date heading detected.',
    sequence: 35,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 42,
    promptExploderConfidenceBoost: 0.2,
    promptExploderTreatAsHeading: true,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.heading.addresser_person',
    title: 'Case Resolver Heading: Addresser Person',
    description:
      'Detects sender person-name heading lines to split addresser blocks into a dedicated segment.',
    pattern: CASE_RESOLVER_PERSON_NAME_LINE_PATTERN,
    flags: 'imu',
    message: 'Addresser person heading detected.',
    sequence: 36,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 43,
    promptExploderConfidenceBoost: 0.2,
    promptExploderTreatAsHeading: true,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.heading.addressee_organization',
    title: 'Case Resolver Heading: Addressee Organization',
    description:
      'Detects organization addressee heading lines in correspondence blocks.',
    pattern: CASE_RESOLVER_ORGANIZATION_LINE_PATTERN,
    flags: 'imu',
    message: 'Addressee organization heading detected.',
    sequence: 36,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 45,
    promptExploderConfidenceBoost: 0.22,
    promptExploderTreatAsHeading: true,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.not_heading.case_resolver.body_sentence',
    title: 'Not Heading: Case Resolver Body Sentence',
    description:
      'Prevents body/request sentence starters from being misclassified as heading boundaries.',
    pattern:
      '^\\s*(w\\s+związku\\s+z\\b|w\\s+zwiazku\\s+z\\b|biorąc\\s+pod\\s+uwagę\\b|biorac\\s+pod\\s+uwage\\b|ponadto\\b|jednocześnie\\b|jednoczesnie\\b).*$',
    flags: 'imu',
    message: 'Case Resolver body sentence detected (not a heading).',
    sequence: 37,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 48,
    promptExploderConfidenceBoost: 0.05,
    promptExploderTreatAsHeading: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.heading.subject_or_section',
    title: 'Case Resolver Heading: Subject/Section',
    description:
      'Detects common subject and section headings in legal document bodies.',
    pattern:
      '^\\s*(wniosek\\b|rezygnacja\\b|dotyczy\\b|uzasadnienie\\b|na\\s+zakończenie\\b|z\\s+poważaniem\\b|subject\\b|re:\\b|sincerely\\b|regards\\b).*$',
    flags: 'imu',
    message: 'Case Resolver subject/section heading detected.',
    sequence: 38,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 34,
    promptExploderConfidenceBoost: 0.12,
    promptExploderTreatAsHeading: true,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.heading.dotyczy',
    title: 'Case Resolver Heading: Dotyczy Subheading',
    description:
      'Detects Dotyczy subheadings so they can be isolated as standalone segments.',
    pattern:
      '^\\s*dotyczy\\b.*$',
    flags: 'imu',
    message: 'Case Resolver Dotyczy subheading detected.',
    sequence: 38,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 40,
    promptExploderConfidenceBoost: 0.14,
    promptExploderTreatAsHeading: true,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.heading.body_statement',
    title: 'Case Resolver Heading: Body Statement Start',
    description:
      'Detects the opening body statement line (for example: "Niniejszym...") to keep subject/subheading lines separated as standalone segments.',
    pattern:
      '^\\s*(niniejszym\\b|działając\\b|dzialajac\\b|wnoszę\\b|wnosze\\b|zwracam\\s+się\\b|zwracam\\s+sie\\b|na\\s+podstawie\\s+art\\.?)',
    flags: 'imu',
    message: 'Case Resolver body statement start detected.',
    sequence: 39,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 33,
    promptExploderConfidenceBoost: 0.1,
    promptExploderTreatAsHeading: true,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.heading.closing_statement',
    title: 'Case Resolver Heading: Closing Statement',
    description:
      'Detects closing/request headings such as "Na zakończenie..." or "Z poważaniem," so they can keep empty titles.',
    pattern:
      '^\\s*(na\\s+zakończenie\\b|na\\s+zakonczenie\\b|z\\s+poważaniem\\b|z\\s+powazaniem\\b|z\\s+wyrazami\\s+szacunku\\b|pozdrawiam\\b).*$',
    flags: 'imu',
    message: 'Case Resolver closing statement heading detected.',
    sequence: 40,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 39,
    promptExploderConfidenceBoost: 0.12,
    promptExploderTreatAsHeading: true,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.place_date.city',
    title: 'Case Resolver Extract: Place Date City',
    description:
      'Extracts city/place from a place+date line (for example: "Szczecin 25.01.2026").',
    pattern:
      '^\\s*([\\p{L}][\\p{L}\\s\\-.\'’]{1,60}?)(?:,)?\\s+(\\d{1,2})[./-](\\d{1,2})[./-](\\d{2,4})(?:\\s*r\\.?\\s*)?$',
    flags: 'imu',
    message: 'Case Resolver place/date city captured.',
    sequence: 38,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 40,
    promptExploderConfidenceBoost: 0.18,
    promptExploderCaptureTarget: 'case_resolver.place_date.city',
    promptExploderCaptureGroup: 1,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.place_date.day',
    title: 'Case Resolver Extract: Place Date Day',
    description:
      'Extracts day value from a place+date line.',
    pattern:
      '^\\s*([\\p{L}][\\p{L}\\s\\-.\'’]{1,60}?)(?:,)?\\s+(\\d{1,2})[./-](\\d{1,2})[./-](\\d{2,4})(?:\\s*r\\.?\\s*)?$',
    flags: 'imu',
    message: 'Case Resolver place/date day captured.',
    sequence: 39,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 40,
    promptExploderConfidenceBoost: 0.18,
    promptExploderCaptureTarget: 'case_resolver.place_date.day',
    promptExploderCaptureGroup: 2,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'day',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.place_date.month',
    title: 'Case Resolver Extract: Place Date Month',
    description:
      'Extracts month value from a place+date line.',
    pattern:
      '^\\s*([\\p{L}][\\p{L}\\s\\-.\'’]{1,60}?)(?:,)?\\s+(\\d{1,2})[./-](\\d{1,2})[./-](\\d{2,4})(?:\\s*r\\.?\\s*)?$',
    flags: 'imu',
    message: 'Case Resolver place/date month captured.',
    sequence: 40,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 40,
    promptExploderConfidenceBoost: 0.18,
    promptExploderCaptureTarget: 'case_resolver.place_date.month',
    promptExploderCaptureGroup: 3,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'month',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.place_date.year',
    title: 'Case Resolver Extract: Place Date Year',
    description:
      'Extracts year value from a place+date line.',
    pattern:
      '^\\s*([\\p{L}][\\p{L}\\s\\-.\'’]{1,60}?)(?:,)?\\s+(\\d{1,2})[./-](\\d{1,2})[./-](\\d{2,4})(?:\\s*r\\.?\\s*)?$',
    flags: 'imu',
    message: 'Case Resolver place/date year captured.',
    sequence: 41,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 40,
    promptExploderConfidenceBoost: 0.18,
    promptExploderCaptureTarget: 'case_resolver.place_date.year',
    promptExploderCaptureGroup: 4,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'year',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.addresser.first_name',
    title: 'Case Resolver Extract: Addresser First Name',
    description:
      'Extracts addresser first name from a capitalized person name line.',
    pattern: CASE_RESOLVER_PERSON_NAME_CAPTURE_PATTERN,
    flags: 'imu',
    message: 'Case Resolver addresser first name captured.',
    sequence: 42,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 26,
    promptExploderConfidenceBoost: 0.12,
    promptExploderCaptureTarget: 'case_resolver.addresser.firstName',
    promptExploderCaptureGroup: 1,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.addresser.middle_name',
    title: 'Case Resolver Extract: Addresser Middle Name',
    description:
      'Extracts addresser middle name from a capitalized person name line when present.',
    pattern: CASE_RESOLVER_PERSON_NAME_CAPTURE_PATTERN,
    flags: 'imu',
    message: 'Case Resolver addresser middle name captured.',
    sequence: 43,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 26,
    promptExploderConfidenceBoost: 0.12,
    promptExploderCaptureTarget: 'case_resolver.addresser.middleName',
    promptExploderCaptureGroup: 2,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.addresser.last_name',
    title: 'Case Resolver Extract: Addresser Last Name',
    description:
      'Extracts addresser last name from a capitalized person name line.',
    pattern: CASE_RESOLVER_PERSON_NAME_CAPTURE_PATTERN,
    flags: 'imu',
    message: 'Case Resolver addresser last name captured.',
    sequence: 44,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 26,
    promptExploderConfidenceBoost: 0.12,
    promptExploderCaptureTarget: 'case_resolver.addresser.lastName',
    promptExploderCaptureGroup: 3,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.addresser.organization_name',
    title: 'Case Resolver Extract: Addresser Organization Name',
    description:
      'Extracts addresser organization/company name when sender is an institution.',
    pattern: CASE_RESOLVER_ORGANIZATION_LINE_CAPTURE_PATTERN,
    flags: 'imu',
    message: 'Case Resolver addresser organization captured.',
    sequence: 45,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 24,
    promptExploderConfidenceBoost: 0.1,
    promptExploderCaptureTarget: 'case_resolver.addresser.organizationName',
    promptExploderCaptureGroup: 1,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.address.street',
    title: 'Case Resolver Extract: Address Street',
    description:
      'Extracts street, street number, and house number from address lines.',
    pattern:
      '^\\s*(?:(?:ul\\.?|al\\.?|os\\.?|pl\\.?|aleja)\\s+)?([\\p{L}][\\p{L}\\s\'’.-]+?)\\s+(\\d+[A-Za-z]?)(?:\\s*\\/\\s*([0-9A-Za-z-]+))?\\s*$',
    flags: 'imu',
    message: 'Case Resolver address street captured.',
    sequence: 45,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 30,
    promptExploderConfidenceBoost: 0.12,
    promptExploderCaptureTarget: 'case_resolver.party.street',
    promptExploderCaptureGroup: 1,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.address.street_number',
    title: 'Case Resolver Extract: Address Street Number',
    description:
      'Extracts street number from address lines.',
    pattern:
      '^\\s*(?:(?:ul\\.?|al\\.?|os\\.?|pl\\.?|aleja)\\s+)?([\\p{L}][\\p{L}\\s\'’.-]+?)\\s+(\\d+[A-Za-z]?)(?:\\s*\\/\\s*([0-9A-Za-z-]+))?\\s*$',
    flags: 'imu',
    message: 'Case Resolver address street number captured.',
    sequence: 46,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 30,
    promptExploderConfidenceBoost: 0.12,
    promptExploderCaptureTarget: 'case_resolver.party.streetNumber',
    promptExploderCaptureGroup: 2,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.address.house_number',
    title: 'Case Resolver Extract: Address House Number',
    description:
      'Extracts house/unit number from address lines.',
    pattern:
      '^\\s*(?:(?:ul\\.?|al\\.?|os\\.?|pl\\.?|aleja)\\s+)?([\\p{L}][\\p{L}\\s\'’.-]+?)\\s+(\\d+[A-Za-z]?)(?:\\s*\\/\\s*([0-9A-Za-z-]+))?\\s*$',
    flags: 'imu',
    message: 'Case Resolver address house number captured.',
    sequence: 47,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 30,
    promptExploderConfidenceBoost: 0.12,
    promptExploderCaptureTarget: 'case_resolver.party.houseNumber',
    promptExploderCaptureGroup: 3,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.address.postal_code',
    title: 'Case Resolver Extract: Address Postal Code',
    description:
      'Extracts postal code from postal-code and city lines.',
    pattern:
      '^\\s*(?:PL-)?(\\d{2}-\\d{3})\\s+([\\p{L}][\\p{L}\\s\'’.-]+)\\s*$',
    flags: 'imu',
    message: 'Case Resolver address postal code captured.',
    sequence: 48,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 30,
    promptExploderConfidenceBoost: 0.12,
    promptExploderCaptureTarget: 'case_resolver.party.postalCode',
    promptExploderCaptureGroup: 1,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.address.city',
    title: 'Case Resolver Extract: Address City',
    description:
      'Extracts city from postal-code and city lines.',
    pattern:
      '^\\s*(?:PL-)?(\\d{2}-\\d{3})\\s+([\\p{L}][\\p{L}\\s\'’.-]+)\\s*$',
    flags: 'imu',
    message: 'Case Resolver address city captured.',
    sequence: 49,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 30,
    promptExploderConfidenceBoost: 0.12,
    promptExploderCaptureTarget: 'case_resolver.party.city',
    promptExploderCaptureGroup: 2,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.address.country',
    title: 'Case Resolver Extract: Address Country',
    description:
      'Extracts country from standalone country lines (Polish and English names).',
    pattern:
      '^\\s*(polska|poland|niemcy|germany|deutschland|francja|france|hiszpania|spain|włochy|wlochy|italy|uk|united\\s+kingdom|wielka\\s+brytania|usa|u\\.s\\.a\\.|stany\\s+zjednoczone)\\s*$',
    flags: 'imu',
    message: 'Case Resolver address country captured.',
    sequence: 51,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 24,
    promptExploderConfidenceBoost: 0.08,
    promptExploderCaptureTarget: 'case_resolver.party.country',
    promptExploderCaptureGroup: 1,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'country',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
  }),
  createRegexRule({
    id: 'segment.case_resolver.extract.addressee.organization_name',
    title: 'Case Resolver Extract: Addressee Organization Name',
    description:
      'Extracts addressee organization/company name.',
    pattern: CASE_RESOLVER_ORGANIZATION_LINE_CAPTURE_PATTERN,
    flags: 'imu',
    message: 'Case Resolver addressee organization captured.',
    sequence: 52,
    sequenceGroupId: 'case_resolver_structure',
    sequenceGroupLabel: 'Case Resolver Structure',
    promptExploderPriority: 34,
    promptExploderConfidenceBoost: 0.14,
    promptExploderCaptureTarget: 'case_resolver.addressee.organizationName',
    promptExploderCaptureGroup: 1,
    promptExploderCaptureApplyTo: 'line',
    promptExploderCaptureNormalize: 'trim',
    promptExploderCaptureOverwrite: false,
    appliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
    launchAppliesToScopes: [...CASE_RESOLVER_PROMPT_EXPLODER_SCOPE],
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
  ...PROMPT_EXPLODER_PATTERN_PACK_EXTRA,
];
