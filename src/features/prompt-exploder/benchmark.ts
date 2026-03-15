import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';
import type {
  PromptExploderBenchmarkCase,
  PromptExploderBenchmarkCaseReport,
  PromptExploderBenchmarkReport,
  PromptExploderLearnedTemplate,
  PromptExploderSegmentType,
  PromptExploderSegment,
  PromptExploderBenchmarkSuggestion,
  PromptExploderBenchmarkSuite,
  PromptExploderRuntimeValidationScope,
} from '@/shared/contracts/prompt-exploder';

import { explodePromptText } from './parser';

export const PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET = 0.95;
export const PROMPT_EXPLODER_DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.55;
export const PROMPT_EXPLODER_DEFAULT_SUGGESTION_LIMIT = 4;

export type {
  PromptExploderBenchmarkCase,
  PromptExploderBenchmarkReport,
  PromptExploderBenchmarkCaseReport,
};

export const EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES: PromptExploderBenchmarkCase[] = [
  {
    id: 'image-studio-qa',
    prompt: `=== PREMIUM E-COMMERCE IMAGE EDITING PROMPT WITH STUDIO RELIGHTING ver. 0.8 ===

NON-NEGOTIABLE GOAL (all must be true)
1) Product integrity remains unchanged.
2) Background is pure white.

PARAMS
params = { "apply_studio_relighting": true }

P0 — PRODUCT INTEGRITY (ABSOLUTE)
* Do NOT redraw the product.

REQUIREMENTS
A) BG
* Keep white.

PIPELINE
1. Mask product.
2. Export.

FINAL QA (PASS/FAIL)
QA1 Integrity: pass only when unchanged.`,
    expectedTypes: [
      'metadata',
      'list',
      'parameter_block',
      'referential_list',
      'sequence',
      'hierarchical_list',
      'qa_matrix',
    ],
    minSegments: 6,
  },
  {
    id: 'marketplace-modules',
    prompt: `Relic Shield | 4 cm | Metal | Pin | Warhammer 40k

[PURPOSE]
Cross-check and de-list zero-stock marketplace products.

[GLOBAL_SETTINGS]
- [DRY_RUN] = true
- [MAX_RETRY] = 3

[MODULES]
1. [BASELINKER_IMPORT_MODULE]
2. [MARKETPLACE_MATCHING_MODULE]

[EXECUTION_TEMPLATE]
1. Parse settings.
2. Run modules.

[VALIDATION_MODULE]
FINAL QA (PASS/FAIL)
QA1 Integrity: PASS

[DRY_RUN_BEHAVIOR]
If [DRY_RUN] = true:
- skip destructive actions
If [DRY_RUN] = false:
- perform de-listing`,
    expectedTypes: [
      'metadata',
      'parameter_block',
      'sequence',
      'hierarchical_list',
      'qa_matrix',
      'conditional_list',
    ],
    minSegments: 6,
  },
  {
    id: 'numbered-pro-guidance',
    prompt: `Perform a professional post-production edit.

1. Preserve the Product Exactly
Goal: keep design unchanged.
- no redraw
- no hue shift

2. Background Replacement with Pure White
Goal: pure #FFFFFF.
- no halos

3. Final QA Review
Goal: pass/fail checklist.`,
    expectedTypes: ['sequence'],
    minSegments: 3,
  },
  {
    id: 'non-cutout-background',
    prompt: `=== PREMIUM E-COMMERCE IMAGE EDITING PROMPT WITH STUDIO RELIGHTING BUT NOT WHITE BACKGROUND CUT OUT ver. 0.1 ===

ROLE
Enhance image while preserving original environment.

PARAMS
params = {
  "background": {
    "preserve_original_background": true
  },
  "add_new_ground_shadow": false
}

REQUIREMENTS
A) BACKGROUND (PRESERVE ORIGINAL)
* keep real scene

PIPELINE
1. Cleanup
2. Relight
3. Export

FINAL QA (PASS/FAIL)
QA1 Background preserved.`,
    expectedTypes: ['metadata', 'parameter_block', 'sequence', 'hierarchical_list', 'qa_matrix'],
    minSegments: 5,
  },
  {
    id: 'automation-modules-dry-run',
    prompt: `Relic Shield | 4 cm | Metal | Pin | Warhammer 40k

[PURPOSE]
Cross-check zero-stock products and remove stale marketplace listings.

[GLOBAL_SETTINGS]
- [DRY_RUN] = true
- [MAX_RETRY] = 3

[DATA MODEL]
### ProductRecord
\`\`\`yaml
ProductRecord:
  baselinker_id: "123"
  sku: "SKU-123"
\`\`\`

[VALIDATION_MODULE]
Sanity checks:
- Ensure zero-stock list is valid.
- Ensure destructive actions are blocked when matches are ambiguous.
FINAL QA (PASS/FAIL)
QA1 Scope: PASS when only configured marketplaces are touched.

[DRY_RUN_BEHAVIOR]
If [DRY_RUN] = true:
- discovery only
If [DRY_RUN] = false:
- apply delisting and update flags

[EXECUTION_TEMPLATE]
1. Parse settings.
2. Run modules.
3. Emit run report.`,
    expectedTypes: [
      'metadata',
      'parameter_block',
      'sequence',
      'qa_matrix',
      'conditional_list',
      'hierarchical_list',
    ],
    minSegments: 6,
  },
  {
    id: 'markdown-relight-presets',
    prompt: `# === PREMIUM E-COMMERCE IMAGE EDITING PROMPT WITH STUDIO RELIGHTING ver. 1.1.0 ===

## ROLE
Use image edit tool for premium e-commerce output.

## NON-NEGOTIABLE GOAL
1) Product integrity unchanged.
2) Pure white background outside product + one shadow.

## PARAMS
\`\`\`js
params = {
  "output_profile": "ecommerce_strict",
  "apply_studio_relighting": true
}
\`\`\`

## LIGHTING STYLE PRESETS
1) ecom_high_key_clean
2) ecom_dramatic_softbox

## REQUIREMENTS
A) BG (PURE WHITE)
* keep exact #FFFFFF

## PIPELINE
1. Mask
2. Relight
3. Export

## FINAL QA (PASS/FAIL; fix until all PASS)
QA1 Integrity: PASS
QA_R1 Relighting Applied: PASS only if visibly changed.`,
    expectedTypes: [
      'metadata',
      'list',
      'parameter_block',
      'sequence',
      'hierarchical_list',
      'qa_matrix',
    ],
    minSegments: 6,
  },
  {
    id: 'composite-two-image',
    prompt: `Devil | 6 cm | Metal | Keychain | Diablo

ROLE
Create a photorealistic composite from product image A and environment image B.

PARAMS
params = {
  "composite_mode": "place_product_on_environment",
  "target_product_fill_ratio": 0.18
}

P0 — PRODUCT INTEGRITY (ABSOLUTE)
- Do NOT redraw or regenerate product pixels.
- Do NOT flip or warp.

COMPOSITING REQUIREMENTS
A) BACKGROUND
* use only environment image B
B) SCALE & PLACEMENT
* maintain realistic physical size

PIPELINE
1. Extract product.
2. Place in scene.
3. Match lighting and contact shadow.

FINAL QA (PASS/FAIL)
QA1 Integrity: PASS
QA9 Export: PNG sRGB 1536x1024.`,
    expectedTypes: [
      'metadata',
      'parameter_block',
      'referential_list',
      'sequence',
      'hierarchical_list',
      'qa_matrix',
    ],
    minSegments: 6,
  },
  {
    id: 'ops-audit-security',
    prompt: `# Operations Prompt

[GLOBAL_SETTINGS]
- [DRY_RUN] = true
- [MAX_RETRY] = 3

[LOGGING_AND_AUDIT]
- Emit run report JSON.
- Include timestamps and action counters.

[ERROR_HANDLING]
- Retry transient network errors.
- Mark auth_error without infinite retries.
- Skip destructive actions on ambiguous_match.

[SECURITY_NOTES]
- Never log credentials, cookies, csrf tokens, or MFA codes.
- Use ephemeral secrets only.

[VALIDATION_MODULE]
FINAL QA (PASS/FAIL)
QA1 Audit completeness: PASS only when report includes errors_global and timestamps.`,
    expectedTypes: ['parameter_block', 'sequence', 'qa_matrix'],
    minSegments: 4,
  },
];

const DEFAULT_BENCHMARK_CASE_IDS = new Set<string>([
  'image-studio-qa',
  'marketplace-modules',
  'numbered-pro-guidance',
  'non-cutout-background',
]);

export const DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES: PromptExploderBenchmarkCase[] =
  EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES.filter((benchmarkCase) =>
    DEFAULT_BENCHMARK_CASE_IDS.has(benchmarkCase.id)
  );

const safeSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'segment';

const normalizedSuggestionText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const suggestionTokens = (value: string): string[] =>
  normalizedSuggestionText(value)
    .split(' ')
    .filter((token) => token.length > 2)
    .slice(0, 6);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSuggestionSampleText = (segment: {
  text: string;
  listItems: Array<{ text: string }>;
  subsections: Array<{ title: string }>;
}): string => {
  const baseText = segment.text.trim();
  if (baseText.length > 0) return baseText.slice(0, 240);
  if (segment.listItems.length > 0) {
    return segment.listItems
      .slice(0, 3)
      .map((item) => item.text)
      .join(' ')
      .slice(0, 240);
  }
  if (segment.subsections.length > 0) {
    return segment.subsections
      .slice(0, 3)
      .map((subsection) => subsection.title)
      .join(' ')
      .slice(0, 240);
  }
  return '';
};

const buildSuggestedRulePattern = (title: string, sampleText: string): string => {
  const tokens = suggestionTokens(`${title} ${sampleText}`);
  if (tokens.length === 0) {
    const escapedTitle = escapeRegExp(title.trim());
    return escapedTitle ? `^\\s*${escapedTitle}\\s*$` : '\\bsegment\\b';
  }
  return tokens.map((token) => `\\b${escapeRegExp(token)}\\b`).join('[\\s\\S]{0,140}');
};

const isHeadingLike = (title: string): boolean => {
  const trimmed = title.trim();
  return (
    /^#{1,6}\s+\S+/.test(trimmed) ||
    /^\[[A-Z0-9 _()\-/:&+.,]{2,}]$/.test(trimmed) ||
    /^[A-Z][A-Z0-9 _()\-/:&+.,]{2,}$/.test(trimmed)
  );
};

const safeDivide = (numerator: number, denominator: number): number =>
  denominator <= 0 ? 0 : numerator / denominator;

const computeF1 = (precision: number, recall: number): number =>
  precision + recall <= 0 ? 0 : (2 * precision * recall) / (precision + recall);

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function runPromptExploderBenchmark(args: {
  validationRules: PromptValidationRule[];
  learnedTemplates?: PromptExploderLearnedTemplate[] | null;
  similarityThreshold?: number;
  validationScope?: PromptExploderRuntimeValidationScope;
  suite?: PromptExploderBenchmarkSuite;
  lowConfidenceThreshold?: number;
  suggestionLimit?: number;
  cases?: PromptExploderBenchmarkCase[] | null;
}): PromptExploderBenchmarkReport {
  const suite = args.suite ?? 'default';
  const lowConfidenceThreshold = clampNumber(
    args.lowConfidenceThreshold ?? PROMPT_EXPLODER_DEFAULT_LOW_CONFIDENCE_THRESHOLD,
    0.3,
    0.9
  );
  const suggestionLimit = clampNumber(
    Math.floor(args.suggestionLimit ?? PROMPT_EXPLODER_DEFAULT_SUGGESTION_LIMIT),
    1,
    20
  );
  const hasCustomCaseSet = Array.isArray(args.cases);
  const defaultCases =
    suite === 'extended'
      ? EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES
      : DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES;
  const benchmarkCases = hasCustomCaseSet ? (args.cases ?? []) : defaultCases;
  const reports: PromptExploderBenchmarkCaseReport[] = [];
  let totalExpected = 0;
  let totalMatched = 0;
  let totalPrecision = 0;
  let totalRecall = 0;
  let totalF1 = 0;
  let minSegmentPassCount = 0;
  let confidenceCaseSum = 0;
  let totalLowConfidenceSegments = 0;
  let totalLowConfidenceSuggestions = 0;

  benchmarkCases.forEach((benchmarkCase) => {
    const document = explodePromptText({
      prompt: benchmarkCase.prompt,
      validationRules: args.validationRules,
      learnedTemplates: args.learnedTemplates ?? [],
      ...(args.validationScope ? { validationScope: args.validationScope } : {}),
      ...(args.similarityThreshold !== undefined
        ? { similarityThreshold: args.similarityThreshold }
        : {}),
    });

    const predictedTypeSet = new Set<PromptExploderSegmentType>(
      document.segments.map((segment: PromptExploderSegment) => segment.type)
    );
    const expectedTypeSet = new Set(benchmarkCase.expectedTypes);
    const matchedTypes = benchmarkCase.expectedTypes.filter((type) => predictedTypeSet.has(type));
    const missingTypes = benchmarkCase.expectedTypes.filter((type) => !predictedTypeSet.has(type));
    const unexpectedTypes = [...predictedTypeSet].filter((type) => !expectedTypeSet.has(type));
    const precision = safeDivide(matchedTypes.length, predictedTypeSet.size);
    const recall = safeDivide(matchedTypes.length, benchmarkCase.expectedTypes.length);
    const f1 = computeF1(precision, recall);
    const avgSegmentConfidence = safeDivide(
      document.segments.reduce(
        (sum: number, segment: PromptExploderSegment) => sum + segment.confidence,
        0
      ),
      document.segments.length
    );
    const lowConfidenceSegmentList = document.segments.filter(
      (segment: PromptExploderSegment) => segment.confidence < lowConfidenceThreshold
    );
    const lowConfidenceSuggestions: PromptExploderBenchmarkSuggestion[] = [
      ...lowConfidenceSegmentList,
    ]
      .sort(
        (left: PromptExploderSegment, right: PromptExploderSegment) =>
          left.confidence - right.confidence
      )
      .slice(0, suggestionLimit)
      .map((segment: PromptExploderSegment, index: number) => {
        const sampleText = buildSuggestionSampleText({
          text: segment.text || '',
          listItems: (segment.listItems || []).map((item) => ({ text: item.text || '' })),
          subsections: (segment.subsections || []).map((sub) => ({ title: sub.title || '' })),
        });
        const suggestedRulePattern = buildSuggestedRulePattern(segment.title || '', sampleText);
        const segmentSlug = safeSlug(segment.title || '');
        return {
          id: `bench_${benchmarkCase.id}_${segmentSlug}_${index + 1}`,
          caseId: benchmarkCase.id,
          segmentId: segment.id,
          segmentTitle: segment.title,
          segmentType: segment.type,
          confidence: segment.confidence,
          sampleText,
          matchedPatternIds: [...segment.matchedPatternIds],
          suggestedRuleTitle: `Benchmark ${benchmarkCase.id} · ${segment.type} · ${segment.title || 'Untitled'}`,
          suggestedRulePattern,
          suggestedSegmentType: segment.type,
          suggestedPriority: 18,
          suggestedConfidenceBoost: 0.1,
          suggestedRuleTreatAsHeading: isHeadingLike(segment.title || ''),
        };
      });
    const meetsMinSegments = document.segments.length >= benchmarkCase.minSegments;

    reports.push({
      id: benchmarkCase.id,
      expectedTypes: [...benchmarkCase.expectedTypes],
      predictedTypes: [...predictedTypeSet],
      matchedTypes,
      missingTypes,
      unexpectedTypes,
      segmentCount: document.segments.length,
      minSegments: benchmarkCase.minSegments,
      meetsMinSegments,
      avgSegmentConfidence,
      lowConfidenceSegments: lowConfidenceSegmentList.length,
      precision,
      recall,
      f1,
      lowConfidenceSuggestions,
    });

    totalExpected += benchmarkCase.expectedTypes.length;
    totalMatched += matchedTypes.length;
    totalPrecision += precision;
    totalRecall += recall;
    totalF1 += f1;
    if (meetsMinSegments) minSegmentPassCount += 1;
    confidenceCaseSum += avgSegmentConfidence;
    totalLowConfidenceSegments += lowConfidenceSegmentList.length;
    totalLowConfidenceSuggestions += lowConfidenceSuggestions.length;
  });

  const caseCount = reports.length;
  return {
    generatedAt: new Date().toISOString(),
    suite: hasCustomCaseSet ? 'custom' : suite,
    config: {
      lowConfidenceThreshold,
      suggestionLimit,
    },
    cases: reports,
    aggregate: {
      caseCount,
      expectedTypeRecall: safeDivide(totalMatched, totalExpected),
      macroPrecision: safeDivide(totalPrecision, caseCount),
      macroRecall: safeDivide(totalRecall, caseCount),
      macroF1: safeDivide(totalF1, caseCount),
      minSegmentPassRate: safeDivide(minSegmentPassCount, caseCount),
      avgSegmentConfidence: safeDivide(confidenceCaseSum, caseCount),
      totalLowConfidenceSegments,
      totalLowConfidenceSuggestions,
    },
  };
}
