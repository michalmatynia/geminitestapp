import { CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS, CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS, CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS, CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS } from '@/shared/contracts/case-resolver/constants';
import { type AiNode } from '@/shared/contracts/case-resolver';

type GraphPayload = {
  nodes: unknown[];
  edges: unknown[];
  nodeMeta: Record<string, unknown>;
  edgeMeta: Record<string, unknown>;
  [key: string]: unknown;
};

type WorkspaceFilePayload = {
  id: string;
  name: string;
  folder: string;
  graph: GraphPayload;
  [key: string]: unknown;
};

type WorkspaceAssetPayload = {
  id: string;
  name: string;
  folder: string;
  [key: string]: unknown;
};

type WorkspaceJsonPayload = {
  version?: number;
  workspaceRevision?: number;
  lastMutationId?: string | null;
  lastMutationAt?: string | null;
  folders?: string[];
  folderRecords?: Array<Record<string, unknown>>;
  files?: WorkspaceFilePayload[];
  assets?: WorkspaceAssetPayload[];
  activeFileId?: string | null;
};

export const createPromptNode = (id: string): AiNode => ({
  id,
  type: 'prompt',
  title: id,
  description: '',
  inputs: ['input'],
  outputs: ['output'],
  position: { x: 0, y: 0 },
  config: { prompt: { template: '' } },
  data: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

export const createCanonicalTextPromptNode = (
  id: string,
  role: 'text_note' | 'explanatory' = 'text_note'
): AiNode => ({
  ...createPromptNode(id),
  inputs:
    role === 'explanatory'
      ? [...CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS]
      : [...CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS],
  outputs:
    role === 'explanatory'
      ? [...CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS]
      : [...CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS],
});

export const createEmptyGraphPayload = (overrides: Partial<GraphPayload> = {}): GraphPayload => ({
  nodes: [],
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  ...overrides,
});

export const createWorkspaceFilePayload = (
  overrides: Partial<WorkspaceFilePayload> & Pick<WorkspaceFilePayload, 'id' | 'name'>
): WorkspaceFilePayload => ({
  id: overrides.id,
  name: overrides.name,
  folder: '',
  graph: createEmptyGraphPayload(),
  ...overrides,
});

export const createCaseFilePayload = (
  overrides: Partial<WorkspaceFilePayload> & Pick<WorkspaceFilePayload, 'id' | 'name'>
): WorkspaceFilePayload =>
  createWorkspaceFilePayload({
    fileType: 'case',
    parentCaseId: null,
    referenceCaseIds: [],
    ...overrides,
  });

export const createDocumentFilePayload = (
  overrides: Partial<WorkspaceFilePayload> & Pick<WorkspaceFilePayload, 'id' | 'name'>
): WorkspaceFilePayload =>
  createWorkspaceFilePayload({
    fileType: 'document',
    parentCaseId: null,
    referenceCaseIds: [],
    ...overrides,
  });

export const createScanFilePayload = (
  overrides: Partial<WorkspaceFilePayload> & Pick<WorkspaceFilePayload, 'id' | 'name'>
): WorkspaceFilePayload =>
  createWorkspaceFilePayload({
    fileType: 'scanfile',
    parentCaseId: null,
    referenceCaseIds: [],
    ...overrides,
  });

export const createWorkspaceAssetPayload = (
  overrides: Partial<WorkspaceAssetPayload> & Pick<WorkspaceAssetPayload, 'id' | 'name'>
): WorkspaceAssetPayload => ({
  id: overrides.id,
  name: overrides.name,
  folder: '',
  kind: 'file',
  ...overrides,
});

export const createWorkspaceJson = ({
  version = 2,
  workspaceRevision = 0,
  lastMutationId = null,
  lastMutationAt = null,
  folders = [],
  folderRecords,
  files = [],
  assets = [],
  activeFileId = null,
}: WorkspaceJsonPayload): string =>
  JSON.stringify({
    version,
    workspaceRevision,
    lastMutationId,
    lastMutationAt,
    folders,
    ...(folderRecords !== undefined ? { folderRecords } : {}),
    files,
    assets,
    activeFileId,
  });
