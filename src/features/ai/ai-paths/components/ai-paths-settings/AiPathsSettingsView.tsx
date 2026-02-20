'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAiPathRuntimeAnalytics } from '@/features/ai/ai-paths/hooks/useAiPathQueries';
import { useAiPathsDocsTooltips } from '@/features/ai/ai-paths/hooks/useAiPathsDocsTooltips';
import type {
  AiNode,
  AiPathsValidationCondition,
  AiPathsValidationConfig,
  AiPathsValidationModule,
  AiPathsValidationOperator,
  AiPathsValidationRule,
  AiPathsValidationSeverity,
} from '@/features/ai/ai-paths/lib';
import {
  buildAiPathsValidationRulesFromDocs,
  createAiPathsValidationConditionId,
  createAiPathsValidationRuleId,
  evaluateAiPathsValidationPreflight,
  inspectPathDependencies,
  normalizeAiPathsValidationConfig,
} from '@/features/ai/ai-paths/lib';
import {
  Button,
  SelectSimple,
  useToast,
  StatusBadge,
  LoadingState,
  type StatusVariant,
} from '@/shared/ui';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';

import { useAiPathsSettingsOrchestrator } from './AiPathsSettingsOrchestratorContext';
import { useAiPathsSettingsPageContext } from './AiPathsSettingsPageContext';
import { useAiPathsErrorReporting } from './useAiPathsErrorReporting';
import {
  useGraphActions,
  useGraphState,
  usePersistenceActions,
  usePersistenceState,
  useRuntimeActions,
  useRuntimeState,
  useSelectionActions,
  useSelectionState,
} from '../../context';
import { CanvasBoard } from '../canvas-board';
import { CanvasSidebar } from '../canvas-sidebar';
import { ClusterPresetsPanel } from '../cluster-presets-panel';
import { DocsTooltipEnhancer } from '../DocsTooltipEnhancer';
import { GraphModelDebugPanel } from '../graph-model-debug-panel';
import { NodeConfigDialog } from '../node-config-dialog';
import { PresetsDialog } from '../presets-dialog';
import { RunDetailDialog } from '../run-detail-dialog';
import { RunHistoryPanel } from '../run-history-panel';
import { RuntimeEventLogPanel } from '../runtime-event-log-panel';
import { SimulationDialog } from '../simulation-dialog';
import { DocsTabPanel, PathsTabPanel } from '../ui-panels';
import {
  EXECUTION_OPTIONS,
  FLOW_OPTIONS,
  RUN_MODE_OPTIONS,
  buildHistoryRetentionOptions,
  buildSwitchPathOptions,
  formatDurationMs,
  formatPercent,
  formatStatusLabel,
  sortPathMetas,
  statusToVariant,
} from './ai-paths-settings-view-utils';

type ValidationConditionDraft = {
  operator: AiPathsValidationOperator;
  field: string;
  valuePath: string;
  expected: string;
  list: string;
  flags: string;
  port: string;
  fromPort: string;
  toPort: string;
  fromNodeType: string;
  toNodeType: string;
  sourceNodeId: string;
  targetNodeId: string;
  negate: boolean;
};

type ValidationRuleDraft = {
  title: string;
  description: string;
  module: AiPathsValidationModule;
  severity: AiPathsValidationSeverity;
  conditionMode: 'all' | 'any';
  sequence: string;
  weight: string;
  forceProbabilityIfFailed: string;
  recommendation: string;
  appliesToNodeTypes: string;
  docsBindings: string;
};

const VALIDATION_SEVERITY_OPTIONS: Array<{ label: string; value: AiPathsValidationSeverity }> = [
  { label: 'Error', value: 'error' },
  { label: 'Warning', value: 'warning' },
  { label: 'Info', value: 'info' },
];

const VALIDATION_MODULE_OPTIONS: Array<{ label: string; value: AiPathsValidationModule }> = [
  { label: 'Graph', value: 'graph' },
  { label: 'Trigger', value: 'trigger' },
  { label: 'Simulation', value: 'simulation' },
  { label: 'Context', value: 'context' },
  { label: 'Parser', value: 'parser' },
  { label: 'Database', value: 'database' },
  { label: 'Model', value: 'model' },
  { label: 'Poll', value: 'poll' },
  { label: 'Router', value: 'router' },
  { label: 'Gate', value: 'gate' },
  { label: 'Validation Pattern', value: 'validation_pattern' },
  { label: 'Custom', value: 'custom' },
];

const VALIDATION_OPERATOR_OPTIONS: Array<{ label: string; value: AiPathsValidationOperator }> = [
  { label: 'Exists', value: 'exists' },
  { label: 'Non-empty', value: 'non_empty' },
  { label: 'Equals', value: 'equals' },
  { label: 'In list', value: 'in' },
  { label: 'Matches regex', value: 'matches_regex' },
  { label: 'JSONPath exists', value: 'jsonpath_exists' },
  { label: 'JSONPath equals', value: 'jsonpath_equals' },
  { label: 'Has incoming port', value: 'has_incoming_port' },
  { label: 'Has outgoing port', value: 'has_outgoing_port' },
  { label: 'Wired from', value: 'wired_from' },
  { label: 'Wired to', value: 'wired_to' },
  { label: 'Collection exists', value: 'collection_exists' },
  { label: 'Entity+collection resolves', value: 'entity_collection_resolves' },
  { label: 'Edge endpoints resolve', value: 'edge_endpoints_resolve' },
  { label: 'Edge ports declared', value: 'edge_ports_declared' },
  { label: 'Node types known', value: 'node_types_known' },
  { label: 'Node IDs unique', value: 'node_ids_unique' },
  { label: 'Edge IDs unique', value: 'edge_ids_unique' },
  { label: 'Node positions finite', value: 'node_positions_finite' },
];

const DEFAULT_CONDITION_DRAFT: ValidationConditionDraft = {
  operator: 'non_empty',
  field: '',
  valuePath: '',
  expected: '',
  list: '',
  flags: '',
  port: '',
  fromPort: '',
  toPort: '',
  fromNodeType: '',
  toNodeType: '',
  sourceNodeId: '',
  targetNodeId: '',
  negate: false,
};

const DEFAULT_RULE_DRAFT: ValidationRuleDraft = {
  title: '',
  description: '',
  module: 'custom',
  severity: 'warning',
  conditionMode: 'all',
  sequence: '',
  weight: '',
  forceProbabilityIfFailed: '',
  recommendation: '',
  appliesToNodeTypes: '',
  docsBindings: '',
};

const parseNumberInput = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseStringList = (value: string): string[] =>
  value
    .split(/[\n,|]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export function AiPathsSettingsView(): React.JSX.Element {
  type PathSettingsFormState = {
    saveMode: string;
    execution: string;
    flow: string;
    runMode: string;
    strictFlowMode: string;
    validationEngine: string;
    validationPolicy: string;
    validationThresholds: string;
    validationDocs: string;
    validationCollectionMap: string;
    validationRules: string;
    validationPreview: string;
    dependencyReport: string;
    history: string;
  };

  const {
    activeTab,
    renderActions,
    onTabChange,
    isFocusMode: isFocusModeProp,
    onFocusModeChange,
  } = useAiPathsSettingsPageContext();
  const state = useAiPathsSettingsOrchestrator();

  // Domain: Persistence — read from context
  const { loading, saving, autoSaveStatus, autoSaveAt } = usePersistenceState();
  const { incrementLoadNonce, savePathConfig } = usePersistenceActions();

  // Domain: Runtime — read from context
  const {
    runtimeState,
    lastRunAt,
    lastError,
    runtimeRunStatus,
    runtimeNodeStatuses,
    runtimeEvents,
  } = useRuntimeState();
  const { setLastError } = useRuntimeActions();

  // Domain: Graph — read from context (synced state only)
  const {
    activePathId,
    paths,
    pathName,
    isPathLocked,
    isPathActive,
    executionMode,
    flowIntensity,
    runMode,
    strictFlowMode,
    nodes,
    edges,
  } = useGraphState();
  const { setPathName, setPaths } = useGraphActions();

  // Domain: Selection — read from context
  const {
    nodeConfigDirty,
    selectedNodeIds,
    selectionToolMode,
    selectionScopeMode,
  } = useSelectionState();
  const { setSelectionToolMode, setSelectionScopeMode } = useSelectionActions();

  // Utility — imported directly
  const { toast } = useToast();
  const { docsTooltipsEnabled, setDocsTooltipsEnabled } = useAiPathsDocsTooltips();

  // Domain: Error reporting — read from dedicated hook
  const { persistLastError } = useAiPathsErrorReporting(activeTab);

  const {
    handleDeletePath,
    handleSwitchPath,
    handleTogglePathLock,
    handleTogglePathActive,
    handleExecutionModeChange,
    handleFlowIntensityChange,
    handleRunModeChange,
    handleStrictFlowModeChange,
    aiPathsValidation,
    setAiPathsValidation,
    updateAiPathsValidation,
    handleHistoryRetentionChange,
    historyRetentionPasses,
    historyRetentionOptionsMax,
    handleClearConnectorData,
    handleClearHistory,
    ConfirmationModal,
  } = state;

  // Derived from Persistence context
  const autoSaveLabel = loading
    ? 'Loading AI Paths...'
    : saving
      ? 'Saving...'
      : autoSaveStatus === 'saved'
        ? 'Saved' +
          (autoSaveAt ? ' at ' + new Date(autoSaveAt).toLocaleTimeString() : '')
        : autoSaveStatus === 'error'
          ? 'Save failed'
          : '';
  const autoSaveVariant: StatusVariant =
    autoSaveStatus === 'saved'
      ? 'success'
      : autoSaveStatus === 'error'
        ? 'error'
        : autoSaveStatus === 'saving'
          ? 'processing'
          : 'neutral';

  const hasHistory = (runtimeState.events?.length ?? 0) > 0;

  const [isFocusModeInternal, setIsFocusModeInternal] = useState(false);
  const [isPathNameEditing, setIsPathNameEditing] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const isFocusMode = isFocusModeProp ?? isFocusModeInternal;
  const setIsFocusMode = onFocusModeChange ?? setIsFocusModeInternal;

  const startPathNameEdit = (): void => {
    if (!activePathId) return;
    setRenameDraft(pathName);
    setIsPathNameEditing(true);
  };

  const cancelPathNameEdit = (): void => {
    setRenameDraft(pathName);
    setIsPathNameEditing(false);
  };

  const commitPathNameEdit = (): void => {
    if (!activePathId) {
      setIsPathNameEditing(false);
      return;
    }
    const nextName = renameDraft.trim();
    if (!nextName) {
      toast('Path name is required.', { variant: 'error' });
      cancelPathNameEdit();
      return;
    }
    if (nextName !== pathName) {
      const updatedAt = new Date().toISOString();
      setPathName(nextName);
      setPaths((prev) =>
        prev.map((p) =>
          p.id === activePathId
            ? { ...p, name: nextName, updatedAt }
            : p,
        ),
      );
      void savePathConfig({ pathNameOverride: nextName });
    }
    setIsPathNameEditing(false);
  };

  // State for dialogs
  const [runDetailOpen, setRunDetailOpen] = useState(false);
  const [runStreamPaused, setRunStreamPaused] = useState(false);
  const [runHistoryNodeId, setRunHistoryNodeId] = useState<string | null>(null);

  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const [pathSettingsModalOpen, setPathSettingsModalOpen] = useState(false);
  const normalizedAiPathsValidation = useMemo<AiPathsValidationConfig>(
    () => normalizeAiPathsValidationConfig(aiPathsValidation),
    [aiPathsValidation],
  );
  const [validationDocsDraft, setValidationDocsDraft] = useState('');
  const [validationCollectionMapDraft, setValidationCollectionMapDraft] =
    useState('');
  const [validationRulesDraft, setValidationRulesDraft] = useState('');
  const [validationConditionDraft, setValidationConditionDraft] =
    useState<ValidationConditionDraft>(DEFAULT_CONDITION_DRAFT);
  const [validationRuleDraft, setValidationRuleDraft] =
    useState<ValidationRuleDraft>(DEFAULT_RULE_DRAFT);
  const [validationRuleConditionsDraft, setValidationRuleConditionsDraft] =
    useState<AiPathsValidationCondition[]>([]);

  const [simulationOpenNodeId, setSimulationOpenNodeId] = useState<
    string | null
  >(null);
  const simulationNode = useMemo(
    () => nodes.find((n) => n.id === simulationOpenNodeId) ?? null,
    [nodes, simulationOpenNodeId],
  );

  const { setNodes } = useGraphActions();
  const { runSimulation } = useRuntimeActions();

  const pathSwitchOptions = useMemo(
    () => buildSwitchPathOptions(sortPathMetas(paths)),
    [paths],
  );
  const historyRetentionOptions = useMemo(
    () =>
      buildHistoryRetentionOptions(
        historyRetentionPasses,
        historyRetentionOptionsMax,
      ),
    [historyRetentionOptionsMax, historyRetentionPasses],
  );

  const runtimeAnalyticsQuery = useAiPathRuntimeAnalytics(
    '24h',
    activeTab === 'canvas',
  );

  useEffect((): void => {
    if (!pathSettingsModalOpen) return;
    setValidationDocsDraft(
      (normalizedAiPathsValidation.docsSources ?? []).join('\n'),
    );
    const serializedCollectionMap = Object.entries(
      normalizedAiPathsValidation.collectionMap ?? {},
    )
      .map(([entity, collection]: [string, string]) => `${entity}:${collection}`)
      .join('\n');
    setValidationCollectionMapDraft(serializedCollectionMap);
    setValidationRulesDraft(
      JSON.stringify(normalizedAiPathsValidation.rules ?? [], null, 2),
    );
    setValidationConditionDraft(DEFAULT_CONDITION_DRAFT);
    setValidationRuleDraft(DEFAULT_RULE_DRAFT);
    setValidationRuleConditionsDraft([]);
  }, [normalizedAiPathsValidation, pathSettingsModalOpen]);

  const nodeTitleById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    nodes.forEach((node: AiNode) => {
      map.set(node.id, node.title ?? node.id);
    });
    return map;
  }, [nodes]);

  const runtimeNodeStatusEntries = useMemo(
    () =>
      Object.entries(runtimeNodeStatuses ?? {}).filter(
        ([, status]: [string, string]) =>
          typeof status === 'string' && status.trim().length > 0,
      ),
    [runtimeNodeStatuses],
  );

  const runtimeNodeStatusCounts = useMemo((): Record<string, number> => {
    return runtimeNodeStatusEntries.reduce<Record<string, number>>(
      (acc: Record<string, number>, [, status]: [string, string]) => {
        const normalized = status.trim().toLowerCase();
        acc[normalized] = (acc[normalized] ?? 0) + 1;
        return acc;
      },
      {},
    );
  }, [runtimeNodeStatusEntries]);

  const runtimeNodeLiveStates = useMemo(
    (): Array<{ nodeId: string; title: string; status: string }> =>
      runtimeNodeStatusEntries
        .map(([nodeId, status]: [string, string]) => ({
          nodeId,
          title: nodeTitleById.get(nodeId) ?? nodeId,
          status: status.trim().toLowerCase(),
        }))
        .filter(
          (entry: { nodeId: string; title: string; status: string }) =>
            entry.status === 'running' ||
            entry.status === 'queued' ||
            entry.status === 'polling' ||
            entry.status === 'paused' ||
            entry.status === 'waiting_callback',
        )
        .slice(0, 8),
    [nodeTitleById, runtimeNodeStatusEntries],
  );

  const runtimeLogEvents = useMemo(
    () => runtimeEvents.slice(Math.max(0, runtimeEvents.length - 80)).reverse(),
    [runtimeEvents],
  );

  const dependencyReport = useMemo(
    () => inspectPathDependencies(nodes, edges),
    [nodes, edges],
  );
  const validationPreflightReport = useMemo(
    () =>
      evaluateAiPathsValidationPreflight({
        nodes,
        edges,
        config: normalizedAiPathsValidation,
      }),
    [nodes, edges, normalizedAiPathsValidation],
  );
  const validationRules = normalizedAiPathsValidation.rules ?? [];
  const validationModuleImpact = useMemo(
    () =>
      Object.values(validationPreflightReport.moduleImpact).sort((left, right) => {
        if (left.scorePenalty !== right.scorePenalty) {
          return right.scorePenalty - left.scorePenalty;
        }
        return left.module.localeCompare(right.module);
      }),
    [validationPreflightReport.moduleImpact],
  );

  const updateValidationRules = (
    updater: (rules: AiPathsValidationRule[]) => AiPathsValidationRule[],
  ): void => {
    setAiPathsValidation((previous: AiPathsValidationConfig) =>
      normalizeAiPathsValidationConfig({
        ...previous,
        rules: updater(previous.rules ?? []),
      }),
    );
  };

  const parseExpectedValue = (rawValue: string): unknown => {
    const trimmed = rawValue.trim();
    if (!trimmed) return undefined;
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const parsedNumber = Number.parseFloat(trimmed);
      if (Number.isFinite(parsedNumber)) return parsedNumber;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  };

  const handleAddValidationConditionDraft = (): void => {
    const operator = validationConditionDraft.operator;
    const field = validationConditionDraft.field.trim();
    const valuePath = validationConditionDraft.valuePath.trim();
    const requiresFieldOrPath = new Set<AiPathsValidationOperator>([
      'exists',
      'non_empty',
      'equals',
      'in',
      'matches_regex',
      'jsonpath_exists',
      'jsonpath_equals',
    ]);
    if (requiresFieldOrPath.has(operator) && !field && !valuePath) {
      toast('Condition needs a field or valuePath.', { variant: 'error' });
      return;
    }

    const expected = parseExpectedValue(validationConditionDraft.expected);
    const list = parseStringList(validationConditionDraft.list);
    if ((operator === 'equals' || operator === 'jsonpath_equals') && expected === undefined) {
      toast('Equals operators need expected value.', { variant: 'error' });
      return;
    }
    if (operator === 'in' && list.length === 0 && expected === undefined) {
      toast('In operator needs list values or expected array.', { variant: 'error' });
      return;
    }
    if (operator === 'matches_regex' && typeof expected !== 'string') {
      toast('Regex operator needs regex string in expected field.', {
        variant: 'error',
      });
      return;
    }

    const condition: AiPathsValidationCondition = {
      id: createAiPathsValidationConditionId(
        operator,
        validationRuleConditionsDraft.map((entry) => entry.id),
      ),
      operator,
      ...(field ? { field } : {}),
      ...(valuePath ? { valuePath } : {}),
      ...(expected !== undefined ? { expected } : {}),
      ...(list.length > 0 ? { list } : {}),
      ...(validationConditionDraft.flags.trim()
        ? { flags: validationConditionDraft.flags.trim() }
        : {}),
      ...(validationConditionDraft.port.trim()
        ? { port: validationConditionDraft.port.trim() }
        : {}),
      ...(validationConditionDraft.fromPort.trim()
        ? { fromPort: validationConditionDraft.fromPort.trim() }
        : {}),
      ...(validationConditionDraft.toPort.trim()
        ? { toPort: validationConditionDraft.toPort.trim() }
        : {}),
      ...(validationConditionDraft.fromNodeType.trim()
        ? { fromNodeType: validationConditionDraft.fromNodeType.trim() }
        : {}),
      ...(validationConditionDraft.toNodeType.trim()
        ? { toNodeType: validationConditionDraft.toNodeType.trim() }
        : {}),
      ...(validationConditionDraft.sourceNodeId.trim()
        ? { sourceNodeId: validationConditionDraft.sourceNodeId.trim() }
        : {}),
      ...(validationConditionDraft.targetNodeId.trim()
        ? { targetNodeId: validationConditionDraft.targetNodeId.trim() }
        : {}),
      ...(validationConditionDraft.negate ? { negate: true } : {}),
    };

    setValidationRuleConditionsDraft((previous) => [...previous, condition]);
    setValidationConditionDraft(DEFAULT_CONDITION_DRAFT);
  };

  const handleAddValidationRuleDraft = (): void => {
    const title = validationRuleDraft.title.trim();
    if (!title) {
      toast('Rule title is required.', { variant: 'error' });
      return;
    }
    if (validationRuleConditionsDraft.length === 0) {
      toast('Add at least one condition for the rule.', { variant: 'error' });
      return;
    }

    const existingRuleIds = validationRules.map((rule) => rule.id);
    const nextId = createAiPathsValidationRuleId(title, existingRuleIds);
    const parsedWeight = parseNumberInput(validationRuleDraft.weight);
    const parsedForceProbability = parseNumberInput(
      validationRuleDraft.forceProbabilityIfFailed,
    );
    const parsedNodeTypes = parseStringList(
      validationRuleDraft.appliesToNodeTypes,
    );
    const parsedDocsBindings = parseStringList(validationRuleDraft.docsBindings);
    const parsedSequence = parseNumberInput(validationRuleDraft.sequence);
    const defaultSequence =
      validationRules.reduce((maxValue, rule) => {
        const value = typeof rule.sequence === 'number' ? rule.sequence : 0;
        return Math.max(maxValue, value);
      }, 0) + 10;

    const nextRule: AiPathsValidationRule = {
      id: nextId,
      title,
      enabled: true,
      severity: validationRuleDraft.severity,
      module: validationRuleDraft.module,
      conditionMode: validationRuleDraft.conditionMode,
      sequence: parsedSequence ?? defaultSequence,
      conditions: validationRuleConditionsDraft,
      ...(validationRuleDraft.description.trim()
        ? { description: validationRuleDraft.description.trim() }
        : {}),
      ...(parsedWeight !== undefined ? { weight: parsedWeight } : {}),
      ...(parsedForceProbability !== undefined
        ? {
          forceProbabilityIfFailed: Math.max(
            0,
            Math.min(100, parsedForceProbability),
          ),
        }
        : {}),
      ...(validationRuleDraft.recommendation.trim()
        ? { recommendation: validationRuleDraft.recommendation.trim() }
        : {}),
      ...(parsedNodeTypes.length > 0
        ? {
          appliesToNodeTypes: parsedNodeTypes,
        }
        : {}),
      ...(parsedDocsBindings.length > 0
        ? { docsBindings: parsedDocsBindings }
        : {}),
    };

    updateValidationRules((rules: AiPathsValidationRule[]) => [...rules, nextRule]);
    setValidationRuleDraft(DEFAULT_RULE_DRAFT);
    setValidationRuleConditionsDraft([]);
    setValidationConditionDraft(DEFAULT_CONDITION_DRAFT);
    toast(`Validation rule "${title}" added.`, { variant: 'success' });
  };

  const handleToggleValidationRuleEnabled = (ruleId: string): void => {
    updateValidationRules((rules: AiPathsValidationRule[]) =>
      rules.map((rule: AiPathsValidationRule): AiPathsValidationRule =>
        rule.id === ruleId ? { ...rule, enabled: rule.enabled === false } : rule,
      ),
    );
  };

  const handleDeleteValidationRule = (ruleId: string): void => {
    updateValidationRules((rules: AiPathsValidationRule[]) =>
      rules.filter((rule: AiPathsValidationRule): boolean => rule.id !== ruleId),
    );
  };

  const handleRebuildValidationRulesFromDocs = (): void => {
    const docsSources = normalizedAiPathsValidation.docsSources ?? [];
    const rebuiltRules = buildAiPathsValidationRulesFromDocs(docsSources);
    updateAiPathsValidation({ rules: rebuiltRules });
    toast(`Rebuilt ${rebuiltRules.length} rules from docs sources.`, {
      variant: 'success',
    });
  };

  const handleApplyValidationRulesJson = (): void => {
    try {
      const parsed = JSON.parse(validationRulesDraft) as unknown;
      if (!Array.isArray(parsed)) {
        toast('Validation rules JSON must be an array.', {
          variant: 'error',
        });
        return;
      }
      setAiPathsValidation((previous: AiPathsValidationConfig) =>
        normalizeAiPathsValidationConfig({
          ...previous,
          rules: parsed as AiPathsValidationConfig['rules'],
        }),
      );
    } catch {
      toast('Invalid validation rules JSON.', {
        variant: 'error',
      });
    }
  };

  const selectedNodeForValidator = useMemo(
    (): AiNode | null =>
      selectedNodeIds.length > 0
        ? nodes.find((node: AiNode): boolean => node.id === selectedNodeIds[0]) ?? null
        : null,
    [nodes, selectedNodeIds],
  );

  const handleOpenNodeValidator = (): void => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (activePathId) {
      params.set('pathId', activePathId);
    }
    if (selectedNodeForValidator?.id) {
      params.set('focusNodeId', selectedNodeForValidator.id);
    }
    if (selectedNodeForValidator?.type) {
      params.set('focusNodeType', selectedNodeForValidator.type);
    }
    const query = params.toString();
    const destination = query
      ? `/admin/ai-paths/validation?${query}`
      : '/admin/ai-paths/validation';
    window.open(destination, '_blank', 'noopener,noreferrer');
  };

  const handleRunNodeValidationCheck = (): void => {
    if (normalizedAiPathsValidation.enabled === false) {
      toast('Enable node validation first.', { variant: 'info' });
      return;
    }
    if (validationPreflightReport.blocked) {
      const primaryFinding = validationPreflightReport.findings[0];
      toast(
        primaryFinding
          ? `Node validation blocked: ${primaryFinding.ruleTitle}.`
          : `Node validation blocked (score ${validationPreflightReport.score}).`,
        { variant: 'error' },
      );
      return;
    }
    if (validationPreflightReport.shouldWarn) {
      const primaryFinding = validationPreflightReport.findings[0];
      toast(
        primaryFinding
          ? `Node validation warning: ${primaryFinding.ruleTitle}.`
          : `Node validation warning (score ${validationPreflightReport.score}).`,
        { variant: 'warning' },
      );
      return;
    }
    toast(
      `Node validation passed (score ${validationPreflightReport.score}, failed rules ${validationPreflightReport.failedRules}).`,
      { variant: 'success' },
    );
  };

  if (loading) {
    return <LoadingState message='Loading AI Paths...' className='py-12' />;
  }

  return (
    <div
      id='ai-paths-docs-root'
      className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}
    >
      <DocsTooltipEnhancer rootId='ai-paths-docs-root' enabled={docsTooltipsEnabled} />
      {activeTab === 'canvas' && (
        <div className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
          {!isFocusMode && typeof document !== 'undefined' && renderActions
            ? createPortal(
              renderActions(
                <div className='flex w-full items-start'>
                  <div className='flex flex-col items-start gap-2'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <Button
                        data-doc-id='canvas_save_path'
                        className='rounded-md border text-sm text-white hover:bg-muted/60'
                        onClick={() => {
                          if (nodeConfigDirty) {
                            toast(
                              'Unsaved node-config dialog changes are not included. Click "Update Node" first, then "Save Path".',
                              { variant: 'info' },
                            );
                          }
                          void savePathConfig();
                        }}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Path'}
                      </Button>
                      <Button
                        data-doc-id='canvas_paths_settings'
                        type='button'
                        className='rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
                        onClick={() => {
                          setPathSettingsModalOpen(true);
                        }}
                        disabled={!activePathId}
                      >
                        Paths Settings
                      </Button>
                      <Button
                        data-doc-id='canvas_enable_node_validation'
                        type='button'
                        className={`rounded-md border text-sm ${
                          normalizedAiPathsValidation.enabled === false
                            ? 'border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
                            : 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
                        }`}
                        onClick={() => {
                          const nextEnabled = normalizedAiPathsValidation.enabled === false;
                          updateAiPathsValidation({ enabled: nextEnabled });
                          toast(
                            nextEnabled
                              ? 'AI Paths node validation enabled.'
                              : 'AI Paths node validation disabled.',
                            {
                              variant: nextEnabled ? 'success' : 'info',
                            },
                          );
                        }}
                        disabled={!activePathId || isPathLocked}
                        title={
                          normalizedAiPathsValidation.enabled === false
                            ? 'Enable AI Paths node validation'
                            : 'Disable AI Paths node validation'
                        }
                      >
                        {normalizedAiPathsValidation.enabled === false
                          ? 'Enable Node Validation'
                          : 'Disable Node Validation'}
                      </Button>
                      <Button
                        data-doc-id='canvas_validate_nodes'
                        type='button'
                        className='rounded-md border border-sky-500/40 text-sm text-sky-200 hover:bg-sky-500/10'
                        onClick={handleRunNodeValidationCheck}
                        disabled={
                          !activePathId || normalizedAiPathsValidation.enabled === false
                        }
                        title='Run node validation check now'
                      >
                        Validate Nodes
                      </Button>
                      <Button
                        data-doc-id='canvas_open_node_validator'
                        type='button'
                        className='rounded-md border border-indigo-500/40 text-sm text-indigo-200 hover:bg-indigo-500/10'
                        onClick={handleOpenNodeValidator}
                        disabled={!activePathId}
                        title='Open AI-Paths Node Validator patterns and sequences'
                      >
                        Node Validator
                      </Button>
                      <StatusBadge
                        status={
                          normalizedAiPathsValidation.enabled === false
                            ? 'Validation: off'
                            : validationPreflightReport.blocked
                              ? 'Validation: blocked'
                              : validationPreflightReport.shouldWarn
                                ? 'Validation: warning'
                                : 'Validation: ready'
                        }
                        variant={
                          normalizedAiPathsValidation.enabled === false
                            ? 'neutral'
                            : validationPreflightReport.blocked
                              ? 'error'
                              : validationPreflightReport.shouldWarn
                                ? 'warning'
                                : 'success'
                        }
                        size='sm'
                        className='font-medium'
                      />
                      <StatusBadge
                        status={`Validation score: ${validationPreflightReport.score}`}
                        variant='neutral'
                        size='sm'
                        className='font-medium'
                      />
                      <StatusBadge
                        status={`Failed rules: ${validationPreflightReport.failedRules}`}
                        variant={
                          validationPreflightReport.failedRules > 0
                            ? 'warning'
                            : 'success'
                        }
                        size='sm'
                        className='font-medium'
                      />
                      <Button
                        data-doc-id='docs_tooltips_toggle'
                        type='button'
                        className='rounded-md border border-violet-500/40 text-sm text-violet-200 hover:bg-violet-500/10'
                        onClick={() => setDocsTooltipsEnabled(!docsTooltipsEnabled)}
                      >
                        {docsTooltipsEnabled ? 'Docs Tooltips: On' : 'Docs Tooltips: Off'}
                      </Button>
                      <Button
                        data-doc-id='canvas_toggle_path_lock'
                        type='button'
                        className='rounded-md border border-border text-sm text-gray-300 hover:bg-card/60'
                        onClick={handleTogglePathLock}
                        disabled={!activePathId}
                        title={
                          isPathLocked
                            ? 'Unlock to edit nodes and connections'
                            : 'Lock to prevent edits'
                        }
                      >
                        {isPathLocked ? 'Unlock Path' : 'Lock Path'}
                      </Button>
                      <div className='flex items-center rounded-md border border-border/60 bg-card/40 p-0.5'>
                        <Button
                          type='button'
                          className={`h-8 rounded-md px-2 text-xs ${
                            selectionToolMode === 'pan'
                              ? 'bg-sky-500/20 text-sky-200'
                              : 'text-gray-300 hover:bg-card/60'
                          }`}
                          onClick={() => setSelectionToolMode('pan')}
                          title='Pan canvas'
                        >
                          Pan
                        </Button>
                        <Button
                          type='button'
                          className={`h-8 rounded-md px-2 text-xs ${
                            selectionToolMode === 'select'
                              ? 'bg-sky-500/20 text-sky-200'
                              : 'text-gray-300 hover:bg-card/60'
                          }`}
                          onClick={() => setSelectionToolMode('select')}
                          title='Rectangle selection tool'
                        >
                          Select
                        </Button>
                      </div>
                      {selectionToolMode === 'select' ? (
                        <div className='flex items-center rounded-md border border-border/60 bg-card/40 p-0.5'>
                          <Button
                            type='button'
                            className={`h-8 rounded-md px-2 text-xs ${
                              selectionScopeMode === 'portion'
                                ? 'bg-sky-500/20 text-sky-200'
                                : 'text-gray-300 hover:bg-card/60'
                            }`}
                            onClick={() => setSelectionScopeMode('portion')}
                            title='Select only nodes inside the rectangle'
                          >
                            Portion
                          </Button>
                          <Button
                            type='button'
                            className={`h-8 rounded-md px-2 text-xs ${
                              selectionScopeMode === 'wiring'
                                ? 'bg-sky-500/20 text-sky-200'
                                : 'text-gray-300 hover:bg-card/60'
                            }`}
                            onClick={() => setSelectionScopeMode('wiring')}
                            title='Expand marquee selection to connected wiring'
                          >
                            With Wiring
                          </Button>
                        </div>
                      ) : null}
                      <StatusBadge
                        status={`Selected: ${selectedNodeIds.length}`}
                        variant='neutral'
                        size='sm'
                        className='font-medium'
                        title='Selected nodes count'
                      />
                      {selectionToolMode === 'select' ? (
                        <div className='text-[11px] text-gray-400'>
                          {selectionScopeMode === 'wiring'
                            ? 'Drag to select connected subgraphs. Shift add, Alt subtract.'
                            : 'Drag to select node portions only. Shift add, Alt subtract.'}
                        </div>
                      ) : null}
                      <Button
                        data-doc-id='canvas_clear_connector_data'
                        className='rounded-md border border-amber-500/40 text-sm text-amber-200 hover:bg-amber-500/10'
                        onClick={() => {
                          void handleClearConnectorData();
                        }}
                        type='button'
                        disabled={!activePathId}
                      >
                          Clear Connector Data
                      </Button>
                      <Button
                        data-doc-id='canvas_toggle_path_active'
                        type='button'
                        className={`rounded-md border text-sm ${isPathActive ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10' : 'border-rose-500/40 text-rose-200 hover:bg-rose-500/10'}`}
                        onClick={handleTogglePathActive}
                        disabled={!activePathId}
                        title={
                          isPathActive
                            ? 'Deactivate to stop runs'
                            : 'Activate to allow runs'
                        }
                      >
                        {isPathActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        data-doc-id='canvas_clear_history'
                        className='rounded-md border border-sky-500/40 text-sm text-sky-200 hover:bg-sky-500/10'
                        onClick={() => {
                          void handleClearHistory();
                        }}
                        type='button'
                        disabled={!activePathId}
                        title={
                          hasHistory
                            ? 'Clear history for all nodes in this path'
                            : 'No history recorded yet'
                        }
                      >
                          Clear History
                      </Button>
                    </div>
                    {lastError && (
                      <div className='flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200'>
                        <span className='max-w-[220px] truncate'>
                            Last error: {lastError.message}
                        </span>
                        <Button
                          type='button'
                          className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
                          onClick={() => {
                            setLastError(null);
                            void persistLastError(null);
                          }}
                        >
                            Clear
                        </Button>
                        {lastError.message ===
                            'Failed to load AI Paths settings' && (
                          <Button
                            type='button'
                            className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
                            onClick={() => {
                              setLastError(null);
                              void persistLastError(null);
                              incrementLoadNonce();
                            }}
                          >
                              Retry
                          </Button>
                        )}
                        <Button
                          type='button'
                          className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
                          onClick={(): void =>
                            window.location.assign(
                              `/admin/system/logs?level=error&source=client&query=${encodeURIComponent(
                                'AI Paths',
                              )}`,
                            )
                          }
                        >
                            View logs
                        </Button>
                      </div>
                    )}
                  </div>
                </div>,
              ),
              document.getElementById('ai-paths-actions') ?? document.body,
            )
            : null}
          {typeof document !== 'undefined'
            ? (() => {
              return createPortal(
                <Button size='xs'
                  data-doc-id='canvas_focus_mode_toggle'
                  type='button'
                  variant='outline'
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  title={isFocusMode ? 'Show side panels' : 'Show canvas only'}
                  aria-label={isFocusMode ? 'Show side panels' : 'Show canvas only'}
                  className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2'
                >
                  {isFocusMode ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                </Button>,
                document.body,
              );
            })()
            : null}
          {!isFocusMode && typeof document !== 'undefined' && activePathId
            ? createPortal(
              <div className='flex items-center justify-end gap-2'>
                {autoSaveLabel ? (
                  <StatusBadge
                    status={autoSaveLabel}
                    variant={autoSaveVariant}
                    size='sm'
                    className='font-medium'
                  />
                ) : null}
                {lastRunAt && (
                  <StatusBadge
                    status={
                      'Last run: ' + new Date(lastRunAt).toLocaleTimeString()
                    }
                    variant='active'
                    size='sm'
                    className='font-medium'
                  />
                )}
                <div className='flex items-center gap-2'>
                  {isPathNameEditing ? (
                    <input
                      data-doc-id='canvas_path_name_field'
                      type='text'
                      value={renameDraft}
                      onChange={(event) => {
                        setRenameDraft(event.target.value);
                      }}
                      onBlur={commitPathNameEdit}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.currentTarget.blur();
                          return;
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelPathNameEdit();
                        }
                      }}
                      autoFocus
                      className='h-9 w-[320px] rounded-md border border-border bg-card/60 px-3 text-sm text-white outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                      placeholder='Path name'
                      disabled={!activePathId}
                    />
                  ) : (
                    <button
                      data-doc-id='canvas_path_name_field'
                      type='button'
                      className='h-9 w-[320px] rounded-md border border-border bg-card/60 px-3 text-left text-sm text-gray-200 hover:bg-card/70 disabled:cursor-not-allowed disabled:opacity-60'
                      onDoubleClick={startPathNameEdit}
                      disabled={!activePathId}
                      title={
                        activePathId
                          ? 'Double-click to rename this path'
                          : 'No active path selected'
                      }
                    >
                      <span className='block truncate'>
                        {pathName || 'Untitled path'}
                      </span>
                    </button>
                  )}
                  <SelectSimple
                    dataDocId='canvas_path_selector'
                    size='sm'
                    value={activePathId ?? undefined}
                    onValueChange={(value: string): void => {
                      if (value !== activePathId) {
                        handleSwitchPath(value);
                      }
                    }}
                    options={pathSwitchOptions}
                    placeholder='Select path'
                    className='w-[240px]'
                    triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                    disabled={pathSwitchOptions.length === 0}
                  />
                </div>
              </div>,
              document.getElementById('ai-paths-name') ?? document.body,
            )
            : null}

          <div
            className={`grid grid-cols-1 min-h-0 transition-[grid-template-columns] duration-300 ease-in-out ${
              isFocusMode
                ? 'h-full gap-0 xl:grid-cols-[0px_1fr]'
                : 'gap-6 xl:grid-cols-[280px_1fr]'
            }`}
          >
            <div
              className={`space-y-4 transition-all duration-300 ease-in-out ${
                isFocusMode
                  ? 'pointer-events-none opacity-0 -translate-x-2 max-h-0 overflow-hidden'
                  : 'opacity-100'
              }`}
              aria-hidden={isFocusMode}
            >
              <CanvasSidebar />
              <ClusterPresetsPanel />
              <GraphModelDebugPanel />
              <RunHistoryPanel />
            </div>
            <div className={`relative ${isFocusMode ? 'h-full min-h-0' : ''}`}>
              <CanvasBoard
                viewportClassName={
                  isFocusMode
                    ? 'h-full min-h-0 rounded-none border-0'
                    : undefined
                }
                confirmNodeSwitch={state.confirmNodeSwitch}
              />
            </div>
          </div>
          {!isFocusMode && <RuntimeEventLogPanel />}
          {!isFocusMode ? (
            <div className='grid gap-4 lg:grid-cols-2'>
              <div className='space-y-3 rounded-lg border border-border/60 bg-card/50 p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <div className='text-sm font-semibold text-white'>
                      Runtime Analysis
                    </div>
                    <div className='text-xs text-gray-400'>
                      Live runtime state synced from node events plus Redis 24h
                      analytics.
                    </div>
                  </div>
                  <Button
                    type='button'
                    className='rounded-md border border-border px-2 py-1 text-[10px] text-gray-200 hover:bg-card/70'
                    onClick={() => {
                      runtimeAnalyticsQuery.refetch().catch(() => {});
                    }}
                    disabled={runtimeAnalyticsQuery.isFetching}
                  >
                    {runtimeAnalyticsQuery.isFetching
                      ? 'Refreshing...'
                      : 'Refresh'}
                  </Button>
                </div>

                <div className='grid gap-2 sm:grid-cols-3'>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Run Status
                    </div>
                    <div className='mt-1 text-sm text-white'>
                      {formatStatusLabel(runtimeRunStatus)}
                    </div>
                  </div>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Live Nodes
                    </div>
                    <div className='mt-1 text-sm text-white'>
                      {runtimeNodeLiveStates.length}
                    </div>
                  </div>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Storage
                    </div>
                    <div className='mt-1 text-sm text-white'>
                      {runtimeAnalyticsQuery.data?.storage ?? '—'}
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-300 sm:grid-cols-4'>
                  {(
                    [
                      'running',
                      'queued',
                      'polling',
                      'completed',
                      'failed',
                      'cached',
                    ] as const
                  ).map((status) => (
                    <div
                      key={status}
                      className='rounded-md border border-border/60 bg-card/60 px-2 py-1'
                    >
                      <span className='text-gray-500'>
                        {formatStatusLabel(status)}:
                      </span>{' '}
                      <span className='text-gray-200'>
                        {runtimeNodeStatusCounts[status] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>

                {runtimeNodeLiveStates.length > 0 ? (
                  <div className='space-y-1'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Active Node States
                    </div>
                    <div className='flex flex-wrap gap-1.5'>
                      {runtimeNodeLiveStates.map(
                        (entry: {
                          nodeId: string;
                          title: string;
                          status: string;
                        }) => (
                          <StatusBadge
                            key={entry.nodeId}
                            status={
                              entry.title +
                              ' · ' +
                              formatStatusLabel(entry.status)
                            }
                            variant={statusToVariant(entry.status)}
                            size='sm'
                            title={entry.nodeId}
                            className='font-medium'
                          />
                        ),
                      )}
                    </div>
                  </div>
                ) : (
                  <div className='text-xs text-gray-500'>
                    No active runtime node statuses right now.
                  </div>
                )}

                <div className='grid gap-2 sm:grid-cols-2'>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Runs (24h)
                    </div>
                    <div className='mt-1 text-sm text-white'>
                      {runtimeAnalyticsQuery.data?.runs.total ?? 0}
                    </div>
                    <div className='mt-1 text-gray-400'>
                      Success:{' '}
                      {formatPercent(
                        runtimeAnalyticsQuery.data?.runs.successRate ?? 0,
                      )}
                    </div>
                  </div>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Run Runtime (24h)
                    </div>
                    <div className='mt-1 text-gray-200'>
                      Avg{' '}
                      {formatDurationMs(
                        runtimeAnalyticsQuery.data?.runs.avgDurationMs,
                      )}
                    </div>
                    <div className='mt-1 text-gray-400'>
                      p95{' '}
                      {formatDurationMs(
                        runtimeAnalyticsQuery.data?.runs.p95DurationMs,
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-3 rounded-lg border border-border/60 bg-card/50 p-4'>
                <div>
                  <div className='text-sm font-semibold text-white'>
                    Live Runtime Log
                  </div>
                  <div className='text-xs text-gray-400'>
                    Last {runtimeLogEvents.length} runtime events from local +
                    server execution.
                  </div>
                </div>
                <div className='max-h-[280px] space-y-2 overflow-y-auto pr-1'>
                  {runtimeLogEvents.length > 0 ? (
                    runtimeLogEvents.map((event) => (
                      <div
                        key={event.id}
                        className='rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-gray-300'
                      >
                        <div className='flex flex-wrap items-center gap-1.5 text-[10px]'>
                          <span className='text-gray-500'>
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                          <StatusBadge
                            status={event.level ?? 'info'}
                            variant={
                              event.level === 'error'
                                ? 'error'
                                : event.level === 'warn'
                                  ? 'warning'
                                  : 'info'
                            }
                            size='sm'
                            className='font-bold'
                          />
                          <StatusBadge
                            status={event.nodeType ?? event.type ?? 'event'}
                            variant='neutral'
                            size='sm'
                            className='border-border/60 text-gray-400'
                          />
                        </div>
                        <div className='mt-1 text-gray-200'>
                          {event.message}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className='rounded-md border border-dashed border-border/60 px-3 py-4 text-xs text-gray-500'>
                      Runtime log is empty. Fire a trigger to stream node/run
                      events.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          {!isFocusMode && (
            <div className='mt-4 flex justify-end'>
              <Button
                className='rounded-md border border-rose-500/40 text-sm text-rose-200 hover:bg-rose-500/10'
                onClick={() => {
                  void handleDeletePath();
                }}
                type='button'
                disabled={!activePathId}
              >
                Delete Path
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'paths' && (
        <PathsTabPanel onPathOpen={() => onTabChange?.('canvas')} />
      )}

      {activeTab === 'docs' && <DocsTabPanel />}

      <NodeConfigDialog />
      <RunDetailDialog
        isOpen={runDetailOpen}
        onClose={() => setRunDetailOpen(false)}
        onSuccess={() => {}}
        loading={false}
        runDetail={null}
        runStreamStatus='idle'
        runStreamPaused={runStreamPaused}
        runEventsOverflow={false}
        runEventsBatchLimit={100}
        runHistoryNodeId={runHistoryNodeId}
        onStreamPauseToggle={setRunStreamPaused}
        onHistoryNodeSelect={setRunHistoryNodeId}
      />
      <PresetsDialog
        isOpen={presetsModalOpen}
        onClose={() => setPresetsModalOpen(false)}
        onSuccess={() => {}}
        presetsJson=''
        setPresetsJson={() => {}}
        clusterPresets={[]}
        onImport={async (mode) => {
          await state.handleImportPresets(mode).catch(() => {});
        }}
        onCopyJson={(value) => {
          navigator.clipboard
            .writeText(value)
            .then(() =>
              state.toast('Presets copied to clipboard.', {
                variant: 'success',
              }),
            )
            .catch((error: Error) => {
              state.reportAiPathsError(
                error,
                { action: 'copyPresets' },
                'Failed to copy presets:',
              );
              state.toast('Failed to copy presets.', { variant: 'error' });
            });
        }}
      />
      <SettingsPanelBuilder<PathSettingsFormState>
        open={pathSettingsModalOpen}
        onClose={() => setPathSettingsModalOpen(false)}
        title='Paths Settings'
        subtitle='Configure persistence and runtime behavior for this path.'
        size='lg'
        onSave={async () => {
          setPathSettingsModalOpen(false);
        }}
        cancelText='Close'
        showSaveButton={false}
        fields={[
          {
            key: 'saveMode',
            label: 'Save Mode',
            type: 'custom',
            render: () => autoSaveLabel ? (
              <StatusBadge
                status={autoSaveLabel}
                variant={autoSaveVariant}
                size='sm'
                className='font-medium'
              />
            ) : <span className='text-xs text-muted-foreground'>No save status</span>
          },
          {
            key: 'execution',
            label: 'Execution',
            type: 'custom',
            render: () => (
              <SelectSimple
                size='sm'
                value={executionMode}
                onValueChange={(value: string): void => {
                  if (value === executionMode) return;
                  if (value === 'local' || value === 'server') {
                    handleExecutionModeChange(value);
                  }
                }}
                options={[...EXECUTION_OPTIONS]}
                triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                disabled={isPathLocked}
              />
            )
          },
          {
            key: 'flow',
            label: 'Flow',
            type: 'custom',
            render: () => (
              <SelectSimple
                size='sm'
                value={flowIntensity}
                onValueChange={(value: string): void => {
                  if (value === flowIntensity) return;
                  if (
                    value === 'off' ||
                    value === 'low' ||
                    value === 'medium' ||
                    value === 'high'
                  ) {
                    handleFlowIntensityChange(value);
                  }
                }}
                options={[...FLOW_OPTIONS]}
                triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                disabled={isPathLocked}
              />
            )
          },
          {
            key: 'runMode',
            label: 'Run Mode',
            type: 'custom',
            render: () => (
              <SelectSimple
                size='sm'
                value={runMode}
                onValueChange={(value: string): void => {
                  if (value === runMode) return;
                  if (value === 'manual' || value === 'automatic' || value === 'step') {
                    handleRunModeChange(value);
                  }
                }}
                options={[...RUN_MODE_OPTIONS]}
                triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                disabled={isPathLocked}
              />
            )
          },
          {
            key: 'strictFlowMode',
            label: 'Strict Flow',
            type: 'custom',
            render: () => (
              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-2'>
                  <StatusBadge
                    status={strictFlowMode ? 'Strict mode: on' : 'Strict mode: off'}
                    variant={strictFlowMode ? 'success' : 'warning'}
                    size='sm'
                    className='font-medium'
                  />
                  <Button
                    type='button'
                    className='h-8 rounded-md border border-border px-2 text-[11px] text-gray-200 hover:bg-card/70'
                    onClick={() => {
                      handleStrictFlowModeChange(!strictFlowMode);
                    }}
                    disabled={isPathLocked}
                  >
                    {strictFlowMode ? 'Disable' : 'Enable'}
                  </Button>
                </div>
                <div className='text-[11px] text-gray-400'>
                  When enabled, runtime blocks implicit fallback inputs and uses only wired/contextual data.
                </div>
              </div>
            )
          },
          {
            key: 'validationEngine',
            label: 'Validation Engine',
            type: 'custom',
            render: () => (
              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-2'>
                  <StatusBadge
                    status={
                      normalizedAiPathsValidation.enabled !== false
                        ? 'Validation engine: on'
                        : 'Validation engine: off'
                    }
                    variant={
                      normalizedAiPathsValidation.enabled !== false
                        ? 'success'
                        : 'warning'
                    }
                    size='sm'
                    className='font-medium'
                  />
                  <Button
                    type='button'
                    className='h-8 rounded-md border border-border px-2 text-[11px] text-gray-200 hover:bg-card/70'
                    onClick={() => {
                      updateAiPathsValidation({
                        enabled: normalizedAiPathsValidation.enabled === false,
                      });
                    }}
                    disabled={isPathLocked}
                  >
                    {normalizedAiPathsValidation.enabled !== false
                      ? 'Disable'
                      : 'Enable'}
                  </Button>
                </div>
                <div className='text-[11px] text-gray-400'>
                  UI-defined preflight validation runs before execution and can block low-confidence paths.
                </div>
              </div>
            )
          },
          {
            key: 'validationPolicy',
            label: 'Validation Policy',
            type: 'custom',
            render: () => (
              <SelectSimple
                size='sm'
                value={normalizedAiPathsValidation.policy ?? 'block_below_threshold'}
                onValueChange={(value: string): void => {
                  if (
                    value === 'report_only' ||
                    value === 'warn_below_threshold' ||
                    value === 'block_below_threshold'
                  ) {
                    updateAiPathsValidation({ policy: value });
                  }
                }}
                options={[
                  { label: 'Block below threshold', value: 'block_below_threshold' },
                  { label: 'Warn below threshold', value: 'warn_below_threshold' },
                  { label: 'Report only', value: 'report_only' },
                ]}
                triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                disabled={isPathLocked}
              />
            )
          },
          {
            key: 'validationThresholds',
            label: 'Validation Thresholds',
            type: 'custom',
            render: () => (
              <div className='grid grid-cols-2 gap-2'>
                <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                  Warn threshold
                  <input
                    type='number'
                    min={0}
                    max={100}
                    value={normalizedAiPathsValidation.warnThreshold ?? 70}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (Number.isFinite(parsed)) {
                        updateAiPathsValidation({ warnThreshold: parsed });
                      }
                    }}
                    className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                    disabled={isPathLocked}
                  />
                </label>
                <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                  Block threshold
                  <input
                    type='number'
                    min={0}
                    max={100}
                    value={normalizedAiPathsValidation.blockThreshold ?? 50}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (Number.isFinite(parsed)) {
                        updateAiPathsValidation({ blockThreshold: parsed });
                      }
                    }}
                    className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                    disabled={isPathLocked}
                  />
                </label>
              </div>
            )
          },
          {
            key: 'validationDocs',
            label: 'Validation Docs Sources',
            type: 'custom',
            render: () => (
              <div className='space-y-2'>
                <textarea
                  value={validationDocsDraft}
                  onChange={(event) => setValidationDocsDraft(event.target.value)}
                  placeholder='One docs source per line'
                  className='min-h-[92px] w-full rounded-md border border-border bg-card/60 p-2 text-xs text-white'
                  disabled={isPathLocked}
                />
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    className='h-8 rounded-md border border-border px-2 text-[11px] text-gray-200 hover:bg-card/70'
                    onClick={() => {
                      const docsSources = validationDocsDraft
                        .split('\n')
                        .map((value) => value.trim())
                        .filter((value) => value.length > 0);
                      updateAiPathsValidation({ docsSources });
                    }}
                    disabled={isPathLocked}
                  >
                    Apply Docs Sources
                  </Button>
                </div>
              </div>
            )
          },
          {
            key: 'validationCollectionMap',
            label: 'Entity Collection Map',
            type: 'custom',
            render: () => (
              <div className='space-y-2'>
                <textarea
                  value={validationCollectionMapDraft}
                  onChange={(event) =>
                    setValidationCollectionMapDraft(event.target.value)
                  }
                  placeholder='entityType:collection'
                  className='min-h-[92px] w-full rounded-md border border-border bg-card/60 p-2 text-xs text-white'
                  disabled={isPathLocked}
                />
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    className='h-8 rounded-md border border-border px-2 text-[11px] text-gray-200 hover:bg-card/70'
                    onClick={() => {
                      const collectionMap = validationCollectionMapDraft
                        .split('\n')
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0)
                        .reduce<Record<string, string>>((acc, line) => {
                          const [entity, ...collectionParts] = line.split(':');
                          const key = entity?.trim() ?? '';
                          const value = collectionParts.join(':').trim();
                          if (!key || !value) return acc;
                          acc[key] = value;
                          return acc;
                        }, {});
                      updateAiPathsValidation({ collectionMap });
                    }}
                    disabled={isPathLocked}
                  >
                    Apply Collection Map
                  </Button>
                </div>
              </div>
            )
          },
          {
            key: 'validationRules',
            label: 'Validation Rules',
            type: 'custom',
            render: () => (
              <div className='space-y-3'>
                <div className='rounded-md border border-border/60 bg-card/40 p-2'>
                  <div className='mb-2 flex items-center justify-between gap-2'>
                    <div className='text-[11px] font-medium text-gray-200'>
                      Rule Builder (UI-first)
                    </div>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-border px-2 text-[11px] text-gray-200 hover:bg-card/70'
                      onClick={handleRebuildValidationRulesFromDocs}
                      disabled={isPathLocked}
                    >
                      Rebuild From Docs
                    </Button>
                  </div>
                  <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                      Rule title
                      <input
                        type='text'
                        value={validationRuleDraft.title}
                        onChange={(event) =>
                          setValidationRuleDraft((previous) => ({
                            ...previous,
                            title: event.target.value,
                          }))
                        }
                        placeholder='Simulation must have entity ID'
                        className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                      Module
                      <SelectSimple
                        size='sm'
                        value={validationRuleDraft.module}
                        onValueChange={(value: string): void => {
                          if (
                            VALIDATION_MODULE_OPTIONS.some(
                              (entry) => entry.value === value,
                            )
                          ) {
                            setValidationRuleDraft((previous) => ({
                              ...previous,
                              module: value as AiPathsValidationModule,
                            }));
                          }
                        }}
                        options={VALIDATION_MODULE_OPTIONS}
                        triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                      Severity
                      <SelectSimple
                        size='sm'
                        value={validationRuleDraft.severity}
                        onValueChange={(value: string): void => {
                          if (
                            VALIDATION_SEVERITY_OPTIONS.some(
                              (entry) => entry.value === value,
                            )
                          ) {
                            setValidationRuleDraft((previous) => ({
                              ...previous,
                              severity: value as AiPathsValidationSeverity,
                            }));
                          }
                        }}
                        options={VALIDATION_SEVERITY_OPTIONS}
                        triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                      Condition mode
                      <SelectSimple
                        size='sm'
                        value={validationRuleDraft.conditionMode}
                        onValueChange={(value: string): void => {
                          if (value === 'all' || value === 'any') {
                            setValidationRuleDraft((previous) => ({
                              ...previous,
                              conditionMode: value,
                            }));
                          }
                        }}
                        options={[
                          { label: 'All conditions', value: 'all' },
                          { label: 'Any condition', value: 'any' },
                        ]}
                        triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                      Sequence (optional)
                      <input
                        type='number'
                        value={validationRuleDraft.sequence}
                        onChange={(event) =>
                          setValidationRuleDraft((previous) => ({
                            ...previous,
                            sequence: event.target.value,
                          }))
                        }
                        className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                      Weight (optional)
                      <input
                        type='number'
                        value={validationRuleDraft.weight}
                        onChange={(event) =>
                          setValidationRuleDraft((previous) => ({
                            ...previous,
                            weight: event.target.value,
                          }))
                        }
                        className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                      Max score if failed (optional)
                      <input
                        type='number'
                        min={0}
                        max={100}
                        value={validationRuleDraft.forceProbabilityIfFailed}
                        onChange={(event) =>
                          setValidationRuleDraft((previous) => ({
                            ...previous,
                            forceProbabilityIfFailed: event.target.value,
                          }))
                        }
                        className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400 md:col-span-2'>
                      Description (optional)
                      <input
                        type='text'
                        value={validationRuleDraft.description}
                        onChange={(event) =>
                          setValidationRuleDraft((previous) => ({
                            ...previous,
                            description: event.target.value,
                          }))
                        }
                        className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400 md:col-span-2'>
                      Recommendation (optional)
                      <input
                        type='text'
                        value={validationRuleDraft.recommendation}
                        onChange={(event) =>
                          setValidationRuleDraft((previous) => ({
                            ...previous,
                            recommendation: event.target.value,
                          }))
                        }
                        className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400 md:col-span-2'>
                      Applies to node types (comma/pipe/newline)
                      <input
                        type='text'
                        value={validationRuleDraft.appliesToNodeTypes}
                        onChange={(event) =>
                          setValidationRuleDraft((previous) => ({
                            ...previous,
                            appliesToNodeTypes: event.target.value,
                          }))
                        }
                        placeholder='simulation|database'
                        className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                    <label className='flex flex-col gap-1 text-[11px] text-gray-400 md:col-span-2'>
                      Docs bindings (comma/pipe/newline)
                      <input
                        type='text'
                        value={validationRuleDraft.docsBindings}
                        onChange={(event) =>
                          setValidationRuleDraft((previous) => ({
                            ...previous,
                            docsBindings: event.target.value,
                          }))
                        }
                        placeholder='ai-paths:node-docs|ai-paths:quick-wiring'
                        className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                        disabled={isPathLocked}
                      />
                    </label>
                  </div>
                  <div className='mt-3 rounded-md border border-border/60 bg-card/30 p-2'>
                    <div className='mb-2 text-[11px] font-medium text-gray-200'>
                      Condition Builder
                    </div>
                    <div className='grid grid-cols-1 gap-2 md:grid-cols-3'>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        Operator
                        <SelectSimple
                          size='sm'
                          value={validationConditionDraft.operator}
                          onValueChange={(value: string): void => {
                            if (
                              VALIDATION_OPERATOR_OPTIONS.some(
                                (entry) => entry.value === value,
                              )
                            ) {
                              setValidationConditionDraft((previous) => ({
                                ...previous,
                                operator: value as AiPathsValidationOperator,
                              }));
                            }
                          }}
                          options={VALIDATION_OPERATOR_OPTIONS}
                          triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        Field
                        <input
                          type='text'
                          value={validationConditionDraft.field}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              field: event.target.value,
                            }))
                          }
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        Value path
                        <input
                          type='text'
                          value={validationConditionDraft.valuePath}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              valuePath: event.target.value,
                            }))
                          }
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        Expected value
                        <input
                          type='text'
                          value={validationConditionDraft.expected}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              expected: event.target.value,
                            }))
                          }
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        List values
                        <input
                          type='text'
                          value={validationConditionDraft.list}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              list: event.target.value,
                            }))
                          }
                          placeholder='value_a|value_b'
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        Regex flags
                        <input
                          type='text'
                          value={validationConditionDraft.flags}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              flags: event.target.value,
                            }))
                          }
                          placeholder='i'
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        Port
                        <input
                          type='text'
                          value={validationConditionDraft.port}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              port: event.target.value,
                            }))
                          }
                          placeholder='entityId'
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        From port
                        <input
                          type='text'
                          value={validationConditionDraft.fromPort}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              fromPort: event.target.value,
                            }))
                          }
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        To port
                        <input
                          type='text'
                          value={validationConditionDraft.toPort}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              toPort: event.target.value,
                            }))
                          }
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        From node type
                        <input
                          type='text'
                          value={validationConditionDraft.fromNodeType}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              fromNodeType: event.target.value,
                            }))
                          }
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        To node type
                        <input
                          type='text'
                          value={validationConditionDraft.toNodeType}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              toNodeType: event.target.value,
                            }))
                          }
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        Source node ID
                        <input
                          type='text'
                          value={validationConditionDraft.sourceNodeId}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              sourceNodeId: event.target.value,
                            }))
                          }
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-[11px] text-gray-400'>
                        Target node ID
                        <input
                          type='text'
                          value={validationConditionDraft.targetNodeId}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              targetNodeId: event.target.value,
                            }))
                          }
                          className='h-9 rounded-md border border-border bg-card/60 px-2 text-xs text-white'
                          disabled={isPathLocked}
                        />
                      </label>
                    </div>
                    <div className='mt-2 flex items-center justify-between gap-2'>
                      <label className='flex items-center gap-2 text-[11px] text-gray-300'>
                        <input
                          type='checkbox'
                          checked={validationConditionDraft.negate}
                          onChange={(event) =>
                            setValidationConditionDraft((previous) => ({
                              ...previous,
                              negate: event.target.checked,
                            }))
                          }
                          disabled={isPathLocked}
                        />
                        Negate condition
                      </label>
                      <Button
                        type='button'
                        className='h-8 rounded-md border border-border px-2 text-[11px] text-gray-200 hover:bg-card/70'
                        onClick={handleAddValidationConditionDraft}
                        disabled={isPathLocked}
                      >
                        Add Condition
                      </Button>
                    </div>
                    {validationRuleConditionsDraft.length > 0 ? (
                      <div className='mt-2 space-y-1'>
                        {validationRuleConditionsDraft.map((condition) => (
                          <div
                            key={condition.id}
                            className='flex items-center justify-between gap-2 rounded-md border border-border/50 bg-card/60 px-2 py-1 text-[11px]'
                          >
                            <div className='truncate text-gray-200'>
                              {condition.id} · {condition.operator}
                            </div>
                            <Button
                              type='button'
                              className='h-7 rounded-md border border-border px-2 text-[10px] text-gray-200 hover:bg-card/70'
                              onClick={() =>
                                setValidationRuleConditionsDraft((previous) =>
                                  previous.filter(
                                    (entry) => entry.id !== condition.id,
                                  ),
                                )
                              }
                              disabled={isPathLocked}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='mt-2 text-[11px] text-gray-400'>
                        No draft conditions yet.
                      </div>
                    )}
                  </div>
                  <div className='mt-3 flex justify-end'>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-border px-2 text-[11px] text-gray-200 hover:bg-card/70'
                      onClick={handleAddValidationRuleDraft}
                      disabled={isPathLocked}
                    >
                      Add Rule
                    </Button>
                  </div>
                </div>
                <div className='rounded-md border border-border/60 bg-card/40 p-2'>
                  <div className='mb-2 text-[11px] font-medium text-gray-200'>
                    Active Rules ({validationRules.length})
                  </div>
                  {validationRules.length > 0 ? (
                    <div className='max-h-[220px] space-y-1 overflow-y-auto'>
                      {validationRules.map((rule) => (
                        <div
                          key={rule.id}
                          className='rounded-md border border-border/50 bg-card/60 px-2 py-1.5 text-[11px]'
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <div className='font-medium text-gray-100'>{rule.title}</div>
                            <div className='flex items-center gap-1'>
                              <Button
                                type='button'
                                className='h-7 rounded-md border border-border px-2 text-[10px] text-gray-200 hover:bg-card/70'
                                onClick={() =>
                                  handleToggleValidationRuleEnabled(rule.id)
                                }
                                disabled={isPathLocked}
                              >
                                {rule.enabled === false ? 'Enable' : 'Disable'}
                              </Button>
                              <Button
                                type='button'
                                className='h-7 rounded-md border border-border px-2 text-[10px] text-rose-200 hover:bg-rose-500/10'
                                onClick={() => handleDeleteValidationRule(rule.id)}
                                disabled={isPathLocked}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          <div className='mt-0.5 text-gray-400'>
                            {rule.module} · {rule.severity} · seq {rule.sequence ?? 0} ·
                            {` ${rule.conditions.length} condition(s)`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='text-[11px] text-gray-400'>
                      No rules configured.
                    </div>
                  )}
                </div>
                <div className='rounded-md border border-border/60 bg-card/40 p-2'>
                  <div className='mb-2 text-[11px] font-medium text-gray-200'>
                    Advanced Rules JSON
                  </div>
                  <textarea
                    value={validationRulesDraft}
                    onChange={(event) => setValidationRulesDraft(event.target.value)}
                    placeholder='[ { \"id\": \"rule.id\", ... } ]'
                    className='min-h-[160px] w-full rounded-md border border-border bg-card/60 p-2 text-xs text-white'
                    disabled={isPathLocked}
                  />
                  <div className='mt-2 flex justify-end'>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-border px-2 text-[11px] text-gray-200 hover:bg-card/70'
                      onClick={handleApplyValidationRulesJson}
                      disabled={isPathLocked}
                    >
                      Apply Rules JSON
                    </Button>
                  </div>
                </div>
              </div>
            )
          },
          {
            key: 'validationPreview',
            label: 'Validation Preview',
            type: 'custom',
            render: () => (
              <div className='space-y-3'>
                <div className='flex flex-wrap items-center gap-2 text-[11px]'>
                  <StatusBadge
                    status={`Schema v${validationPreflightReport.schemaVersion}`}
                    variant='neutral'
                    size='sm'
                  />
                  <StatusBadge
                    status={`Score: ${validationPreflightReport.score}`}
                    variant={
                      validationPreflightReport.blocked
                        ? 'error'
                        : validationPreflightReport.shouldWarn
                          ? 'warning'
                          : 'success'
                    }
                    size='sm'
                  />
                  <StatusBadge
                    status={`Rules failed: ${validationPreflightReport.failedRules}`}
                    variant={
                      validationPreflightReport.failedRules > 0 ? 'warning' : 'neutral'
                    }
                    size='sm'
                  />
                  <StatusBadge
                    status={`Skipped rules: ${validationPreflightReport.skippedRuleIds.length}`}
                    variant='neutral'
                    size='sm'
                  />
                  <StatusBadge
                    status={
                      validationPreflightReport.blocked
                        ? 'Blocked'
                        : validationPreflightReport.shouldWarn
                          ? 'Warn'
                          : 'Ready'
                    }
                    variant={
                      validationPreflightReport.blocked
                        ? 'error'
                        : validationPreflightReport.shouldWarn
                          ? 'warning'
                          : 'success'
                    }
                    size='sm'
                  />
                </div>
                {validationModuleImpact.length > 0 ? (
                  <div className='rounded-md border border-border/60 bg-card/40 p-2'>
                    <div className='mb-1 text-[11px] font-medium text-gray-200'>
                      Module impact
                    </div>
                    <div className='max-h-[140px] space-y-1 overflow-y-auto'>
                      {validationModuleImpact.map((impact) => (
                        <div
                          key={impact.module}
                          className='rounded-md border border-border/50 bg-card/60 px-2 py-1 text-[11px]'
                        >
                          <div className='font-medium text-gray-100'>
                            {impact.module}
                          </div>
                          <div className='text-gray-400'>
                            eval {impact.rulesEvaluated} · failed {impact.failedRules} ·
                            penalty {impact.scorePenalty}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {validationPreflightReport.findings.length > 0 ? (
                  <div className='max-h-[180px] space-y-1 overflow-y-auto rounded-md border border-border/60 bg-card/40 p-2'>
                    {validationPreflightReport.findings
                      .slice(0, 10)
                      .map((finding) => (
                        <div
                          key={finding.id}
                          className='rounded-md border border-border/50 bg-card/60 px-2 py-1.5 text-[11px]'
                        >
                          <div className='font-medium text-gray-100'>
                            {finding.ruleTitle}
                          </div>
                          <div className='mt-0.5 text-gray-400'>{finding.message}</div>
                          {finding.recommendation ? (
                            <div className='mt-0.5 text-gray-300'>
                              Fix: {finding.recommendation}
                            </div>
                          ) : null}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className='text-[11px] text-emerald-200'>
                    Validation preflight reports no findings for the current graph.
                  </div>
                )}
                {validationPreflightReport.recommendations.length > 0 ? (
                  <div className='rounded-md border border-border/60 bg-card/40 p-2'>
                    <div className='mb-1 text-[11px] font-medium text-gray-200'>
                      Recommendations
                    </div>
                    <div className='max-h-[140px] space-y-1 overflow-y-auto'>
                      {validationPreflightReport.recommendations
                        .slice(0, 8)
                        .map((recommendation) => (
                          <div
                            key={recommendation.id}
                            className='rounded-md border border-border/50 bg-card/60 px-2 py-1 text-[11px]'
                          >
                            <div className='font-medium text-gray-100'>
                              {recommendation.ruleId}
                            </div>
                            <div className='text-gray-300'>
                              {recommendation.recommendation}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          },
          {
            key: 'dependencyReport',
            label: 'Dependency Inspector',
            type: 'custom',
            render: () => (
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2 text-[11px]'>
                  <StatusBadge
                    status={`Warnings: ${dependencyReport.warnings}`}
                    variant={dependencyReport.warnings > 0 ? 'warning' : 'neutral'}
                    size='sm'
                  />
                  <StatusBadge
                    status={`Errors: ${dependencyReport.errors}`}
                    variant={dependencyReport.errors > 0 ? 'error' : 'neutral'}
                    size='sm'
                  />
                  <StatusBadge
                    status={dependencyReport.strictReady ? 'Strict-ready' : 'Action needed'}
                    variant={dependencyReport.strictReady ? 'success' : 'warning'}
                    size='sm'
                  />
                </div>
                {dependencyReport.risks.length > 0 ? (
                  <div className='max-h-[200px] space-y-1 overflow-y-auto rounded-md border border-border/60 bg-card/40 p-2'>
                    {dependencyReport.risks.map((risk) => (
                      <div
                        key={risk.id}
                        className='rounded-md border border-border/50 bg-card/60 px-2 py-1.5 text-[11px]'
                      >
                        <div className='font-medium text-gray-100'>
                          {risk.nodeTitle} · {risk.category}
                        </div>
                        <div className='mt-0.5 text-gray-400'>{risk.message}</div>
                        <div className='mt-0.5 text-gray-300'>Fix: {risk.recommendation}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-[11px] text-emerald-200'>
                    No hidden-dependency risks detected for current wiring.
                  </div>
                )}
              </div>
            )
          },
          {
            key: 'history',
            label: 'History Retention',
            type: 'custom',
            render: () => (
              <SelectSimple
                size='sm'
                value={String(historyRetentionPasses)}
                onValueChange={(value: string): void => {
                  const parsed = Number.parseInt(value, 10);
                  if (!Number.isFinite(parsed) || parsed === historyRetentionPasses) {
                    return;
                  }
                  void handleHistoryRetentionChange(parsed);
                }}
                options={historyRetentionOptions}
                triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                disabled={saving}
              />
            )
          }
        ]}
        values={{
          saveMode: autoSaveLabel,
          execution: executionMode,
          flow: flowIntensity,
          runMode,
          strictFlowMode: strictFlowMode ? 'on' : 'off',
          validationEngine:
            normalizedAiPathsValidation.enabled !== false ? 'on' : 'off',
          validationPolicy:
            normalizedAiPathsValidation.policy ?? 'block_below_threshold',
          validationThresholds: `${normalizedAiPathsValidation.warnThreshold ?? 70}/${normalizedAiPathsValidation.blockThreshold ?? 50}`,
          validationDocs: String(
            normalizedAiPathsValidation.docsSources?.length ?? 0,
          ),
          validationCollectionMap: String(
            Object.keys(normalizedAiPathsValidation.collectionMap ?? {}).length,
          ),
          validationRules: String(normalizedAiPathsValidation.rules?.length ?? 0),
          validationPreview: validationPreflightReport.blocked
            ? 'blocked'
            : validationPreflightReport.shouldWarn
              ? 'warn'
              : 'ready',
          dependencyReport: dependencyReport.strictReady ? 'strict-ready' : 'issues',
          history: String(historyRetentionPasses),
        }}
        onChange={() => {}}
      />
      <SimulationDialog
        isOpen={Boolean(simulationOpenNodeId)}
        onClose={() => setSimulationOpenNodeId(null)}
        onSuccess={() => {}}
        item={simulationNode}
        isPathLocked={isPathLocked}
        onSimulate={async (node, entityId) => {
          const runNode: AiNode = {
            ...node,
            config: {
              ...node.config,
              simulation: {
                ...node.config?.simulation,
                productId: entityId,
                entityId,
                entityType: node.config?.simulation?.entityType ?? 'product',
              },
            },
          };
          setNodes((prev: AiNode[]): AiNode[] =>
            prev.map((n: AiNode): AiNode => (n.id === node.id ? runNode : n)),
          );
          void savePathConfig({
            silent: true,
            includeNodeConfig: true,
            force: true,
            nodeOverride: runNode,
          });
          void runSimulation(runNode);
        }}
        onConfigChange={async (nodeId, entityId) => {
          setNodes((prev: AiNode[]): AiNode[] => {
            const next = prev.map(
              (node: AiNode): AiNode =>
                node.id === nodeId
                  ? {
                    ...node,
                    config: {
                      ...node.config,
                      simulation: {
                        ...node.config?.simulation,
                        productId: entityId,
                        entityId,
                        entityType:
                            node.config?.simulation?.entityType ?? 'product',
                      },
                    },
                  }
                  : node,
            );
            const persistedNode = next.find(
              (node: AiNode): boolean => node.id === nodeId,
            );
            void savePathConfig({
              silent: true,
              includeNodeConfig: true,
              force: true,
              ...(persistedNode ? { nodeOverride: persistedNode } : {}),
            });
            return next;
          });
        }}
      />
      <ConfirmationModal />
    </div>
  );
}
