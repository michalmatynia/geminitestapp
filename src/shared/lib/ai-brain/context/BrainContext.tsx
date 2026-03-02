'use client';

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';

import {
  useBrainModels,
  useBrainOperationsOverview,
  useBrainAnalyticsSummary,
  useBrainLogMetrics,
  useBrainInsights,
  useBrainRuntimeAnalytics,
  type BrainOperationsOverviewResponse,
  type BrainModelsResponse,
  type InsightsSnapshot,
} from '@/shared/lib/ai-brain/hooks/useBrainQueries';

export type { BrainModelsResponse, InsightsSnapshot, BrainOperationsOverviewResponse };

import {
  AI_INSIGHTS_SETTINGS_KEYS,
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from '@/shared/contracts/ai-insights';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';
import type { AiPathRuntimeAnalyticsSummary, AnalyticsSummaryDto } from '@/shared/contracts';
import type { BrainOperationsRange } from '@/shared/contracts/ai-brain';
import type { SystemLogMetricsDto as SystemLogMetrics } from '@/shared/contracts/observability';
import type { SingleQuery } from '@/shared/contracts/ui';
import {
  useSettingsMap,
  useUpdateSetting,
  useUpdateSettingsBulk,
} from '@/shared/hooks/use-settings';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useToast, type SelectSimpleOption } from '@/shared/ui';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import {
  appendCatalogPoolValues,
  catalogToEntries,
  entriesToCatalogArrays,
  hasCatalogPoolEntries,
  replaceCatalogPoolValues,
} from '@/shared/lib/ai-brain/catalog-entries';
import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  AI_BRAIN_SETTINGS_KEY,
  BRAIN_CAPABILITY_KEYS,
  defaultBrainProviderCatalog,
  defaultBrainSettings,
  getBrainCapabilityDefinition,
  parseBrainProviderCatalog,
  parseBrainSettings,
  resolveBrainAssignment,
  resolveBrainCapabilityAssignment,
  sanitizeBrainAssignmentForProviders,
  sanitizeBrainProviderCatalog,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
  type AiBrainProvider,
  type AiBrainProviderCatalog,
  type AiBrainSettings,
} from '../settings';

type BrainTab = 'operations' | 'routing' | 'providers' | 'reports' | 'metrics';

const REPORT_FEATURE_KEYS = new Set<AiBrainFeature>([
  'analytics',
  'runtime_analytics',
  'system_logs',
  'error_logs',
]);

const defaultOverridesEnabled: Record<AiBrainFeature, boolean> = {
  cms_builder: false,
  image_studio: false,
  prompt_engine: false,
  ai_paths: false,
  chatbot: false,
  products: false,
  case_resolver: false,
  agent_runtime: false,
  agent_teaching: false,
  analytics: true,
  runtime_analytics: true,
  system_logs: true,
  error_logs: true,
};

const getAllowedProvidersForFeature = (feature: AiBrainFeature): AiBrainProvider[] =>
  feature === 'cms_builder' ? ['model', 'agent'] : ['model'];

const hasAnyBrainOrInsightsSetting = (map: Map<string, string>): boolean => {
  for (const key of map.keys()) {
    if (
      key.startsWith('ai_brain_') ||
      key.startsWith('ai_insights_') ||
      key.startsWith('ai_analytics_') ||
      key.startsWith('ai_runtime_analytics_') ||
      key.startsWith('ai_logs_')
    ) {
      return true;
    }
  }
  return false;
};

const parseBooleanSetting = (value: string | null | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback;
  return value === 'true' || value === '1';
};

const parseNumberSetting = (
  value: string | null | undefined,
  fallback: number,
  min: number = 1
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
};

const parsePlaywrightPersonaIds = (raw: string | null | undefined): string[] => {
  const parsed = parseJsonSetting<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  parsed.forEach((item: unknown) => {
    if (!item || typeof item !== 'object') return;
    const id = (item as { id?: unknown }).id;
    if (typeof id !== 'string') return;
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    ids.push(trimmed);
  });
  return ids;
};

interface BrainContextType {
  // State
  activeTab: BrainTab;
  setActiveTab: (tab: BrainTab) => void;
  settings: AiBrainSettings;
  setSettings: React.Dispatch<React.SetStateAction<AiBrainSettings>>;
  overridesEnabled: Record<AiBrainFeature, boolean>;
  providerCatalog: AiBrainProviderCatalog;
  setProviderCatalog: React.Dispatch<React.SetStateAction<AiBrainProviderCatalog>>;

  // API Keys
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;

  // Schedules
  analyticsScheduleEnabled: boolean;
  setAnalyticsScheduleEnabled: (enabled: boolean) => void;
  analyticsScheduleMinutes: number;
  setAnalyticsScheduleMinutes: (min: number) => void;
  runtimeAnalyticsScheduleEnabled: boolean;
  setRuntimeAnalyticsScheduleEnabled: (enabled: boolean) => void;
  runtimeAnalyticsScheduleMinutes: number;
  setRuntimeAnalyticsScheduleMinutes: (min: number) => void;
  logsScheduleEnabled: boolean;
  setLogsScheduleEnabled: (enabled: boolean) => void;
  logsScheduleMinutes: number;
  setLogsScheduleMinutes: (min: number) => void;
  logsAutoOnError: boolean;
  setLogsAutoOnError: (auto: boolean) => void;

  // Prompts
  analyticsPromptSystem: string;
  setAnalyticsPromptSystem: (prompt: string) => void;
  runtimeAnalyticsPromptSystem: string;
  setRuntimeAnalyticsPromptSystem: (prompt: string) => void;
  logsPromptSystem: string;
  setLogsPromptSystem: (prompt: string) => void;

  // Queries
  ollamaModelsQuery: SingleQuery<BrainModelsResponse>;
  operationsRange: BrainOperationsRange;
  setOperationsRange: (range: BrainOperationsRange) => void;
  operationsOverviewQuery: SingleQuery<BrainOperationsOverviewResponse>;
  analyticsSummaryQuery: SingleQuery<AnalyticsSummaryDto>;
  logMetricsQuery: SingleQuery<SystemLogMetrics>;
  insightsQuery: SingleQuery<InsightsSnapshot>;
  runtimeAnalyticsQuery: SingleQuery<AiPathRuntimeAnalyticsSummary>;

  // Computed
  modelQuickPicks: SelectSimpleOption[];
  agentQuickPicks: SelectSimpleOption[];
  effectiveAssignments: Record<AiBrainFeature, AiBrainAssignment>;
  effectiveCapabilityAssignments: Record<AiBrainCapabilityKey, AiBrainAssignment>;
  runtimeAnalyticsLiveEnabled: boolean;
  saving: boolean;
  liveOllamaModels: string[];

  // Handlers
  handleSave: () => Promise<void>;
  handleReset: () => void;
  handleDefaultChange: (next: AiBrainAssignment) => void;
  handleOverrideChange: (feature: AiBrainFeature, next: AiBrainAssignment) => void;
  handleCapabilityChange: (capability: AiBrainCapabilityKey, next: AiBrainAssignment) => void;
  setCapabilityEnabled: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
  clearCapabilityOverride: (capability: AiBrainCapabilityKey) => void;
  toggleOverride: (feature: AiBrainFeature, enabled: boolean) => void;
  toggleCapabilityOverride: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
  syncPlaywrightPersonas: () => void;
}

const BrainContext = createContext<BrainContextType | undefined>(undefined);

export function useBrain(): BrainContextType {
  const context = useContext(BrainContext);
  if (!context) {
    throw new Error('useBrain must be used within a BrainProvider');
  }
  return context;
}

export function BrainProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const [activeTab, setActiveTab] = useState<BrainTab>('routing');
  const [operationsRange, setOperationsRange] = useState<BrainOperationsRange>('1h');
  const [settings, setSettings] = useState<AiBrainSettings>(defaultBrainSettings);
  const [overridesEnabled, setOverridesEnabled] =
    useState<Record<AiBrainFeature, boolean>>(defaultOverridesEnabled);
  const [providerCatalog, setProviderCatalog] = useState<AiBrainProviderCatalog>(
    defaultBrainProviderCatalog
  );

  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  const [analyticsScheduleEnabled, setAnalyticsScheduleEnabled] = useState(true);
  const [analyticsScheduleMinutes, setAnalyticsScheduleMinutes] = useState(30);
  const [runtimeAnalyticsScheduleEnabled, setRuntimeAnalyticsScheduleEnabled] = useState(true);
  const [runtimeAnalyticsScheduleMinutes, setRuntimeAnalyticsScheduleMinutes] = useState(30);
  const [logsScheduleEnabled, setLogsScheduleEnabled] = useState(true);
  const [logsScheduleMinutes, setLogsScheduleMinutes] = useState(15);
  const [logsAutoOnError, setLogsAutoOnError] = useState(true);

  const [analyticsPromptSystem, setAnalyticsPromptSystem] = useState(
    DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT
  );
  const [runtimeAnalyticsPromptSystem, setRuntimeAnalyticsPromptSystem] = useState(
    DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT
  );
  const [logsPromptSystem, setLogsPromptSystem] = useState(DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT);

  const hydrateFromSettingsMap = useCallback((map: Map<string, string>): void => {
    const parsedBrain = parseBrainSettings(map.get(AI_BRAIN_SETTINGS_KEY));
    const parsedCatalog = parseBrainProviderCatalog(map.get(AI_BRAIN_PROVIDER_CATALOG_KEY));
    const playwrightPersonaIds = parsePlaywrightPersonaIds(
      map.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY)
    );
    const parsedEntries = catalogToEntries(parsedCatalog);
    const mergedEntries =
      !hasCatalogPoolEntries(parsedEntries, 'playwrightPersonas') &&
      playwrightPersonaIds.length > 0
        ? appendCatalogPoolValues(parsedEntries, 'playwrightPersonas', playwrightPersonaIds)
        : parsedEntries;
    const mergedCatalog = sanitizeBrainProviderCatalog({
      ...parsedCatalog,
      entries: mergedEntries,
    });

    setSettings(parsedBrain);
    setProviderCatalog(mergedCatalog);
    setOverridesEnabled({
      cms_builder: Boolean(parsedBrain.assignments.cms_builder),
      image_studio: Boolean(parsedBrain.assignments.image_studio),
      prompt_engine: Boolean(parsedBrain.assignments.prompt_engine),
      ai_paths: Boolean(parsedBrain.assignments.ai_paths),
      chatbot: Boolean(parsedBrain.assignments.chatbot),
      products: Boolean(parsedBrain.assignments.products),
      case_resolver: Boolean(parsedBrain.assignments.case_resolver),
      agent_runtime: Boolean(parsedBrain.assignments.agent_runtime),
      agent_teaching: Boolean(parsedBrain.assignments.agent_teaching),
      analytics: true,
      runtime_analytics: true,
      system_logs: true,
      error_logs: true,
    });

    setOpenaiApiKey(map.get('openai_api_key') ?? '');
    setAnthropicApiKey(map.get('anthropic_api_key') ?? '');
    setGeminiApiKey(map.get('gemini_api_key') ?? '');

    setAnalyticsScheduleEnabled((prev: boolean) =>
      parseBooleanSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled), prev)
    );
    setAnalyticsScheduleMinutes((prev: number) =>
      parseNumberSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes), prev, 5)
    );
    setRuntimeAnalyticsScheduleEnabled((prev: boolean) =>
      parseBooleanSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled), prev)
    );
    setRuntimeAnalyticsScheduleMinutes((prev: number) =>
      parseNumberSetting(
        map.get(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleMinutes),
        prev,
        5
      )
    );
    setLogsScheduleEnabled((prev: boolean) =>
      parseBooleanSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled), prev)
    );
    setLogsScheduleMinutes((prev: number) =>
      parseNumberSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes), prev, 5)
    );
    setLogsAutoOnError((prev: boolean) =>
      parseBooleanSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError), prev)
    );

    setAnalyticsPromptSystem(
      map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem) ??
        DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT
    );
    setRuntimeAnalyticsPromptSystem(
      map.get(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem) ??
        DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT
    );
    setLogsPromptSystem(
      map.get(AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem) ?? DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT
    );
  }, []);

  useEffect(() => {
    if (!settingsQuery.data) return;
    if (!hasAnyBrainOrInsightsSetting(settingsQuery.data)) return;
    hydrateFromSettingsMap(settingsQuery.data);
  }, [settingsQuery.dataUpdatedAt, hydrateFromSettingsMap]);

  const allFeatureKeys: AiBrainFeature[] = [
    'cms_builder',
    'image_studio',
    'products',
    'case_resolver',
    'agent_runtime',
    'agent_teaching',
    'prompt_engine',
    'ai_paths',
    'chatbot',
    'analytics',
    'runtime_analytics',
    'system_logs',
    'error_logs',
  ];

  const effectiveAssignments = useMemo((): Record<AiBrainFeature, AiBrainAssignment> => {
    return allFeatureKeys.reduce<Record<AiBrainFeature, AiBrainAssignment>>(
      (acc: Record<AiBrainFeature, AiBrainAssignment>, key: AiBrainFeature) => {
        acc[key] = resolveBrainAssignment(settings, key);
        return acc;
      },
      {} as Record<AiBrainFeature, AiBrainAssignment>
    );
  }, [settings]);

  const effectiveCapabilityAssignments = useMemo(
    (): Record<AiBrainCapabilityKey, AiBrainAssignment> =>
      BRAIN_CAPABILITY_KEYS.reduce<Record<AiBrainCapabilityKey, AiBrainAssignment>>(
        (acc, key) => {
          acc[key] = resolveBrainCapabilityAssignment(settings, key);
          return acc;
        },
        {} as Record<AiBrainCapabilityKey, AiBrainAssignment>
      ),
    [settings]
  );

  const ollamaModelsQuery = useBrainModels();
  const operationsOverviewQuery = useBrainOperationsOverview({ range: operationsRange });
  const runtimeAnalyticsCapability = useBrainAssignment({
    capability: 'insights.runtime_analytics',
  });
  const aiPathsModelCapability = useBrainAssignment({
    capability: 'ai_paths.model',
  });

  const liveOllamaModels = useMemo((): string[] => {
    const models = Array.isArray(ollamaModelsQuery.data?.sources?.liveOllamaModels)
      ? (ollamaModelsQuery.data?.sources?.liveOllamaModels ?? [])
      : [];
    return models.map((model: string) => model.trim()).filter((model: string) => model.length > 0);
  }, [ollamaModelsQuery.data?.sources?.liveOllamaModels]);

  const modelQuickPicks = useMemo((): SelectSimpleOption[] => {
    const normalizedCatalogArrays = entriesToCatalogArrays(catalogToEntries(providerCatalog));
    const seen = new Set<string>();
    const options: SelectSimpleOption[] = [];
    const append = (values: string[], source: string): void => {
      values.forEach((value: string) => {
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) return;
        seen.add(trimmed);
        options.push({
          value: trimmed,
          label: trimmed,
          description: source,
        });
      });
    };
    append(normalizedCatalogArrays.modelPresets, 'model preset');
    append(normalizedCatalogArrays.paidModels, 'paid model');
    append(normalizedCatalogArrays.ollamaModels, 'ollama');
    append(liveOllamaModels, 'ollama (live)');
    return options;
  }, [liveOllamaModels, providerCatalog]);

  const agentQuickPicks = useMemo((): SelectSimpleOption[] => {
    const normalizedCatalogArrays = entriesToCatalogArrays(catalogToEntries(providerCatalog));
    const seen = new Set<string>();
    const options: SelectSimpleOption[] = [];
    const append = (values: string[], source: string): void => {
      values.forEach((value: string) => {
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) return;
        seen.add(trimmed);
        options.push({
          value: trimmed,
          label: trimmed,
          description: source,
        });
      });
    };
    append(normalizedCatalogArrays.agentModels, 'agent');
    append(normalizedCatalogArrays.deepthinkingAgents, 'deepthinking');
    append(normalizedCatalogArrays.playwrightPersonas, 'playwright persona');
    return options;
  }, [providerCatalog]);

  const analyticsSummaryQuery = useBrainAnalyticsSummary();

  const logMetricsQuery = useBrainLogMetrics();

  const insightsQuery = useBrainInsights();

  const runtimeAnalyticsLiveEnabled =
    runtimeAnalyticsCapability.assignment.enabled && aiPathsModelCapability.assignment.enabled;
  const runtimeAnalyticsQuery = useBrainRuntimeAnalytics(runtimeAnalyticsLiveEnabled);

  const handleDefaultChange = useCallback((next: AiBrainAssignment): void => {
    setSettings((prev: AiBrainSettings) => ({
      ...prev,
      defaults: sanitizeBrainAssignmentForProviders(next, ['model']),
    }));
  }, []);

  const handleOverrideChange = useCallback(
    (feature: AiBrainFeature, next: AiBrainAssignment): void => {
      setSettings((prev: AiBrainSettings) => ({
        ...prev,
        assignments: {
          ...prev.assignments,
          [feature]: sanitizeBrainAssignmentForProviders(
            next,
            getAllowedProvidersForFeature(feature)
          ),
        },
      }));
    },
    []
  );

  const handleCapabilityChange = useCallback(
    (capability: AiBrainCapabilityKey, next: AiBrainAssignment): void => {
      setSettings((prev: AiBrainSettings) => ({
        ...prev,
        capabilities: {
          ...prev.capabilities,
          [capability]: sanitizeBrainAssignmentForProviders(
            next,
            getBrainCapabilityDefinition(capability).policy === 'agent-or-model'
              ? ['model', 'agent']
              : ['model']
          ),
        },
      }));
    },
    []
  );

  const setCapabilityEnabled = useCallback(
    (capability: AiBrainCapabilityKey, enabled: boolean): void => {
      setSettings((prev: AiBrainSettings) => {
        const definition = getBrainCapabilityDefinition(capability);
        const allowedProviders =
          definition.policy === 'agent-or-model' ? (['model', 'agent'] as const) : (['model'] as const);
        const baseAssignment =
          prev.capabilities[capability] ?? resolveBrainCapabilityAssignment(prev, capability);
        const nextAssignment = sanitizeBrainAssignmentForProviders(
          {
            ...baseAssignment,
            enabled,
          },
          [...allowedProviders]
        );

        return {
          ...prev,
          capabilities: {
            ...prev.capabilities,
            [capability]: nextAssignment,
          },
        };
      });
    },
    []
  );

  const clearCapabilityOverride = useCallback((capability: AiBrainCapabilityKey): void => {
    setSettings((prev: AiBrainSettings) => {
      if (!prev.capabilities[capability]) return prev;
      const nextCapabilities = { ...prev.capabilities };
      delete nextCapabilities[capability];
      return {
        ...prev,
        capabilities: nextCapabilities,
      };
    });
  }, []);

  const toggleOverride = useCallback((feature: AiBrainFeature, enabled: boolean): void => {
    setOverridesEnabled((prev: Record<AiBrainFeature, boolean>) => ({
      ...prev,
      [feature]: enabled,
    }));
    if (!enabled) {
      setSettings((prev: AiBrainSettings) => {
        const nextAssignments = { ...prev.assignments };
        delete nextAssignments[feature];
        return { ...prev, assignments: nextAssignments };
      });
      return;
    }
    setSettings((prev: AiBrainSettings) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [feature]: prev.assignments[feature] ?? resolveBrainAssignment(prev, feature),
      },
    }));
  }, []);

  const toggleCapabilityOverride = useCallback(
    (capability: AiBrainCapabilityKey, enabled: boolean): void => {
      if (!enabled) {
        setSettings((prev: AiBrainSettings) => {
          const nextCapabilities = { ...prev.capabilities };
          delete nextCapabilities[capability];
          return {
            ...prev,
            capabilities: nextCapabilities,
          };
        });
        return;
      }

      setSettings((prev: AiBrainSettings) => ({
        ...prev,
        capabilities: {
          ...prev.capabilities,
          [capability]:
            prev.capabilities[capability] ?? resolveBrainCapabilityAssignment(prev, capability),
        },
      }));
    },
    []
  );

  const handleSave = useCallback(async (): Promise<void> => {
    if (
      analyticsScheduleMinutes < 5 ||
      runtimeAnalyticsScheduleMinutes < 5 ||
      logsScheduleMinutes < 5
    ) {
      toast('Schedule interval must be at least 5 minutes.', { variant: 'error' });
      return;
    }

    const nextAssignments = allFeatureKeys.reduce<
      Record<AiBrainFeature, AiBrainAssignment | undefined>
    >(
      (acc: Record<AiBrainFeature, AiBrainAssignment | undefined>, key: AiBrainFeature) => {
        if (!overridesEnabled[key] && !REPORT_FEATURE_KEYS.has(key)) return acc;
        const assignment = settings.assignments[key] ?? resolveBrainAssignment(settings, key);
        acc[key] = sanitizeBrainAssignmentForProviders(
          assignment,
          getAllowedProvidersForFeature(key)
        );
        return acc;
      },
      Object.fromEntries(
        allFeatureKeys.map((key: AiBrainFeature): [AiBrainFeature, undefined] => [key, undefined])
      ) as Record<AiBrainFeature, AiBrainAssignment | undefined>
    );

    const nextSettings: AiBrainSettings = {
      ...settings,
      defaults: sanitizeBrainAssignmentForProviders(settings.defaults, ['model']),
      assignments: nextAssignments,
      capabilities: BRAIN_CAPABILITY_KEYS.reduce<
        Record<AiBrainCapabilityKey, AiBrainAssignment | undefined>
      >(
        (acc, key) => {
          const assignment = settings.capabilities[key];
          acc[key] = assignment
            ? sanitizeBrainAssignmentForProviders(
              assignment,
              getBrainCapabilityDefinition(key).policy === 'agent-or-model'
                ? ['model', 'agent']
                : ['model']
            )
            : undefined;
          return acc;
        },
        Object.fromEntries(
          BRAIN_CAPABILITY_KEYS.map((key): [AiBrainCapabilityKey, undefined] => [key, undefined])
        ) as Record<AiBrainCapabilityKey, AiBrainAssignment | undefined>
      ),
    };

    const analyticsAssignment = resolveBrainAssignment(nextSettings, 'analytics');
    const runtimeAnalyticsAssignment = resolveBrainAssignment(nextSettings, 'runtime_analytics');
    const logsAssignment = resolveBrainAssignment(nextSettings, 'system_logs');

    try {
      await updateSetting.mutateAsync({
        key: AI_BRAIN_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      await updateSetting.mutateAsync({
        key: AI_BRAIN_PROVIDER_CATALOG_KEY,
        value: serializeSetting(sanitizeBrainProviderCatalog(providerCatalog)),
      });

      await updateSettingsBulk.mutateAsync([
        { key: 'openai_api_key', value: openaiApiKey.trim() },
        { key: 'anthropic_api_key', value: anthropicApiKey.trim() },
        { key: 'gemini_api_key', value: geminiApiKey.trim() },

        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsProvider, value: analyticsAssignment.provider },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsModel, value: analyticsAssignment.modelId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsAgentId, value: analyticsAssignment.agentId },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsProvider,
          value: runtimeAnalyticsAssignment.provider,
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsModel,
          value: runtimeAnalyticsAssignment.modelId,
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsAgentId,
          value: runtimeAnalyticsAssignment.agentId,
        },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsProvider, value: logsAssignment.provider },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsModel, value: logsAssignment.modelId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsAgentId, value: logsAssignment.agentId },

        {
          key: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled,
          value: String(analyticsScheduleEnabled),
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes,
          value: String(analyticsScheduleMinutes),
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled,
          value: String(runtimeAnalyticsScheduleEnabled),
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleMinutes,
          value: String(runtimeAnalyticsScheduleMinutes),
        },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled, value: String(logsScheduleEnabled) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes, value: String(logsScheduleMinutes) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError, value: String(logsAutoOnError) },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem,
          value: analyticsPromptSystem.trim(),
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem,
          value: runtimeAnalyticsPromptSystem.trim(),
        },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem, value: logsPromptSystem.trim() },
      ]);

      toast('Brain settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminBrainPage', action: 'save' } });
      toast('Failed to save Brain settings.', { variant: 'error' });
    }
  }, [
    analyticsPromptSystem,
    analyticsScheduleEnabled,
    analyticsScheduleMinutes,
    runtimeAnalyticsPromptSystem,
    runtimeAnalyticsScheduleEnabled,
    runtimeAnalyticsScheduleMinutes,
    logsAutoOnError,
    logsPromptSystem,
    logsScheduleEnabled,
    logsScheduleMinutes,
    openaiApiKey,
    anthropicApiKey,
    geminiApiKey,
    overridesEnabled,
    providerCatalog,
    settings,
    toast,
    updateSetting,
    updateSettingsBulk,
    allFeatureKeys,
  ]);

  const handleReset = useCallback((): void => {
    if (settingsQuery.data) {
      hydrateFromSettingsMap(settingsQuery.data);
      return;
    }
    setSettings(defaultBrainSettings);
    setOverridesEnabled(defaultOverridesEnabled);
    setProviderCatalog(defaultBrainProviderCatalog);
    setOpenaiApiKey('');
    setAnthropicApiKey('');
    setGeminiApiKey('');
    setAnalyticsScheduleEnabled(true);
    setAnalyticsScheduleMinutes(30);
    setRuntimeAnalyticsScheduleEnabled(true);
    setRuntimeAnalyticsScheduleMinutes(30);
    setLogsScheduleEnabled(true);
    setLogsScheduleMinutes(15);
    setLogsAutoOnError(true);
    setAnalyticsPromptSystem(DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT);
    setRuntimeAnalyticsPromptSystem(DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT);
    setLogsPromptSystem(DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT);
  }, [hydrateFromSettingsMap, settingsQuery.data]);

  const syncPlaywrightPersonas = useCallback((): void => {
    if (!settingsQuery.data) {
      toast('Settings are still loading.', { variant: 'error' });
      return;
    }
    const ids = parsePlaywrightPersonaIds(settingsQuery.data.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY));
    if (ids.length === 0) {
      toast('No Playwright personas found to sync.', { variant: 'error' });
      return;
    }
    setProviderCatalog((prev: AiBrainProviderCatalog) => {
      const baseEntries = catalogToEntries(prev);
      const nextEntries = replaceCatalogPoolValues(baseEntries, 'playwrightPersonas', ids);
      return sanitizeBrainProviderCatalog({
        ...prev,
        entries: nextEntries,
      });
    });
    toast('Playwright personas synced into Brain provider catalog.', { variant: 'success' });
  }, [settingsQuery.data, toast]);

  const saving = updateSetting.isPending || updateSettingsBulk.isPending;

  const value = {
    activeTab,
    setActiveTab,
    settings,
    setSettings,
    overridesEnabled,
    providerCatalog,
    setProviderCatalog,
    openaiApiKey,
    setOpenaiApiKey,
    anthropicApiKey,
    setAnthropicApiKey,
    geminiApiKey,
    setGeminiApiKey,
    analyticsScheduleEnabled,
    setAnalyticsScheduleEnabled,
    analyticsScheduleMinutes,
    setAnalyticsScheduleMinutes,
    runtimeAnalyticsScheduleEnabled,
    setRuntimeAnalyticsScheduleEnabled,
    runtimeAnalyticsScheduleMinutes,
    setRuntimeAnalyticsScheduleMinutes,
    logsScheduleEnabled,
    setLogsScheduleEnabled,
    logsScheduleMinutes,
    setLogsScheduleMinutes,
    logsAutoOnError,
    setLogsAutoOnError,
    analyticsPromptSystem,
    setAnalyticsPromptSystem,
    runtimeAnalyticsPromptSystem,
    setRuntimeAnalyticsPromptSystem,
    logsPromptSystem,
    setLogsPromptSystem,
    ollamaModelsQuery,
    operationsRange,
    setOperationsRange,
    operationsOverviewQuery,
    analyticsSummaryQuery,
    logMetricsQuery,
    insightsQuery,
    runtimeAnalyticsQuery,
    modelQuickPicks,
    agentQuickPicks,
    effectiveAssignments,
    effectiveCapabilityAssignments,
    runtimeAnalyticsLiveEnabled,
    saving,
    liveOllamaModels,
    handleSave,
    handleReset,
    handleDefaultChange,
    handleOverrideChange,
    handleCapabilityChange,
    setCapabilityEnabled,
    clearCapabilityOverride,
    toggleOverride,
    toggleCapabilityOverride,
    syncPlaywrightPersonas,
  };

  return <BrainContext.Provider value={value}>{children}</BrainContext.Provider>;
}
