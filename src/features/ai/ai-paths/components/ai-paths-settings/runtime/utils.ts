import type * as React from 'react';
import type {
  AiNode,
  AiPathRuntimeNodeStatus,
  AiPathRunRecord,
  Edge,
  PathConfig,
  PathBlockedRunPolicy,
  PathDebugEntry,
  PathDebugSnapshot,
  PathExecutionMode,
  AiPathsValidationConfig,
  PathRunMode,
  ParserSampleState,
  RuntimeState,
  RuntimePortValues,
  UpdaterSampleState,
} from '@/shared/lib/ai-paths';
import { STORAGE_VERSION } from '@/shared/lib/ai-paths';
import { extractImageUrls } from '@/shared/lib/ai-paths/core/runtime/utils';

/**
 * Generate a unique run ID
 */
export const createRunId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `run_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
};

/**
 * Convert Date/string to ISO string
 */
export const toIsoString = (value?: Date | string | null): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.toISOString();
};

/**
 * Resolve when a run started
 */
export const resolveRunStartedAt = (run: AiPathRunRecord, parsed: RuntimeState): string | null => {
  if (parsed.currentRun?.startedAt) return parsed.currentRun.startedAt;
  return toIsoString(run.startedAt);
};

/**
 * Resolve the effective timestamp for a run
 */
export const resolveRunAt = (run: AiPathRunRecord): string => {
  return (
    toIsoString(run.finishedAt) ??
    toIsoString(run.updatedAt) ??
    toIsoString(run.startedAt) ??
    new Date().toISOString()
  );
};

const normalizeNodeStatusForMerge = (value: unknown): AiPathRuntimeNodeStatus | null => {
  if (typeof value !== 'string') return null;
  const status = value.trim().toLowerCase();
  if (
    status === 'idle' ||
    status === 'queued' ||
    status === 'running' ||
    status === 'completed' ||
    status === 'cached' ||
    status === 'failed' ||
    status === 'canceled' ||
    status === 'skipped' ||
    status === 'blocked' ||
    status === 'pending' ||
    status === 'processing' ||
    status === 'polling' ||
    status === 'waiting_callback' ||
    status === 'advance_pending' ||
    status === 'timeout'
  ) {
    return status;
  }
  return null;
};

const isObjectValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeBlockedReason = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const hasWaitingPorts = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.some((port: unknown): boolean => typeof port === 'string' && port.trim().length > 0);

export const resolveRuntimeNodeDisplayStatus = (input: {
  status: AiPathRuntimeNodeStatus | null;
  outputs?: RuntimePortValues | null;
  metadata?: Record<string, unknown> | null;
}): AiPathRuntimeNodeStatus | null => {
  const status = input.status;
  if (!status) return null;
  if (status !== 'blocked') return status;

  const outputs = isObjectValue(input.outputs) ? input.outputs : null;
  const metadata = isObjectValue(input.metadata) ? input.metadata : null;
  const metadataOutputs = isObjectValue(metadata?.['outputs']) ? metadata['outputs'] : null;
  const blockedReason =
    normalizeBlockedReason(outputs?.['blockedReason']) ??
    normalizeBlockedReason(metadataOutputs?.['blockedReason']) ??
    normalizeBlockedReason(metadata?.['reason']);
  const waitingPortsPresent =
    hasWaitingPorts(outputs?.['waitingOnPorts']) ||
    hasWaitingPorts(metadataOutputs?.['waitingOnPorts']) ||
    hasWaitingPorts(metadata?.['waitingOnPorts']);

  if (blockedReason === 'missing_inputs' || (!blockedReason && waitingPortsPresent)) {
    return 'waiting_callback';
  }
  return status;
};

export const mergeRuntimeNodeOutputsForStatus = (input: {
  previous: RuntimePortValues | undefined;
  next: RuntimePortValues | undefined;
  status: unknown;
}): RuntimePortValues => {
  const nextOutputs = input.next ?? {};
  const { status: _nextStatus, ...nextOutputsWithoutStatus } = nextOutputs;
  const previousStatus = normalizeNodeStatusForMerge(input.previous?.['status']);
  const mergedOutputsForStatus = {
    ...(input.previous ?? {}),
    ...nextOutputs,
  } as RuntimePortValues;
  const normalizedStatus = resolveRuntimeNodeDisplayStatus({
    status: normalizeNodeStatusForMerge(input.status),
    outputs: mergedOutputsForStatus,
  });
  const effectiveStatus = normalizedStatus ?? previousStatus;
  const merged = {
    ...(input.previous ?? {}),
    ...nextOutputsWithoutStatus,
    ...(effectiveStatus ? { status: effectiveStatus } : {}),
  } as RuntimePortValues;

  const hasOwn = (key: string): boolean => Object.prototype.hasOwnProperty.call(nextOutputs, key);

  const keepWaitingDiagnostics =
    effectiveStatus === 'blocked' ||
    effectiveStatus === 'waiting_callback' ||
    effectiveStatus === 'advance_pending';

  if (!keepWaitingDiagnostics) {
    delete merged['blockedReason'];
    delete merged['requiredPorts'];
    delete merged['waitingOnPorts'];
    delete merged['skipReason'];
    if (!hasOwn('message')) {
      delete merged['message'];
    }
  }

  if (!hasOwn('error')) {
    delete merged['error'];
  }

  return merged;
};

/**
 * Merge an incoming runtime state snapshot into current state
 */
export const mergeRuntimeStateSnapshot = (
  current: RuntimeState,
  incoming: RuntimeState,
  currentRun?: AiPathRunRecord | null
): RuntimeState => {
  const nextInputs: Record<string, RuntimePortValues> = {
    ...(current.inputs ?? {}),
    ...(incoming.inputs ?? {}),
  };
  const nextOutputs: Record<string, RuntimePortValues> = {};
  const outputNodeIds = new Set<string>([
    ...Object.keys(current.outputs ?? {}),
    ...Object.keys(incoming.outputs ?? {}),
  ]);
  outputNodeIds.forEach((nodeId: string) => {
    const incomingNodeOutputs = incoming.outputs?.[nodeId];
    if (incomingNodeOutputs === undefined) {
      if (current.outputs?.[nodeId] !== undefined) {
        nextOutputs[nodeId] = current.outputs[nodeId]!;
      }
      return;
    }
    nextOutputs[nodeId] = mergeRuntimeNodeOutputsForStatus({
      previous: current.outputs?.[nodeId],
      next: incomingNodeOutputs,
      status: incomingNodeOutputs['status'],
    });
  });

  const incomingHashes = incoming.hashes ?? undefined;
  const hasIncomingHashes = !!incomingHashes && Object.keys(incomingHashes).length > 0;
  const mergedHashes = hasIncomingHashes
    ? { ...(current.hashes ?? {}), ...(incomingHashes ?? {}) }
    : current.hashes;

  const incomingHistory = incoming.history ?? undefined;
  const hasIncomingHistory = !!incomingHistory && Object.keys(incomingHistory).length > 0;
  const mergedHistory = hasIncomingHistory
    ? { ...(current.history ?? {}), ...(incomingHistory ?? {}) }
    : current.history;

  const next: RuntimeState = {
    ...current,
    ...incoming,
    inputs: nextInputs,
    outputs: nextOutputs,
    currentRun: currentRun ?? incoming.currentRun ?? current.currentRun ?? null,
  };
  if (mergedHashes !== undefined) {
    next.hashes = mergedHashes;
  }
  if (mergedHistory !== undefined) {
    next.history = mergedHistory;
  }
  return next;
};

/**
 * Build a full PathConfig for the current active state
 */
export const buildActivePathConfig = (args: {
  activePathId: string | null;
  pathName: string;
  pathDescription: string;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  runMode: PathRunMode;
  strictFlowMode?: boolean;
  blockedRunPolicy?: PathBlockedRunPolicy;
  aiPathsValidation?: AiPathsValidationConfig | undefined;
  nodes: AiNode[];
  edges: Edge[];
  updatedAt: string;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  runtimeState: RuntimeState;
  lastRunAt: string | null;
  runCount?: number;
}): PathConfig => ({
  id: args.activePathId ?? 'default',
  version: STORAGE_VERSION,
  name: args.pathName,
  description: args.pathDescription,
  trigger: args.activeTrigger,
  executionMode: args.executionMode,
  runMode: args.runMode,
  strictFlowMode: args.strictFlowMode ?? true,
  blockedRunPolicy: args.blockedRunPolicy ?? 'fail_run',
  aiPathsValidation: args.aiPathsValidation,
  nodes: args.nodes,
  edges: args.edges,
  updatedAt: args.updatedAt,
  parserSamples: args.parserSamples,
  updaterSamples: args.updaterSamples,
  runtimeState: args.runtimeState,
  lastRunAt: args.lastRunAt,
  runCount:
    typeof args.runCount === 'number' && Number.isFinite(args.runCount)
      ? Math.max(0, Math.trunc(args.runCount))
      : 0,
});

/**
 * Escapes CSS selectors
 */
export const selectorEscape = (val: string): string => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(val);
  }
  return val.replace(/[^\w-]/g, '$&');
};

/**
 * Gets a DOM selector for an element
 */
export const getDomSelector = (element: Element | null): string | null => {
  if (!element) return null;

  const dataSelector =
    element.getAttribute('data-component') ||
    element.getAttribute('data-testid') ||
    element.getAttribute('data-node');

  if (dataSelector) {
    const attr =
      element.getAttribute('data-component') !== null
        ? 'data-component'
        : element.getAttribute('data-testid') !== null
          ? 'data-testid'
          : 'data-node';
    return `${element.tagName.toLowerCase()}[${attr}="${selectorEscape(dataSelector)}"]`;
  }

  if (element.id) {
    return `#${selectorEscape(element.id)}`;
  }

  const segments: string[] = [];
  let current: Element | null = element;
  while (current && current.tagName.toLowerCase() !== 'html' && segments.length < 5) {
    const tagName = current.tagName.toLowerCase();
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;
    const siblings: Element[] = Array.from(parent.children).filter(
      (child: Element): boolean => child.tagName === (current as Element).tagName
    );
    const index: number = siblings.indexOf(current) + 1;
    segments.unshift(`${tagName}:nth-of-type(${index})`);
    if (parent.id) {
      segments.unshift(`#${selectorEscape(parent.id)}`);
      break;
    }
    current = parent as Element;
  }
  return segments.length ? segments.join(' > ') : element.tagName.toLowerCase();
};

/**
 * Extracts info from a mouse event target
 */
export const getTargetInfo = (
  event?: React.MouseEvent | undefined
): Record<string, unknown> | null => {
  const target = event?.target as Element | null;
  if (!target) return null;
  const element =
    target.closest('[data-component],[data-testid],[data-node],button,a,[role=\'button\']') ?? target;
  const rect = element.getBoundingClientRect();
  const dataset = element instanceof HTMLElement ? element.dataset : undefined;
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    className: element.getAttribute('class') || undefined,
    name: element.getAttribute('name') || undefined,
    type: element.getAttribute('type') || undefined,
    role: element.getAttribute('role') || undefined,
    ariaLabel: element.getAttribute('aria-label') || undefined,
    dataComponent: element.getAttribute('data-component') || undefined,
    dataTestId: element.getAttribute('data-testid') || undefined,
    dataNode: element.getAttribute('data-node') || undefined,
    selector: getDomSelector(element),
    boundingClientRect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
    },
    dataset: dataset ? { ...dataset } : undefined,
  };
};

/**
 * Builds the trigger context for a graph run
 */
export const buildTriggerContext = (args: {
  triggerNode: AiNode;
  triggerEvent: string;
  event?: React.MouseEvent | undefined;
  sessionUser: { id: string; name: string | null; email: string | null } | null;
  activePathId: string | null;
  pathName: string;
  activeTab?: string | undefined;
  activeTrigger: string;
}): Record<string, unknown> => {
  const timestamp = new Date().toISOString();
  const nativeEvent = args.event?.nativeEvent;
  const pointer = nativeEvent
    ? {
      clientX: nativeEvent.clientX,
      clientY: nativeEvent.clientY,
      pageX: nativeEvent.pageX,
      pageY: nativeEvent.pageY,
      screenX: nativeEvent.screenX,
      screenY: nativeEvent.screenY,
      offsetX: 'offsetX' in nativeEvent ? nativeEvent.offsetX : undefined,
      offsetY: 'offsetY' in nativeEvent ? nativeEvent.offsetY : undefined,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      altKey: nativeEvent.altKey,
      ctrlKey: nativeEvent.ctrlKey,
      shiftKey: nativeEvent.shiftKey,
      metaKey: nativeEvent.metaKey,
    }
    : undefined;

  const targetInfo = getTargetInfo(args.event);
  const location =
    typeof window !== 'undefined'
      ? {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        referrer: document.referrer || undefined,
      }
      : {};

  const ui =
    typeof window !== 'undefined'
      ? {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        },
        screen: {
          width: window.screen?.width,
          height: window.screen?.height,
          availWidth: window.screen?.availWidth,
          availHeight: window.screen?.availHeight,
        },
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        documentTitle: document.title,
        visibilityState: document.visibilityState,
        scroll: {
          x: window.scrollX,
          y: window.scrollY,
        },
      }
      : {};

  return {
    timestamp,
    location,
    ui,
    user: args.sessionUser,
    event: {
      id: args.triggerEvent,
      nodeId: args.triggerNode.id,
      nodeTitle: args.triggerNode.title,
      type: args.event?.type,
      pointer,
      target: targetInfo,
    },
    source: {
      pathId: args.activePathId,
      pathName: args.pathName,
      tab: args.activeTab,
    },
    extras: {
      triggerLabel: args.activeTrigger,
    },
  };
};

/**
 * Builds a simulation context for local execution
 */
export const buildSimulationContext = (args: {
  entityId: string;
  entityType: string;
  entity?: Record<string, unknown> | null;
}): Record<string, unknown> => {
  const scopedEntity = args.entity ?? null;
  const imageUrls = scopedEntity ? extractImageUrls(scopedEntity) : [];
  return {
    contextSource: 'simulation_manual',
    source: 'simulation',
    entityId: args.entityId,
    entityType: args.entityType,
    ...(args.entityType === 'product' ? { productId: args.entityId } : {}),
    ...(imageUrls.length ? { images: imageUrls, imageUrls } : {}),
    ...(scopedEntity ? { entity: scopedEntity, entityJson: scopedEntity } : {}),
    ...(args.entityType === 'product' && scopedEntity ? { product: scopedEntity } : {}),
  };
};

/**
 * Builds a debug snapshot for database node outputs
 */
export const buildDebugSnapshot = (args: {
  pathId: string | null;
  runAt: string;
  state: RuntimeState;
  nodes: AiNode[];
}): PathDebugSnapshot | null => {
  if (!args.pathId) return null;
  const entries = args.nodes
    .filter((node: AiNode): boolean => node.type === 'database')
    .map((node: AiNode): PathDebugEntry | null => {
      const output = args.state.outputs?.[node.id] as { debugPayload?: unknown } | undefined;
      const debugPayload = output?.debugPayload;
      if (debugPayload === undefined || debugPayload === null) return null;
      return {
        nodeId: node.id,
        title: node.title ?? undefined,
        debug: debugPayload,
      };
    })
    .filter((entry: PathDebugEntry | null): entry is PathDebugEntry => entry !== null);

  if (entries.length === 0) return null;
  return { pathId: args.pathId, runAt: args.runAt, entries };
};

/**
 * Safely stringify JSON
 */
export const safeJsonStringify = (value: unknown): string | null => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};
