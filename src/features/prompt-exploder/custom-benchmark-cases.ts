import type {
  PromptExploderBenchmarkCase,
  PromptExploderSegmentType,
  ParseCustomBenchmarkCasesResult,
} from '@/shared/contracts/prompt-exploder';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const PROMPT_EXPLODER_SEGMENT_TYPES: PromptExploderSegmentType[] = [
  'metadata',
  'assigned_text',
  'list',
  'parameter_block',
  'referential_list',
  'sequence',
  'hierarchical_list',
  'conditional_list',
  'qa_matrix',
];

export const toCustomCaseSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'case';

export const defaultCustomBenchmarkCaseIdFromPrompt = (prompt: string): string => {
  const firstLine =
    prompt
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? 'custom_case';
  return `custom_${toCustomCaseSlug(firstLine)}`;
};

export const parseCustomBenchmarkCasesDraft = (
  rawValue: string
): ParseCustomBenchmarkCasesResult => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: true, cases: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    logClientError(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON.',
    };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'Custom benchmark cases must be an array.' };
  }
  const parsedArray = parsed as unknown[];
  const allowedTypes = new Set<PromptExploderSegmentType>(PROMPT_EXPLODER_SEGMENT_TYPES);
  const knownIds = new Set<string>();

  const cases: PromptExploderBenchmarkCase[] = [];
  for (let index = 0; index < parsedArray.length; index += 1) {
    const item: unknown = parsedArray[index];
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `Case #${index + 1} must be an object.` };
    }
    const value = item as Record<string, unknown>;
    const rawExpectedTypes: unknown[] = Array.isArray(value['expectedTypes'])
      ? (value['expectedTypes'] as unknown[])
      : [];
    const id = typeof value['id'] === 'string' ? value['id'].trim() : '';
    const prompt = typeof value['prompt'] === 'string' ? value['prompt'].trim() : '';
    const expectedTypes = rawExpectedTypes.filter((type): type is PromptExploderSegmentType => {
      return typeof type === 'string' && allowedTypes.has(type as PromptExploderSegmentType);
    });
    const minSegments =
      typeof value['minSegments'] === 'number' && Number.isFinite(value['minSegments'])
        ? clampNumber(Math.floor(value['minSegments']), 1, 200)
        : 1;

    if (!id) {
      return { ok: false, error: `Case #${index + 1} is missing a valid id.` };
    }
    if (knownIds.has(id)) {
      return { ok: false, error: `Duplicate custom case id: "${id}".` };
    }
    knownIds.add(id);
    if (!prompt) {
      return { ok: false, error: `Case #${index + 1} is missing a prompt.` };
    }
    if (expectedTypes.length === 0) {
      return {
        ok: false,
        error: `Case "${id}" must include at least one valid expected type.`,
      };
    }

    cases.push({
      id,
      prompt,
      expectedTypes,
      minSegments,
    });
  }

  return { ok: true, cases };
};

export const upsertCustomBenchmarkCase = (
  cases: PromptExploderBenchmarkCase[],
  nextCase: PromptExploderBenchmarkCase
): PromptExploderBenchmarkCase[] => {
  return [...cases.filter((benchmarkCase) => benchmarkCase.id !== nextCase.id), nextCase];
};

export const mergeCustomBenchmarkCases = (
  currentCases: PromptExploderBenchmarkCase[],
  templateCases: PromptExploderBenchmarkCase[]
): PromptExploderBenchmarkCase[] => {
  const nextById = new Map<string, PromptExploderBenchmarkCase>();
  [...currentCases, ...templateCases].forEach((benchmarkCase) => {
    nextById.set(benchmarkCase.id, benchmarkCase);
  });
  return [...nextById.values()];
};
