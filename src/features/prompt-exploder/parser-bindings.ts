import type {
  PromptExploderBinding,
  PromptExploderListItem,
  PromptExploderSegment,
  PromptExploderSubsection,
} from './types';

const REFERENCE_CODE_RE = /\b(P\d+|RL\d+|QA(?:_R)?\d+)\b/g;
const PARAM_REFERENCE_RE = /\b([a-z_]+(?:\.[a-z_]+)+)\b/g;

type BindingCodeTarget = {
  code: string;
  segmentId: string;
  subsectionId: string | null;
  label: string;
};

const extractReferenceCodes = (value: string): string[] => {
  const matches = new Set<string>();
  for (const match of value.matchAll(REFERENCE_CODE_RE)) {
    const code = (match[1] ?? '').trim();
    if (!code) continue;
    matches.add(code.toUpperCase());
  }
  return [...matches];
};

const collectParamPaths = (objectValue: Record<string, unknown> | null, prefix = ''): string[] => {
  if (!objectValue) return [];
  const out: string[] = [];
  Object.entries(objectValue).forEach(([key, value]) => {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    out.push(nextPath);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...collectParamPaths(value as Record<string, unknown>, nextPath));
    }
  });
  return out;
};

const buildBindingCodeTargets = (
  segments: PromptExploderSegment[]
): Map<string, BindingCodeTarget> => {
  const map = new Map<string, BindingCodeTarget>();

  const register = (
    code: string | null | undefined,
    segmentId: string,
    subsectionId: string | null,
    label: string
  ): void => {
    const normalizedCode = (code ?? '').trim().toUpperCase();
    if (!normalizedCode || map.has(normalizedCode)) return;
    map.set(normalizedCode, {
      code: normalizedCode,
      segmentId,
      subsectionId,
      label: label.trim() || normalizedCode,
    });
  };

  segments.forEach((segment: PromptExploderSegment) => {
    register(segment.code || '', segment.id, null, segment.title || '');
    segment.subsections.forEach((subsection: PromptExploderSubsection) => {
      register(subsection.code || '', segment.id, subsection.id, subsection.title || '');
    });
  });
  return map;
};

const normalizeManualBindings = (
  bindings: PromptExploderBinding[],
  segments: PromptExploderSegment[]
): PromptExploderBinding[] => {
  if (!bindings.length) return [];
  const segmentById = new Map(
    segments.map((segment: PromptExploderSegment) => [segment.id, segment])
  );
  return bindings
    .filter((binding: PromptExploderBinding) => {
      const fromSegment = segmentById.get(binding.fromSegmentId || '');
      const toSegment = segmentById.get(binding.toSegmentId || '');
      if (!fromSegment || !toSegment) return false;
      const fromSubsectionId = binding.fromSubsectionId ?? null;
      const toSubsectionId = binding.toSubsectionId ?? null;
      if (
        fromSubsectionId &&
        !fromSegment.subsections.some(
          (subsection: PromptExploderSubsection) => subsection.id === fromSubsectionId
        )
      ) {
        return false;
      }
      if (
        toSubsectionId &&
        !toSegment.subsections.some(
          (subsection: PromptExploderSubsection) => subsection.id === toSubsectionId
        )
      ) {
        return false;
      }
      return true;
    })
    .map((binding: PromptExploderBinding) => ({
      ...binding,
      fromSubsectionId: binding.fromSubsectionId ?? null,
      toSubsectionId: binding.toSubsectionId ?? null,
      origin: 'manual' as const,
    }));
};

type DetectAutoBindingsArgs = {
  segments: PromptExploderSegment[];
  renderSegment: (segment: PromptExploderSegment) => string;
  createBindingId: () => string;
  collectReferencedParamsFromItems: (items: PromptExploderListItem[]) => string[];
};

const detectAutoBindings = ({
  segments,
  renderSegment,
  createBindingId,
  collectReferencedParamsFromItems,
}: DetectAutoBindingsArgs): PromptExploderBinding[] => {
  const bindings: PromptExploderBinding[] = [];
  const codeTargets = buildBindingCodeTargets(segments);
  const paramsSegment = segments.find((segment) => segment.type === 'parameter_block') ?? null;
  const paramPaths = collectParamPaths(paramsSegment?.paramsObject ?? null);
  const isKnownParamPath = (candidate: string): boolean =>
    paramPaths.some((path) => path === candidate || path.endsWith(`.${candidate}`));

  segments.forEach((segment: PromptExploderSegment) => {
    const rendered = renderSegment(segment);
    const sourceLabel = segment.title;

    extractReferenceCodes(rendered).forEach((code: string) => {
      const target = codeTargets.get(code.toUpperCase());
      if (!target) return;
      if (target.segmentId === segment.id) return;
      bindings.push({
        id: createBindingId(),
        type: 'references',
        fromSegmentId: segment.id,
        toSegmentId: target.segmentId,
        fromSubsectionId: null,
        toSubsectionId: target.subsectionId,
        sourceLabel: sourceLabel || '',
        targetLabel: `${target.code} ${target.label}`.trim(),
        origin: 'auto',
      });
    });

    if (!paramsSegment || paramsSegment.id === segment.id) {
      return;
    }

    const referencedParams = new Set<string>();
    for (const match of rendered.matchAll(PARAM_REFERENCE_RE)) {
      const paramPath = (match[1] ?? '').trim();
      if (!paramPath || !isKnownParamPath(paramPath)) continue;
      referencedParams.add(paramPath);
    }
    collectReferencedParamsFromItems(segment.listItems || []).forEach((paramPath: string) => {
      if (!isKnownParamPath(paramPath)) return;
      referencedParams.add(paramPath);
    });
    segment.subsections.forEach((subsection: PromptExploderSubsection) => {
      collectReferencedParamsFromItems(subsection.items || []).forEach((paramPath: string) => {
        if (!isKnownParamPath(paramPath)) return;
        referencedParams.add(paramPath);
      });
    });

    referencedParams.forEach((paramPath: string) => {
      bindings.push({
        id: createBindingId(),
        type: 'uses_param',
        fromSegmentId: segment.id,
        toSegmentId: paramsSegment.id,
        fromSubsectionId: null,
        toSubsectionId: null,
        sourceLabel: sourceLabel || '',
        targetLabel: `params.${paramPath}`,
        origin: 'auto',
      });
    });
  });

  return bindings;
};

const autoBindingsCache = new WeakMap<PromptExploderSegment[], PromptExploderBinding[]>();

const resolveAutoBindings = (args: DetectAutoBindingsArgs): PromptExploderBinding[] => {
  const cached = autoBindingsCache.get(args.segments);
  if (cached) return cached;
  const detected = detectAutoBindings(args);
  autoBindingsCache.set(args.segments, detected);
  return detected;
};

const bindingDedupeKey = (binding: PromptExploderBinding): string =>
  `${binding.type}:${binding.fromSegmentId}:${binding.fromSubsectionId ?? ''}:${binding.toSegmentId}:${binding.toSubsectionId ?? ''}:${binding.targetLabel}`;

const hashBindingKey = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

const dedupeBindings = (bindings: PromptExploderBinding[]): PromptExploderBinding[] => {
  const deduped = new Map<string, PromptExploderBinding>();
  bindings.forEach((binding: PromptExploderBinding) => {
    const key = bindingDedupeKey(binding);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(
        key,
        binding.origin === 'auto' ? { ...binding, id: `auto_${hashBindingKey(key)}` } : binding
      );
      return;
    }
    if (existing.origin === 'auto' && binding.origin === 'manual') {
      deduped.set(key, binding);
    }
  });
  return [...deduped.values()];
};

export const buildPromptExploderBindings = (args: {
  segments: PromptExploderSegment[];
  manualBindings?: PromptExploderBinding[];
  renderSegment: (segment: PromptExploderSegment) => string;
  createBindingId: () => string;
  collectReferencedParamsFromItems: (items: PromptExploderListItem[]) => string[];
}): PromptExploderBinding[] => {
  const autoBindings = resolveAutoBindings({
    segments: args.segments,
    renderSegment: args.renderSegment,
    createBindingId: args.createBindingId,
    collectReferencedParamsFromItems: args.collectReferencedParamsFromItems,
  });
  const normalizedManual = normalizeManualBindings(args.manualBindings ?? [], args.segments);
  return dedupeBindings([...autoBindings, ...normalizedManual]);
};
