import type { AiPathRunNodeRecord, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { PlaywrightArtifactLink } from '@/shared/contracts/playwright';
import { isObjectRecord } from '@/shared/utils/object-utils';

export type PlaywrightRuntimePostureSummary = {
  nodeId: string;
  nodeTitle: string | null;
  nodeType: string | null;
  browserLabel: string | null;
  browserEngine: string | null;
  headless: boolean | null;
  identityProfile: string | null;
  locale: string | null;
  timezoneId: string | null;
  proxyEnabled: boolean | null;
  proxyProviderPreset: string | null;
  proxySessionMode: string | null;
  proxyReason: string | null;
  proxyServerHost: string | null;
  stickyStorageEnabled: boolean | null;
  stickyStorageLoaded: boolean | null;
};

const normalizeArtifactUrlFromPath = (relativePath: string): string | null => {
  const normalized = relativePath.trim().replace(/^\/+/, '');
  if (!normalized) return null;
  const parts = normalized.split('/');
  if (parts.length < 2) return null;
  const runId = (parts[0] ?? '').trim();
  const file = parts.slice(1).join('/').trim();
  if (!runId || !file) return null;
  if (file.includes('/') || file.includes('\\')) return null;
  return `/api/ai-paths/playwright/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(file)}`;
};

const readArtifactsArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter(isObjectRecord) : [];

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const toOptionalBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const formatLabel = (value: string | null | undefined): string | null => {
  if (!hasText(value)) {
    return null;
  }

  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const isRuntimePostureArtifactName = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return normalized === 'runtime-posture' || normalized.includes('runtime-posture');
};

const getArtifactCandidates = (
  outputs: Record<string, unknown>
): Array<Record<string, unknown>> => {
  const fromBundle = isObjectRecord(outputs['bundle'])
    ? readArtifactsArray(outputs['bundle']['artifacts'])
    : [];
  const fromTopLevel = readArtifactsArray(outputs['artifacts']);
  return [...fromBundle, ...fromTopLevel];
};

const getRuntimePostureCandidate = (outputs: Record<string, unknown>): Record<string, unknown> | null => {
  const bundle = isObjectRecord(outputs['bundle']) ? outputs['bundle'] : null;
  const bundleResult = bundle && isObjectRecord(bundle['result']) ? bundle['result'] : null;
  const topLevelResult = isObjectRecord(outputs['result']) ? outputs['result'] : null;

  const candidates = [
    bundleResult?.['runtimePosture'],
    bundle?.['runtimePosture'],
    outputs['runtimePosture'],
    topLevelResult?.['runtimePosture'],
  ];

  for (const candidate of candidates) {
    if (isObjectRecord(candidate)) {
      return candidate;
    }
  }

  return null;
};

const buildPlaywrightRuntimePostureSummary = (params: {
  nodeId: string;
  nodeTitle?: string | null;
  nodeType?: string | null;
  outputs: Record<string, unknown>;
}): PlaywrightRuntimePostureSummary | null => {
  const { nodeId, nodeTitle = null, nodeType = null, outputs } = params;
  const runtimePosture = getRuntimePostureCandidate(outputs);
  if (!runtimePosture) {
    return null;
  }

  const browser = isObjectRecord(runtimePosture['browser']) ? runtimePosture['browser'] : null;
  const antiDetection = isObjectRecord(runtimePosture['antiDetection'])
    ? runtimePosture['antiDetection']
    : null;
  const proxy = antiDetection && isObjectRecord(antiDetection['proxy']) ? antiDetection['proxy'] : null;
  const stickyStorageState =
    antiDetection && isObjectRecord(antiDetection['stickyStorageState'])
      ? antiDetection['stickyStorageState']
      : null;

  const summary: PlaywrightRuntimePostureSummary = {
    nodeId,
    nodeTitle,
    nodeType,
    browserLabel: hasText(String(browser?.['label'] ?? '')) ? String(browser?.['label']).trim() : null,
    browserEngine: hasText(String(browser?.['engine'] ?? '')) ? String(browser?.['engine']).trim() : null,
    headless: toOptionalBoolean(browser?.['headless']),
    identityProfile: hasText(String(antiDetection?.['identityProfile'] ?? ''))
      ? String(antiDetection?.['identityProfile']).trim()
      : null,
    locale: hasText(String(antiDetection?.['locale'] ?? ''))
      ? String(antiDetection?.['locale']).trim()
      : null,
    timezoneId: hasText(String(antiDetection?.['timezoneId'] ?? ''))
      ? String(antiDetection?.['timezoneId']).trim()
      : null,
    proxyEnabled: toOptionalBoolean(proxy?.['enabled']),
    proxyProviderPreset: hasText(String(proxy?.['providerPreset'] ?? ''))
      ? String(proxy?.['providerPreset']).trim()
      : null,
    proxySessionMode: hasText(String(proxy?.['sessionMode'] ?? ''))
      ? String(proxy?.['sessionMode']).trim()
      : null,
    proxyReason: hasText(String(proxy?.['reason'] ?? ''))
      ? String(proxy?.['reason']).trim()
      : null,
    proxyServerHost: hasText(String(proxy?.['serverHost'] ?? ''))
      ? String(proxy?.['serverHost']).trim()
      : null,
    stickyStorageEnabled: toOptionalBoolean(stickyStorageState?.['enabled']),
    stickyStorageLoaded: toOptionalBoolean(stickyStorageState?.['loaded']),
  };

  return Object.values(summary).some((value) => value !== null && value !== '') ? summary : null;
};

export const resolvePlaywrightArtifactDisplayName = (
  artifact: Pick<PlaywrightArtifactLink, 'name' | 'path'>
): string =>
  isRuntimePostureArtifactName(artifact.name) || isRuntimePostureArtifactName(artifact.path)
    ? 'Runtime posture'
    : artifact.name;

export const extractPlaywrightArtifactsFromNode = (
  node: AiPathRunNodeRecord
): PlaywrightArtifactLink[] => {
  if (!isObjectRecord(node.outputs)) return [];
  const outputs = node.outputs;
  const candidates = getArtifactCandidates(outputs);
  return candidates.flatMap((artifact, index) => {
    const pathValue = typeof artifact['path'] === 'string' ? artifact['path'].trim() : '';
    if (!pathValue) return [];
    const explicitUrl =
      typeof artifact['url'] === 'string' && artifact['url'].trim().length > 0
        ? artifact['url'].trim()
        : null;
    const nameValue =
      typeof artifact['name'] === 'string' && artifact['name'].trim().length > 0
        ? artifact['name'].trim()
        : `artifact-${index + 1}`;
    return [
      {
        nodeId: node.nodeId,
        nodeTitle: node.nodeTitle ?? null,
        nodeType: node.nodeType ?? null,
        name: nameValue,
        path: pathValue,
        url: explicitUrl ?? normalizeArtifactUrlFromPath(pathValue),
        mimeType: typeof artifact['mimeType'] === 'string' ? artifact['mimeType'] : null,
        kind: typeof artifact['kind'] === 'string' ? artifact['kind'] : null,
      },
    ];
  });
};

export const collectPlaywrightArtifacts = (
  nodes: AiPathRunNodeRecord[]
): PlaywrightArtifactLink[] => nodes.flatMap((node) => extractPlaywrightArtifactsFromNode(node));

export const extractPlaywrightRuntimePostureFromNode = (
  node: AiPathRunNodeRecord
): PlaywrightRuntimePostureSummary | null => {
  if (!isObjectRecord(node.outputs)) {
    return null;
  }

  return buildPlaywrightRuntimePostureSummary({
    nodeId: node.nodeId,
    nodeTitle: node.nodeTitle ?? null,
    nodeType: node.nodeType ?? null,
    outputs: node.outputs,
  });
};

export const collectPlaywrightRuntimePostures = (
  nodes: AiPathRunNodeRecord[]
): PlaywrightRuntimePostureSummary[] =>
  nodes
    .map((node) => extractPlaywrightRuntimePostureFromNode(node))
    .filter((entry): entry is PlaywrightRuntimePostureSummary => Boolean(entry));

export const collectPlaywrightRuntimePosturesFromRun = (
  run: Pick<AiPathRunRecord, 'graph' | 'runtimeState'>
): PlaywrightRuntimePostureSummary[] => {
  const runtimeState = isObjectRecord(run.runtimeState) ? run.runtimeState : null;
  const runtimeOutputs = runtimeState && isObjectRecord(runtimeState['outputs']) ? runtimeState['outputs'] : null;
  if (!runtimeOutputs) {
    return [];
  }

  const nodeMetaById = new Map<
    string,
    {
      title: string | null;
      type: string | null;
    }
  >();

  if (run.graph && Array.isArray(run.graph.nodes)) {
    run.graph.nodes.forEach((node) => {
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        return;
      }
      const nodeId = hasText(String((node as Record<string, unknown>)['id'] ?? ''))
        ? String((node as Record<string, unknown>)['id']).trim()
        : null;
      if (!nodeId) {
        return;
      }
      const nodeTitle = hasText(String((node as Record<string, unknown>)['title'] ?? ''))
        ? String((node as Record<string, unknown>)['title']).trim()
        : null;
      const nodeType = hasText(String((node as Record<string, unknown>)['type'] ?? ''))
        ? String((node as Record<string, unknown>)['type']).trim()
        : null;
      nodeMetaById.set(nodeId, { title: nodeTitle, type: nodeType });
    });
  }

  return Object.entries(runtimeOutputs)
    .map(([nodeId, outputValue]) => {
      if (!isObjectRecord(outputValue)) {
        return null;
      }
      const nodeMeta = nodeMetaById.get(nodeId);
      return buildPlaywrightRuntimePostureSummary({
        nodeId,
        nodeTitle: nodeMeta?.title ?? null,
        nodeType: nodeMeta?.type ?? null,
        outputs: outputValue,
      });
    })
    .filter((entry): entry is PlaywrightRuntimePostureSummary => Boolean(entry));
};

export const formatPlaywrightRuntimePostureBrowser = (
  runtimePosture: PlaywrightRuntimePostureSummary
): string | null => {
  const parts = [
    runtimePosture.browserLabel ?? formatLabel(runtimePosture.browserEngine) ?? null,
    runtimePosture.headless === null ? null : runtimePosture.headless ? 'Headless' : 'Headed',
  ].filter((value): value is string => hasText(value));

  return parts.length > 0 ? parts.join(' · ') : null;
};

export const formatPlaywrightRuntimePostureIdentity = (
  runtimePosture: PlaywrightRuntimePostureSummary
): string | null => {
  const parts = [
    runtimePosture.identityProfile ? `${formatLabel(runtimePosture.identityProfile)} profile` : null,
    runtimePosture.locale,
    runtimePosture.timezoneId,
  ].filter((value): value is string => hasText(value));

  return parts.length > 0 ? parts.join(' · ') : null;
};

export const formatPlaywrightRuntimePostureProxy = (
  runtimePosture: PlaywrightRuntimePostureSummary
): string | null => {
  if (runtimePosture.proxyEnabled === false) {
    return 'Disabled';
  }

  const parts = [
    formatLabel(runtimePosture.proxyProviderPreset),
    formatLabel(runtimePosture.proxySessionMode),
    formatLabel(runtimePosture.proxyReason),
    runtimePosture.proxyServerHost,
  ].filter((value): value is string => hasText(value));

  if (parts.length === 0) {
    return runtimePosture.proxyEnabled === true ? 'Enabled' : null;
  }

  return parts.join(' · ');
};

export const formatPlaywrightRuntimePostureStickyState = (
  runtimePosture: PlaywrightRuntimePostureSummary
): string | null => {
  if (runtimePosture.stickyStorageEnabled === false) {
    return 'Disabled';
  }
  if (runtimePosture.stickyStorageEnabled !== true) {
    return null;
  }
  return runtimePosture.stickyStorageLoaded ? 'Loaded sticky state' : 'Cold sticky state';
};
