import type { AiPathRunNodeRecord } from '@/shared/contracts/ai-paths';

export type PlaywrightArtifactLink = {
  nodeId: string;
  nodeTitle: string | null;
  nodeType: string | null;
  name: string;
  path: string;
  url: string | null;
  mimeType: string | null;
  kind: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

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
  Array.isArray(value) ? value.filter(isRecord) : [];

const getArtifactCandidates = (
  outputs: Record<string, unknown>
): Array<Record<string, unknown>> => {
  const fromBundle = isRecord(outputs['bundle'])
    ? readArtifactsArray(outputs['bundle']['artifacts'])
    : [];
  const fromTopLevel = readArtifactsArray(outputs['artifacts']);
  return [...fromBundle, ...fromTopLevel];
};

export const extractPlaywrightArtifactsFromNode = (
  node: AiPathRunNodeRecord
): PlaywrightArtifactLink[] => {
  if (!isRecord(node.outputs)) return [];
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
