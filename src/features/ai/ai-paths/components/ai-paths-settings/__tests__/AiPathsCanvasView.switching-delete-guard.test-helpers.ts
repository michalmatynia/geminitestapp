import { vi } from 'vitest';

const BASE_CASE_DATE = '2026-03-05';
const BASE_PATH_UPDATED_AT = '2026-03-05T10:00:00.000Z';

const BASE_VALIDATION_PREFLIGHT_REPORT = {
  score: 100,
  failedRules: 0,
  blocked: false,
  shouldWarn: false,
  findings: [],
  recommendations: [],
  schemaVersion: 1,
  skippedRuleIds: [],
  moduleImpact: {},
};

export const buildCanvasPathSummary = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 'path-main',
  name: 'Path Main',
  createdAt: BASE_CASE_DATE,
  updatedAt: BASE_CASE_DATE,
  ...overrides,
});

export const buildCanvasPathDraft = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 'path-main',
  extensions: {},
  ...overrides,
});

export const buildCanvasPersistedPathConfig = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 'path-main',
  name: 'Path Main',
  description: '',
  trigger: 'manual',
  version: 1,
  updatedAt: BASE_PATH_UPDATED_AT,
  nodes: [],
  edges: [],
  extensions: {},
  ...overrides,
});

export const buildCanvasPageContext = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  activeTab: 'canvas',
  isFocusMode: false,
  renderActions: (actions: unknown) => actions,
  confirmNodeSwitch: async () => true,
  savePathConfig: vi.fn(async () => true),
  saving: false,
  setPathSettingsModalOpen: vi.fn(),
  activePathId: 'path-main',
  nodeValidationEnabled: true,
  updateAiPathsValidation: vi.fn(),
  validationPreflightReport: BASE_VALIDATION_PREFLIGHT_REPORT,
  handleOpenNodeValidator: vi.fn(),
  docsTooltipsEnabled: true,
  setDocsTooltipsEnabled: vi.fn(),
  handleTogglePathLock: vi.fn(),
  isPathLocked: false,
  handleRunNodeValidationCheck: vi.fn(),
  toast: vi.fn(),
  autoSaveLabel: '',
  autoSaveVariant: 'neutral',
  lastRunAt: null,
  isPathNameEditing: false,
  renameDraft: '',
  setRenameDraft: vi.fn(),
  commitPathNameEdit: vi.fn(),
  cancelPathNameEdit: vi.fn(),
  startPathNameEdit: vi.fn(),
  pathName: 'Path Main',
  pathSwitchOptions: [{ label: 'Path Main', value: 'path-main' }],
  handleSwitchPath: vi.fn(),
  isPathTreeVisible: true,
  setIsPathTreeVisible: vi.fn(),
  isPathSwitching: false,
  lastError: null,
  persistLastError: vi.fn(async () => undefined),
  incrementLoadNonce: vi.fn(),
  handleClearConnectorData: vi.fn(async () => undefined),
  handleClearHistory: vi.fn(async () => undefined),
  handleDeleteSelectedNode: vi.fn(),
  isPathActive: true,
  handleTogglePathActive: vi.fn(),
  hasHistory: false,
  selectionScopeMode: 'portion',
  setSelectionScopeMode: vi.fn(),
  dataContractReport: { byNodeId: {} },
  setDataContractInspectorNodeId: vi.fn(),
  paths: [buildCanvasPathSummary()],
  pathConfigs: {
    'path-main': buildCanvasPathDraft(),
  },
  persistPathSettings: vi.fn(async () => undefined),
  ...overrides,
});
