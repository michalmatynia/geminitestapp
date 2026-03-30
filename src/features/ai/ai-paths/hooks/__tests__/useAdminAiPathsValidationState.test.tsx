/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, AiPathsValidationRule, PathConfig } from '@/shared/contracts/ai-paths';
import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY } from '@/shared/lib/ai-paths/core/constants';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

import { useAdminAiPathsValidationState } from '../useAdminAiPathsValidationState';

const mocks = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  useAiPathsSettingsQueryMock: vi.fn(),
  updateAiPathsSettingsBulkMock: vi.fn(async () => []),
  toastMock: vi.fn(),
  logClientErrorMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: mocks.useSearchParamsMock,
}));

vi.mock('@/shared/lib/ai-paths/hooks/useAiPathQueries', () => ({
  useAiPathsSettingsQuery: mocks.useAiPathsSettingsQueryMock,
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/settings-store-client')
  >('@/shared/lib/ai-paths/settings-store-client');
  return {
    ...actual,
    updateAiPathsSettingsBulk: mocks.updateAiPathsSettingsBulkMock,
  };
});

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: mocks.logClientErrorMock,
}));

const timestamp = '2026-03-09T10:00:00.000Z';

const buildLegacyTriggerConfig = (pathId: string) => {
  const config = createDefaultPathConfig(pathId);
  const seedNode = config.nodes[0] as AiNode | undefined;
  if (!seedNode) {
    throw new Error('Expected default path fixture to include at least one node.');
  }
  config.nodes = [
    {
      ...seedNode,
      type: 'trigger',
      title: 'Trigger: Opis i Tytuł',
      inputs: ['context'],
      outputs: ['trigger', 'context', 'entityId', 'entityType'],
      config: {
        trigger: {
          event: 'manual',
          contextMode: 'simulation_preferred',
        },
      },
    },
  ];
  config.edges = [];
  return config;
};

const buildRule = (overrides: Partial<AiPathsValidationRule> = {}): AiPathsValidationRule => ({
  id: overrides.id ?? 'rule-1',
  title: overrides.title ?? 'Rule 1',
  description: overrides.description ?? 'Rule description',
  enabled: overrides.enabled ?? true,
  severity: overrides.severity ?? 'error',
  module: overrides.module ?? 'custom',
  conditions: overrides.conditions ?? [
    {
      id: `${overrides.id ?? 'rule-1'}-condition`,
      operator: 'node_ids_unique',
    },
  ],
  ...overrides,
});

const buildConfig = (
  pathId: string,
  overrides: Partial<PathConfig> & { aiPathsValidation?: PathConfig['aiPathsValidation'] } = {}
): PathConfig => ({
  ...createDefaultPathConfig(pathId),
  updatedAt: timestamp,
  ...overrides,
});

const buildSettings = (...configs: PathConfig[]) => [
  {
    key: PATH_INDEX_KEY,
    value: JSON.stringify(
      configs.map((config: PathConfig) => ({
        id: config.id,
        name: config.name,
        createdAt: timestamp,
        updatedAt: timestamp,
      }))
    ),
  },
  ...configs.map((config: PathConfig) => ({
    key: `${PATH_CONFIG_PREFIX}${config.id}`,
    value: JSON.stringify(config),
  })),
];

describe('useAdminAiPathsValidationState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams(''));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists repaired legacy trigger configs back to settings', async () => {
    const config = buildLegacyTriggerConfig('path_validation_legacy_trigger');
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
    });

    const { rerender } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(mocks.updateAiPathsSettingsBulkMock).toHaveBeenCalledTimes(1);
    });

    const repairedRecords = mocks.updateAiPathsSettingsBulkMock.mock.calls[0]?.[0];
    expect(repairedRecords).toHaveLength(1);
    expect(repairedRecords?.[0]?.key).toBe(`${PATH_CONFIG_PREFIX}${config.id}`);
    expect(JSON.parse(repairedRecords?.[0]?.value ?? '{}')).toMatchObject({
      id: config.id,
      nodes: [
        {
          config: {
            trigger: {
              contextMode: 'trigger_only',
            },
          },
        },
      ],
    });

    rerender();

    await waitFor(() => {
      expect(mocks.updateAiPathsSettingsBulkMock).toHaveBeenCalledTimes(1);
    });
  });

  it('does not persist settings when no legacy trigger repair is needed', async () => {
    const config = createDefaultPathConfig('path_validation_clean');
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
    });

    renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(mocks.updateAiPathsSettingsBulkMock).not.toHaveBeenCalled();
    });
  });

  it('surfaces settings parse errors only once for the same invalid payload', async () => {
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: [
        {
          key: `${PATH_CONFIG_PREFIX}broken-path`,
          value: '{',
        },
      ],
    });

    const { result, rerender } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(result.current.settingsParseError).toBeInstanceOf(Error);
    });

    expect(mocks.toastMock).toHaveBeenCalledWith(
      'Invalid AI Paths validation path config JSON payload.',
      { variant: 'error' }
    );

    rerender();

    await waitFor(() => {
      expect(mocks.toastMock).toHaveBeenCalledTimes(1);
    });
  });

  it('selects the requested path and filters visible rules by the focused node type', async () => {
    const parserRule = buildRule({
      id: 'rule-parser',
      title: 'Parser Rule',
      sequence: 1,
      appliesToNodeTypes: ['parser'],
    });
    const modelRule = buildRule({
      id: 'rule-model',
      title: 'Model Rule',
      sequence: 2,
      appliesToNodeTypes: ['model'],
    });
    const globalRule = buildRule({
      id: 'rule-global',
      title: 'Global Rule',
      sequence: 3,
    });
    const alphaConfig = buildConfig('path-alpha', {
      name: 'Alpha Path',
    });
    const targetConfig = buildConfig('path-target', {
      name: 'Zulu Path',
      aiPathsValidation: {
        rules: [globalRule, parserRule, modelRule],
      },
    });

    mocks.useSearchParamsMock.mockReturnValue(
      new URLSearchParams('pathId=path-target&focusNodeType=model')
    );
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(alphaConfig, targetConfig),
    });

    const { result } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(result.current.selectedPathId).toBe('path-target');
    });

    expect(result.current.filteredRules.map((rule: AiPathsValidationRule) => rule.id)).toEqual([
      'rule-model',
      'rule-global',
    ]);
  });

  it('filters inferred candidates by module and tag, then tracks reject/approve state changes', async () => {
    const existingRule = buildRule({
      id: 'central-existing',
      title: 'Existing Rule',
      module: 'model',
      inference: {
        sourceType: 'central_docs',
        status: 'approved',
        assertionId: 'assertion-shared',
        sourceHash: 'hash-old',
        tags: ['catalog'],
      },
    });
    const candidateNew = buildRule({
      id: 'candidate-new',
      title: 'Candidate New',
      module: 'parser',
      inference: {
        sourceType: 'central_docs',
        status: 'candidate',
        assertionId: 'assertion-new',
        sourceHash: 'hash-new',
        tags: ['catalog'],
      },
    });
    const candidateChanged = buildRule({
      id: 'candidate-changed',
      title: 'Candidate Changed',
      module: 'custom',
      inference: {
        sourceType: 'central_docs',
        status: 'candidate',
        assertionId: 'assertion-shared',
        sourceHash: 'hash-updated',
        tags: ['catalog', 'review'],
      },
    });
    const candidateRejected = buildRule({
      id: 'candidate-rejected',
      title: 'Candidate Rejected',
      enabled: false,
      module: 'custom',
      inference: {
        sourceType: 'central_docs',
        status: 'rejected',
        assertionId: 'assertion-rejected',
        sourceHash: 'hash-rejected',
        tags: ['archived'],
      },
    });
    const config = buildConfig('path-candidates', {
      name: 'Candidates Path',
      aiPathsValidation: {
        rules: [existingRule],
        inferredCandidates: [candidateNew, candidateChanged, candidateRejected],
        docsSyncState: {
          candidateCount: 2,
        },
      },
    });

    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('pathId=path-candidates'));
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
    });

    const { result } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(result.current.candidateRules).toHaveLength(2);
    });

    expect(result.current.candidateModuleOptions.map((option) => option.value)).toContain('custom');
    expect(result.current.candidateTagOptions.map((option) => option.value)).toContain('catalog');

    act(() => {
      result.current.setCandidateModuleFilter('custom');
      result.current.setCandidateTagFilter('catalog');
    });

    await waitFor(() => {
      expect(
        result.current.candidateRules.map((rule: AiPathsValidationRule) => rule.id)
      ).toEqual(['candidate-changed']);
    });

    expect(result.current.candidateChangeStats).toEqual({ new: 0, changed: 1, existing: 0 });

    act(() => {
      result.current.setCandidateModuleFilter('all');
      result.current.setCandidateTagFilter('all');
      result.current.handleRejectCandidate('candidate-new');
    });

    await waitFor(() => {
      expect(
        result.current.rejectedCandidates.map((rule: AiPathsValidationRule) => rule.id)
      ).toContain('candidate-new');
    });

    expect(result.current.validationDraft.docsSyncState?.candidateCount).toBe(1);

    act(() => {
      result.current.handleApproveCandidate('candidate-changed');
    });

    await waitFor(() => {
      expect(result.current.validationDraft.docsSyncState?.candidateCount).toBe(0);
    });

    expect(
      result.current.validationDraft.rules?.some(
        (rule: AiPathsValidationRule) =>
          rule.id === 'candidate-changed' && rule.inference?.status === 'approved'
      )
    ).toBe(true);
    expect(
      result.current.inferredCandidates.map((rule: AiPathsValidationRule) => rule.id)
    ).not.toContain('candidate-changed');
  });

  it('saves the selected path validation draft back to settings', async () => {
    const settingsRefetchMock = vi.fn(async () => undefined);
    const savedRule = buildRule({
      id: 'rule-save',
      title: 'Save Rule',
      module: 'database',
    });
    const config = buildConfig('path-save', {
      name: 'Save Path',
      aiPathsValidation: {
        docsSources: ['docs/original'],
        collectionMap: { product: 'products' },
        rules: [savedRule],
      },
    });

    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('pathId=path-save'));
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
      refetch: settingsRefetchMock,
    });

    const { result } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(result.current.selectedPathId).toBe('path-save');
    });

    act(() => {
      result.current.setDocsSourcesDraft('docs/one\ndocs/two');
      result.current.setCollectionMapDraft('product:catalog');
      result.current.setRulesDraft(JSON.stringify([savedRule], null, 2));
    });

    await waitFor(() => {
      expect(result.current.docsSourcesDraft).toBe('docs/one\ndocs/two');
    });

    await act(async () => {
      await result.current.handleSave();
    });

    await waitFor(() => {
      expect(mocks.updateAiPathsSettingsBulkMock).toHaveBeenCalledTimes(1);
    });

    const savedRecords = mocks.updateAiPathsSettingsBulkMock.mock.calls[0]?.[0];
    const pathRecord = savedRecords?.find(
      (record: { key: string; value: string }) => record.key === `${PATH_CONFIG_PREFIX}path-save`
    );

    expect(pathRecord).toBeDefined();

    const savedConfig = JSON.parse(pathRecord?.value ?? '{}') as PathConfig;
    expect(savedConfig.aiPathsValidation?.docsSources).toEqual(['docs/one', 'docs/two']);
    expect(savedConfig.aiPathsValidation?.collectionMap).toEqual({ product: 'catalog' });
    expect(savedConfig.aiPathsValidation?.rules).toHaveLength(1);
    expect(savedConfig.aiPathsValidation?.lastEvaluatedAt).toEqual(expect.any(String));
    expect(settingsRefetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.toastMock).toHaveBeenCalledWith('AI-Paths Node Validator settings saved.', {
      variant: 'success',
    });
  });

  it('applies docs sources, collection maps, and rule drafts through the draft helpers', async () => {
    const editableRule = buildRule({
      id: 'rule-edit',
      title: 'Editable Rule',
      enabled: true,
      sequence: 2,
      appliesToStages: ['graph_parse'],
    });
    const config = buildConfig('path-edit', {
      name: 'Editable Path',
      aiPathsValidation: {
        docsSources: ['docs/original'],
        collectionMap: { product: 'products' },
        rules: [editableRule],
      },
    });

    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('pathId=path-edit'));
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
      refetch: vi.fn(async () => undefined),
    });

    const { result } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(result.current.selectedPathId).toBe('path-edit');
    });

    act(() => {
      result.current.setDocsSourcesDraft('docs/alpha\ndocs/alpha\ninvalid,entry');
      result.current.setCollectionMapDraft('product:catalog\nbroken\norder:orders');
      result.current.setRulesDraft('{');
    });

    act(() => {
      expect(result.current.handleApplyRulesDraft()).toBe(false);
    });

    expect(result.current.rulesDraftError).toBe('Invalid validation rules JSON.');
    expect(mocks.toastMock).toHaveBeenCalledWith('Invalid validation rules JSON.', {
      variant: 'error',
    });

    act(() => {
      result.current.handleApplyDocsSources();
    });

    expect(result.current.docsSourcesDraft).toBe('docs/alpha');
    expect(result.current.validationDraft.docsSources).toEqual(['docs/alpha']);
    expect(result.current.isDirty).toBe(true);
    expect(mocks.toastMock).toHaveBeenCalledWith('Docs sources applied to AI-Paths validator.', {
      variant: 'success',
    });

    act(() => {
      result.current.handleApplyCollectionMap();
    });

    expect(result.current.collectionMapDraft).toBe('order:orders\nproduct:catalog');
    expect(result.current.validationDraft.collectionMap).toEqual({
      order: 'orders',
      product: 'catalog',
    });
    expect(mocks.toastMock).toHaveBeenCalledWith('Entity-to-collection map applied.', {
      variant: 'success',
    });

    act(() => {
      result.current.setRulesDraft(
        JSON.stringify(
          [
            buildRule({
              id: 'rule-edit',
              title: 'Editable Rule',
              enabled: false,
              sequence: 5,
              appliesToStages: ['node_pre_execute'],
            }),
          ],
          null,
          2
        )
      );
    });

    act(() => {
      expect(result.current.handleApplyRulesDraft()).toBe(true);
    });

    expect(result.current.validationDraft.rules?.[0]).toMatchObject({
      id: 'rule-edit',
      enabled: false,
      sequence: 5,
      appliesToStages: ['node_pre_execute'],
    });
    expect(mocks.toastMock).toHaveBeenCalledWith('Applied 1 validation rules.', {
      variant: 'success',
    });

    act(() => {
      result.current.handleToggleRuleEnabled('rule-edit');
    });

    expect(result.current.validationDraft.rules?.[0]?.enabled).toBe(true);

    act(() => {
      result.current.handleRuleSequenceBlur('rule-edit', 'not-a-number');
    });

    expect(result.current.validationDraft.rules?.[0]?.sequence).toBe(5);

    act(() => {
      result.current.handleRuleSequenceBlur('rule-edit', '9');
    });

    expect(result.current.validationDraft.rules?.[0]?.sequence).toBe(9);

    act(() => {
      result.current.handleRuleStageToggle('rule-edit', 'graph_bind', true);
    });

    expect(result.current.validationDraft.rules?.[0]?.appliesToStages).toEqual([
      'graph_bind',
      'node_pre_execute',
    ]);

    act(() => {
      result.current.handleRuleStageToggle('rule-edit', 'node_pre_execute', false);
    });

    expect(result.current.validationDraft.rules?.[0]?.appliesToStages).toEqual(['graph_bind']);

    act(() => {
      result.current.handleResetToDefaults();
    });

    expect(result.current.rulesDraftError).toBeNull();
    expect(result.current.validationDraft.rules).toEqual(expect.any(Array));
    expect(mocks.toastMock).toHaveBeenCalledWith(
      'Reset draft to default AI-Paths validator profile.',
      { variant: 'info' }
    );
  });

  it('syncs central docs, preserves rejections, and marks stale central rules for review', async () => {
    const existingRule = buildRule({
      id: 'central-existing',
      title: 'Existing Rule',
      module: 'custom',
      inference: {
        sourceType: 'central_docs',
        status: 'approved',
        assertionId: 'assertion-shared',
        sourceHash: 'hash-old',
      },
    });
    const deprecatedRule = buildRule({
      id: 'central-deprecated',
      title: 'Deprecated Rule',
      module: 'custom',
      inference: {
        sourceType: 'central_docs',
        status: 'approved',
        assertionId: 'assertion-deprecated',
        sourceHash: 'hash-deprecated',
      },
    });
    const missingRule = buildRule({
      id: 'central-missing',
      title: 'Missing Rule',
      module: 'custom',
      inference: {
        sourceType: 'central_docs',
        status: 'approved',
        assertionId: 'assertion-missing',
        sourceHash: 'hash-missing',
      },
    });
    const previouslyRejected = buildRule({
      id: 'candidate-local-rejected',
      title: 'Previously Rejected',
      enabled: false,
      module: 'custom',
      inference: {
        sourceType: 'central_docs',
        status: 'rejected',
        assertionId: 'assertion-rejected',
        sourceHash: 'hash-rejected-local',
      },
    });
    const config = buildConfig('path-sync', {
      name: 'Sync Path',
      aiPathsValidation: {
        rules: [existingRule, deprecatedRule, missingRule],
        inferredCandidates: [previouslyRejected],
        docsSyncState: {
          candidateCount: 1,
        },
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          snapshot: {
            generatedAt: '2026-03-12T10:00:00.000Z',
            snapshotHash: 'snapshot-1',
            warnings: ['Upstream warning'],
            sources: [
              {
                id: 'central-1',
                path: 'docs/central/rules.md',
                type: 'markdown',
                hash: 'hash-doc-1',
                assertionCount: 3,
              },
            ],
          },
          inferredCandidates: [
            buildRule({
              id: 'candidate-changed',
              title: 'Changed Candidate',
              module: 'custom',
              inference: {
                sourceType: 'central_docs',
                status: 'candidate',
                assertionId: 'assertion-shared',
                sourceHash: 'hash-new',
                tags: ['catalog'],
              },
            }),
            buildRule({
              id: 'candidate-fresh',
              title: 'Fresh Candidate',
              module: 'parser',
              inference: {
                sourceType: 'central_docs',
                status: 'candidate',
                assertionId: 'assertion-fresh',
                sourceHash: 'hash-fresh',
                deprecates: ['assertion-deprecated'],
                tags: ['review'],
              },
            }),
            buildRule({
              id: 'candidate-rejected-from-snapshot',
              title: 'Rejected Candidate',
              module: 'custom',
              inference: {
                sourceType: 'central_docs',
                status: 'candidate',
                assertionId: 'assertion-rejected',
                sourceHash: 'hash-rejected-upstream',
              },
            }),
          ],
        }),
      }))
    );

    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('pathId=path-sync'));
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
      refetch: vi.fn(async () => undefined),
    });

    const { result } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(result.current.selectedPathId).toBe('path-sync');
    });

    await act(async () => {
      await result.current.handleSyncFromCentralDocs();
    });

    expect(result.current.centralSnapshot).toMatchObject({
      snapshotHash: 'snapshot-1',
      generatedAt: '2026-03-12T10:00:00.000Z',
    });
    expect(result.current.validationDraft.docsSyncState).toMatchObject({
      lastSnapshotHash: 'snapshot-1',
      lastSyncedAt: '2026-03-12T10:00:00.000Z',
      lastSyncStatus: 'warning',
      sourceCount: 1,
      candidateCount: 2,
    });
    expect(result.current.syncWarnings).toEqual(
      expect.arrayContaining([
        'Upstream warning',
        'Rule "Deprecated Rule" is deprecated by central assertion "assertion-fresh".',
        'Rule "Existing Rule" changed in central docs and should be reviewed.',
        'Rule "Missing Rule" is no longer present in central docs snapshot.',
      ])
    );
    expect(
      result.current.validationDraft.rules?.find((rule: AiPathsValidationRule) => rule.id === 'central-deprecated')
    ).toMatchObject({
      enabled: false,
      inference: {
        status: 'deprecated',
        reviewNote: 'Deprecated by assertion assertion-fresh.',
      },
    });
    expect(
      result.current.rejectedCandidates.find(
        (rule: AiPathsValidationRule) => rule.id === 'candidate-rejected-from-snapshot'
      )
    ).toMatchObject({
      inference: {
        status: 'rejected',
      },
    });
    expect(mocks.toastMock).toHaveBeenCalledWith(
      'Synced 3 inferred validation candidates from central docs.',
      { variant: 'warning' }
    );
  });

  it('surfaces central docs sync failures in docsSyncState and toast output', async () => {
    const config = buildConfig('path-sync-error', {
      name: 'Sync Error Path',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
      }))
    );

    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('pathId=path-sync-error'));
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
      refetch: vi.fn(async () => undefined),
    });

    const { result } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(result.current.selectedPathId).toBe('path-sync-error');
    });

    await act(async () => {
      await result.current.handleSyncFromCentralDocs();
    });

    expect(result.current.validationDraft.docsSyncState).toMatchObject({
      lastSyncStatus: 'error',
      lastSyncWarnings: ['Central docs sync failed (503).'],
    });
    expect(mocks.logClientErrorMock).toHaveBeenCalled();
    expect(mocks.toastMock).toHaveBeenCalledWith('Central docs sync failed (503).', {
      variant: 'error',
    });
  });

  it('approves all currently visible inferred candidates', async () => {
    const visibleCandidate = buildRule({
      id: 'candidate-visible',
      title: 'Visible Candidate',
      module: 'parser',
      inference: {
        sourceType: 'central_docs',
        status: 'candidate',
        assertionId: 'assertion-visible',
      },
    });
    const hiddenCandidate = buildRule({
      id: 'candidate-hidden',
      title: 'Hidden Candidate',
      module: 'model',
      inference: {
        sourceType: 'central_docs',
        status: 'candidate',
        assertionId: 'assertion-hidden',
      },
    });
    const config = buildConfig('path-approve-all', {
      name: 'Approve All Path',
      aiPathsValidation: {
        inferredCandidates: [visibleCandidate, hiddenCandidate],
        docsSyncState: {
          candidateCount: 2,
        },
      },
    });

    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('pathId=path-approve-all'));
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
      refetch: vi.fn(async () => undefined),
    });

    const { result } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(result.current.candidateRules).toHaveLength(2);
    });

    act(() => {
      result.current.setCandidateModuleFilter('parser');
    });

    await waitFor(() => {
      expect(result.current.candidateRules.map((rule: AiPathsValidationRule) => rule.id)).toEqual([
        'candidate-visible',
      ]);
    });

    act(() => {
      result.current.handleApproveAllCandidates();
    });

    expect(
      result.current.validationDraft.rules?.some(
        (rule: AiPathsValidationRule) =>
          rule.id === 'candidate-visible' && rule.inference?.status === 'approved'
      )
    ).toBe(true);
    expect(
      result.current.inferredCandidates.map((rule: AiPathsValidationRule) => rule.id)
    ).toEqual(['candidate-hidden']);
    expect(result.current.validationDraft.docsSyncState?.candidateCount).toBe(0);
    expect(mocks.toastMock).toHaveBeenCalledWith('Approved 1 visible inferred rules.', {
      variant: 'success',
    });
  });

  it('blocks save on invalid rules JSON and surfaces persistence failures', async () => {
    const config = buildConfig('path-save-error', {
      name: 'Save Error Path',
      aiPathsValidation: {
        rules: [buildRule({ id: 'rule-save-error' })],
      },
    });

    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('pathId=path-save-error'));
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
      refetch: vi.fn(async () => undefined),
    });

    const { result } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(result.current.selectedPathId).toBe('path-save-error');
    });

    act(() => {
      result.current.setRulesDraft('{');
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.rulesDraftError).toBe('Invalid validation rules JSON.');
    expect(mocks.updateAiPathsSettingsBulkMock).not.toHaveBeenCalled();
    expect(mocks.toastMock).toHaveBeenCalledWith('Invalid validation rules JSON.', {
      variant: 'error',
    });

    act(() => {
      result.current.setRulesDraft(
        JSON.stringify([buildRule({ id: 'rule-save-error', title: 'Recovered Rule' })], null, 2)
      );
    });
    mocks.updateAiPathsSettingsBulkMock.mockRejectedValueOnce(new Error('write failed'));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mocks.logClientErrorMock).toHaveBeenCalledWith(expect.any(Error));
    expect(mocks.toastMock).toHaveBeenCalledWith('write failed', {
      variant: 'error',
    });
    expect(result.current.saving).toBe(false);
  });
});
