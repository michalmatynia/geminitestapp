'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, Brain, KeyRound, Radar, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AI_INSIGHTS_SETTINGS_KEYS, DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT, DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT } from '@/features/ai/insights/settings';
import { logClientError } from '@/features/observability';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/features/playwright/constants/playwright';
import { useSettingsMap, useUpdateSetting, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import type {
  AiInsightRecord,
  AiPathRuntimeAnalyticsSummary,
  AnalyticsSummaryDto,
  SystemLogMetrics,
} from '@/shared/types';
import {
  Button,
  Input,
  Label,
  SectionHeader,
  SectionPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  UnifiedSelect,
  type SelectOption,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  AI_BRAIN_SETTINGS_KEY,
  defaultBrainProviderCatalog,
  defaultBrainSettings,
  parseBrainProviderCatalog,
  parseBrainSettings,
  resolveBrainAssignment,
  sanitizeBrainAssignment,
  sanitizeBrainProviderCatalog,
  type AiBrainAssignment,
  type AiBrainFeature,
  type AiBrainProvider,
  type AiBrainProviderCatalog,
  type AiBrainSettings,
} from '../settings';

type FeatureConfig = {
  key: AiBrainFeature;
  label: string;
  description: string;
};

type BrainTab = 'routing' | 'providers' | 'reports' | 'metrics';

type InsightsSnapshot = {
  analytics: AiInsightRecord[];
  logs: AiInsightRecord[];
};

type ChatbotModelsResponse = {
  models?: string[];
  warning?: { code?: string; message?: string };
};

const ROUTING_FEATURES: FeatureConfig[] = [
  {
    key: 'cms_builder',
    label: 'CMS Builder',
    description: 'Theme/style generation and design assistants inside the CMS Builder.',
  },
  {
    key: 'image_studio',
    label: 'Image Studio',
    description: 'Prompt extraction, UI extractor, and prompt learning for Image Studio.',
  },
  {
    key: 'prompt_engine',
    label: 'Prompt Engine',
    description: 'Validation learning and prompt tooling shared across the app.',
  },
  {
    key: 'ai_paths',
    label: 'AI Paths',
    description: 'Default model routing for AI Path model nodes and graph actions.',
  },
];

const REPORT_FEATURES: FeatureConfig[] = [
  {
    key: 'analytics',
    label: 'Analytics Reports',
    description: 'AI analytics summaries and warnings across the dashboard.',
  },
  {
    key: 'system_logs',
    label: 'System Logs Reports',
    description: 'AI summaries and insights in the System Logs dashboard.',
  },
  {
    key: 'error_logs',
    label: 'Error Log Interpretation',
    description: 'AI interpretation and diagnostics for individual error entries.',
  },
];

const ALL_FEATURES: FeatureConfig[] = [...ROUTING_FEATURES, ...REPORT_FEATURES];

const defaultOverridesEnabled: Record<AiBrainFeature, boolean> = {
  cms_builder: false,
  image_studio: false,
  prompt_engine: false,
  ai_paths: false,
  analytics: false,
  system_logs: false,
  error_logs: false,
};

const providerOptions: Array<{ value: AiBrainProvider; label: string }> = [
  { value: 'model', label: 'Model' },
  { value: 'agent', label: 'Agent' },
];

const buildAssignment = (): AiBrainAssignment => ({ ...defaultBrainSettings.defaults });

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

const normalizeListFromTextarea = (value: string): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];
  value
    .split('\n')
    .map((item: string) => item.trim())
    .forEach((item: string) => {
      if (!item || seen.has(item)) return;
      seen.add(item);
      next.push(item);
    });
  return next;
};

const serializeListForTextarea = (value: string[]): string =>
  value.join('\n');

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

const formatNumber = (value: number | undefined): string =>
  Number.isFinite(value) ? Number(value).toLocaleString() : '—';

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return 'never';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'never';
  return date.toLocaleString();
};

const formatDurationMs = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value < 1000) return `${Math.round(value)}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0%';
  return `${value.toFixed(1)}%`;
};

const getInsightStatusClass = (status: AiInsightRecord['status']): string => {
  if (status === 'ok') return 'border-emerald-500/40 text-emerald-300';
  if (status === 'warning') return 'border-amber-500/40 text-amber-300';
  return 'border-rose-500/40 text-rose-300';
};

const AssignmentEditor = ({
  assignment,
  onChange,
  readOnly,
  modelQuickPicks,
  agentQuickPicks,
}: {
  assignment: AiBrainAssignment;
  onChange: (next: AiBrainAssignment) => void;
  readOnly?: boolean;
  modelQuickPicks: SelectOption[];
  agentQuickPicks: SelectOption[];
}): React.JSX.Element => {
  const updateField = (patch: Partial<AiBrainAssignment>): void => {
    onChange({ ...assignment, ...patch });
  };

  return (
    <div className={cn('grid gap-3', readOnly ? 'opacity-70' : '')}
      aria-disabled={!!readOnly}
    >
      <label className="flex items-center gap-2 text-xs text-gray-300">
        <input
          type="checkbox"
          className="h-3 w-3 rounded border-gray-600"
          checked={assignment.enabled}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField({ enabled: e.target.checked })}
          disabled={!!readOnly}
        />
        Enabled
      </label>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Provider</Label>
          <Select
            value={assignment.provider}
            onValueChange={(value: string) => updateField({ provider: value as AiBrainProvider })}
            disabled={!!readOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providerOptions.map((opt: { value: AiBrainProvider; label: string }) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Temperature</Label>
          <Input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={assignment.temperature ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField({ temperature: e.target.value === '' ? undefined : Number(e.target.value) })}
            disabled={!!readOnly}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Model ID</Label>
          <Input
            value={assignment.modelId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField({ modelId: e.target.value })}
            placeholder="gpt-4o-mini"
            disabled={!!readOnly || assignment.provider !== 'model'}
          />
          {modelQuickPicks.length > 0 ? (
            <UnifiedSelect
              value=""
              onValueChange={(value: string) => updateField({ modelId: value })}
              options={modelQuickPicks}
              placeholder="Pick model preset"
              disabled={!!readOnly || assignment.provider !== 'model'}
              triggerClassName="h-8 text-[11px]"
            />
          ) : null}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Agent ID</Label>
          <Input
            value={assignment.agentId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField({ agentId: e.target.value })}
            placeholder="agent_xxx"
            disabled={!!readOnly || assignment.provider !== 'agent'}
          />
          {agentQuickPicks.length > 0 ? (
            <UnifiedSelect
              value=""
              onValueChange={(value: string) => updateField({ agentId: value })}
              options={agentQuickPicks}
              placeholder="Pick agent/persona preset"
              disabled={!!readOnly || assignment.provider !== 'agent'}
              triggerClassName="h-8 text-[11px]"
            />
          ) : null}
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-gray-400">Max tokens</Label>
          <Input
            type="number"
            min={1}
            max={8192}
            step={1}
            value={assignment.maxTokens ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField({ maxTokens: e.target.value === '' ? undefined : Number(e.target.value) })}
            disabled={!!readOnly}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Notes</Label>
        <Textarea
          className="min-h-[72px] text-xs"
          value={assignment.notes ?? ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField({ notes: e.target.value })}
          placeholder="Optional notes for this assignment"
          disabled={!!readOnly}
        />
      </div>
    </div>
  );
};

const CatalogEditorField = ({
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  description: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}): React.JSX.Element => (
  <div className="space-y-1">
    <Label className="text-xs text-gray-300">{label}</Label>
    <Textarea
      className="min-h-[108px] font-mono text-xs"
      value={serializeListForTextarea(value)}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(normalizeListFromTextarea(e.target.value))}
      placeholder={placeholder}
    />
    <div className="text-[11px] text-gray-500">{description}</div>
  </div>
);

export function AdminBrainPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const [activeTab, setActiveTab] = useState<BrainTab>('routing');
  const [settings, setSettings] = useState<AiBrainSettings>(defaultBrainSettings);
  const [overridesEnabled, setOverridesEnabled] = useState<Record<AiBrainFeature, boolean>>(defaultOverridesEnabled);
  const [providerCatalog, setProviderCatalog] = useState<AiBrainProviderCatalog>(defaultBrainProviderCatalog);

  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [analyticsScheduleEnabled, setAnalyticsScheduleEnabled] = useState(true);
  const [analyticsScheduleMinutes, setAnalyticsScheduleMinutes] = useState(30);
  const [logsScheduleEnabled, setLogsScheduleEnabled] = useState(true);
  const [logsScheduleMinutes, setLogsScheduleMinutes] = useState(15);
  const [logsAutoOnError, setLogsAutoOnError] = useState(true);
  const [analyticsPromptSystem, setAnalyticsPromptSystem] = useState(DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT);
  const [logsPromptSystem, setLogsPromptSystem] = useState(DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT);

  const hydrateFromSettingsMap = useCallback((map: Map<string, string>): void => {
    const parsedBrain = parseBrainSettings(map.get(AI_BRAIN_SETTINGS_KEY));
    const parsedCatalog = parseBrainProviderCatalog(map.get(AI_BRAIN_PROVIDER_CATALOG_KEY));
    const playwrightPersonaIds = parsePlaywrightPersonaIds(map.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY));
    const mergedCatalog = sanitizeBrainProviderCatalog({
      ...parsedCatalog,
      ...(parsedCatalog.playwrightPersonas.length === 0 && playwrightPersonaIds.length > 0
        ? { playwrightPersonas: playwrightPersonaIds }
        : {}),
    });

    setSettings(parsedBrain);
    setProviderCatalog(mergedCatalog);
    setOverridesEnabled({
      cms_builder: Boolean(parsedBrain.assignments.cms_builder),
      image_studio: Boolean(parsedBrain.assignments.image_studio),
      prompt_engine: Boolean(parsedBrain.assignments.prompt_engine),
      ai_paths: Boolean(parsedBrain.assignments.ai_paths),
      analytics: Boolean(parsedBrain.assignments.analytics),
      system_logs: Boolean(parsedBrain.assignments.system_logs),
      error_logs: Boolean(parsedBrain.assignments.error_logs),
    });

    setOpenaiApiKey(map.get('openai_api_key') ?? '');
    setAnthropicApiKey(map.get('anthropic_api_key') ?? '');
    setGeminiApiKey(map.get('gemini_api_key') ?? '');

    setAnalyticsScheduleEnabled(
      parseBooleanSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled), true)
    );
    setAnalyticsScheduleMinutes(
      parseNumberSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes), 30, 5)
    );
    setLogsScheduleEnabled(
      parseBooleanSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled), true)
    );
    setLogsScheduleMinutes(
      parseNumberSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes), 15, 5)
    );
    setLogsAutoOnError(
      parseBooleanSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError), true)
    );

    setAnalyticsPromptSystem(
      map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem) ??
      DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT
    );
    setLogsPromptSystem(
      map.get(AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem) ??
      DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT
    );
  }, []);

  useEffect(() => {
    if (!settingsQuery.data) return;
    hydrateFromSettingsMap(settingsQuery.data);
  }, [settingsQuery.data, settingsQuery.dataUpdatedAt, hydrateFromSettingsMap]);

  const effectiveAssignments = useMemo((): Record<AiBrainFeature, AiBrainAssignment> => {
    return ALL_FEATURES.reduce<Record<AiBrainFeature, AiBrainAssignment>>((acc: Record<AiBrainFeature, AiBrainAssignment>, feature: FeatureConfig) => {
      acc[feature.key] = resolveBrainAssignment(settings, feature.key);
      return acc;
    }, {} as Record<AiBrainFeature, AiBrainAssignment>);
  }, [settings]);

  const ollamaModelsQuery = useQuery({
    queryKey: ['brain', 'ollama-models'],
    queryFn: async (): Promise<ChatbotModelsResponse> => {
      const res = await fetch('/api/chatbot');
      if (!res.ok) {
        throw new Error('Failed to fetch live Ollama models.');
      }
      return (await res.json()) as ChatbotModelsResponse;
    },
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  });

  const liveOllamaModels = useMemo((): string[] => {
    const models = Array.isArray(ollamaModelsQuery.data?.models)
      ? ollamaModelsQuery.data?.models ?? []
      : [];
    return models
      .map((model: string) => model.trim())
      .filter((model: string) => model.length > 0);
  }, [ollamaModelsQuery.data?.models]);

  const modelQuickPicks = useMemo((): SelectOption[] => {
    const seen = new Set<string>();
    const options: SelectOption[] = [];
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
    append(providerCatalog.modelPresets, 'model preset');
    append(providerCatalog.paidModels, 'paid model');
    append(providerCatalog.ollamaModels, 'ollama');
    append(liveOllamaModels, 'ollama (live)');
    return options;
  }, [liveOllamaModels, providerCatalog]);

  const agentQuickPicks = useMemo((): SelectOption[] => {
    const seen = new Set<string>();
    const options: SelectOption[] = [];
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
    append(providerCatalog.agentModels, 'agent');
    append(providerCatalog.deepthinkingAgents, 'deepthinking');
    append(providerCatalog.playwrightPersonas, 'playwright persona');
    return options;
  }, [providerCatalog]);

  const analyticsSummaryQuery = useQuery({
    queryKey: ['brain', 'metrics', 'analytics-summary'],
    queryFn: async (): Promise<AnalyticsSummaryDto> => {
      const res = await fetch('/api/analytics/summary?range=24h&scope=all');
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to fetch analytics summary.');
      }
      return (await res.json()) as AnalyticsSummaryDto;
    },
    refetchInterval: 30_000,
  });

  const logMetricsQuery = useQuery({
    queryKey: ['brain', 'metrics', 'logs'],
    queryFn: async (): Promise<SystemLogMetrics> => {
      const res = await fetch('/api/system/logs/metrics?level=error');
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to fetch log metrics.');
      }
      const data = (await res.json()) as { metrics?: SystemLogMetrics };
      if (!data.metrics) throw new Error('Missing metrics payload.');
      return data.metrics;
    },
    refetchInterval: 30_000,
  });

  const insightsQuery = useQuery({
    queryKey: ['brain', 'metrics', 'insights'],
    queryFn: async (): Promise<InsightsSnapshot> => {
      const [analyticsRes, logsRes] = await Promise.all([
        fetch('/api/analytics/insights?limit=5'),
        fetch('/api/system/logs/insights?limit=5'),
      ]);
      if (!analyticsRes.ok || !logsRes.ok) {
        throw new Error('Failed to fetch AI insight history.');
      }
      const analyticsData = (await analyticsRes.json()) as { insights?: AiInsightRecord[] };
      const logsData = (await logsRes.json()) as { insights?: AiInsightRecord[] };
      return {
        analytics: analyticsData.insights ?? [],
        logs: logsData.insights ?? [],
      };
    },
    refetchInterval: 30_000,
  });

  const runtimeAnalyticsQuery = useQuery({
    queryKey: ['brain', 'metrics', 'runtime-analytics'],
    queryFn: async (): Promise<AiPathRuntimeAnalyticsSummary> => {
      const res = await fetch('/api/ai-paths/runtime-analytics/summary?range=24h');
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to fetch runtime analytics.');
      }
      const data = (await res.json()) as { summary?: AiPathRuntimeAnalyticsSummary };
      if (!data.summary) throw new Error('Missing runtime analytics payload.');
      return data.summary;
    },
    refetchInterval: 30_000,
  });

  const handleDefaultChange = useCallback((next: AiBrainAssignment): void => {
    setSettings((prev: AiBrainSettings) => ({
      ...prev,
      defaults: sanitizeBrainAssignment(next),
    }));
  }, []);

  const handleOverrideChange = useCallback((feature: AiBrainFeature, next: AiBrainAssignment): void => {
    setSettings((prev: AiBrainSettings) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [feature]: sanitizeBrainAssignment(next),
      },
    }));
  }, []);

  const toggleOverride = useCallback((feature: AiBrainFeature, enabled: boolean): void => {
    setOverridesEnabled((prev: Record<AiBrainFeature, boolean>) => ({ ...prev, [feature]: enabled }));
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

  const handleSave = useCallback(async (): Promise<void> => {
    if (analyticsScheduleMinutes < 5 || logsScheduleMinutes < 5) {
      toast('Schedule interval must be at least 5 minutes.', { variant: 'error' });
      return;
    }

    const nextAssignments = ALL_FEATURES.reduce<Partial<Record<AiBrainFeature, AiBrainAssignment>>>((acc: Partial<Record<AiBrainFeature, AiBrainAssignment>>, feature: FeatureConfig) => {
      if (!overridesEnabled[feature.key]) return acc;
      const assignment = settings.assignments[feature.key] ?? buildAssignment();
      acc[feature.key] = sanitizeBrainAssignment(assignment);
      return acc;
    }, {});

    const nextSettings: AiBrainSettings = {
      ...settings,
      defaults: sanitizeBrainAssignment(settings.defaults),
      assignments: nextAssignments,
    };

    const analyticsAssignment = resolveBrainAssignment(nextSettings, 'analytics');
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
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsProvider, value: logsAssignment.provider },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsModel, value: logsAssignment.modelId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsAgentId, value: logsAssignment.agentId },

        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled, value: String(analyticsScheduleEnabled) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes, value: String(analyticsScheduleMinutes) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled, value: String(logsScheduleEnabled) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes, value: String(logsScheduleMinutes) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError, value: String(logsAutoOnError) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem, value: analyticsPromptSystem.trim() },
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
    setLogsScheduleEnabled(true);
    setLogsScheduleMinutes(15);
    setLogsAutoOnError(true);
    setAnalyticsPromptSystem(DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT);
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
    setProviderCatalog((prev: AiBrainProviderCatalog) =>
      sanitizeBrainProviderCatalog({ ...prev, playwrightPersonas: ids })
    );
    toast('Playwright personas synced into Brain provider catalog.', { variant: 'success' });
  }, [settingsQuery.data, toast]);

  const saving = updateSetting.isPending || updateSettingsBulk.isPending;
  const latestAnalyticsInsight = insightsQuery.data?.analytics?.[0] ?? null;
  const latestLogsInsight = insightsQuery.data?.logs?.[0] ?? null;

  const renderFeatureCards = (features: FeatureConfig[]): React.JSX.Element => (
    <div className="grid gap-4 md:grid-cols-2">
      {features.map((feature: FeatureConfig) => {
        const overrideEnabled = overridesEnabled[feature.key];
        const assignment = overrideEnabled
          ? settings.assignments[feature.key] ?? effectiveAssignments[feature.key]
          : effectiveAssignments[feature.key];
        return (
          <SectionPanel key={feature.key}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-gray-100">{feature.label}</div>
                <div className="text-xs text-gray-400">{feature.description}</div>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-gray-400">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-gray-600"
                  checked={overrideEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleOverride(feature.key, e.target.checked)}
                />
                Override
              </label>
            </div>

            <div className="mt-3">
              <AssignmentEditor
                assignment={assignment}
                onChange={(next: AiBrainAssignment) => handleOverrideChange(feature.key, next)}
                readOnly={!overrideEnabled}
                modelQuickPicks={modelQuickPicks}
                agentQuickPicks={agentQuickPicks}
              />
            </div>

            {!overrideEnabled ? (
              <div className="mt-2 text-[11px] text-gray-500">Using global defaults.</div>
            ) : null}
          </SectionPanel>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="System"
        title="Brain"
        icon={<Brain className="size-5 text-emerald-300" />}
        description="Unified control center for AI routing, provider keys, report schedules, prompt steering, and deep metrics."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      />

      <SectionPanel className="bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-blue-500/10">
        <div className="grid gap-3 text-xs md:grid-cols-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-emerald-300">Brain state</div>
            <div className="mt-1 text-gray-200">
              Source: {settingsQuery.data?.get(AI_BRAIN_SETTINGS_KEY) ? 'saved settings' : 'defaults'}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-cyan-300">Report cadence</div>
            <div className="mt-1 text-gray-200">
              Analytics {analyticsScheduleEnabled ? `every ${analyticsScheduleMinutes}m` : 'paused'} · Logs {logsScheduleEnabled ? `every ${logsScheduleMinutes}m` : 'paused'}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-blue-300">Latest insight</div>
            <div className="mt-1 text-gray-200">
              {latestLogsInsight ? formatDate(latestLogsInsight.createdAt) : 'No insight runs yet'}
            </div>
          </div>
        </div>
      </SectionPanel>

      <Tabs
        value={activeTab}
        onValueChange={(value: string) => setActiveTab(value as BrainTab)}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 md:grid-cols-4">
          <TabsTrigger value="routing" className="gap-2 text-xs md:text-sm">
            <Brain className="size-4" />
            Routing
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2 text-xs md:text-sm">
            <KeyRound className="size-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 text-xs md:text-sm">
            <Sparkles className="size-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2 text-xs md:text-sm">
            <Radar className="size-4" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routing" className="space-y-4">
          <SectionPanel variant="subtle">
            <div className="text-xs text-gray-300">
              Configure global defaults first, then enable per-feature overrides where needed.
            </div>
          </SectionPanel>

          <SectionPanel>
            <div className="text-xs uppercase text-gray-500">Global defaults</div>
            <div className="mt-2">
              <AssignmentEditor
                assignment={settings.defaults}
                onChange={handleDefaultChange}
                modelQuickPicks={modelQuickPicks}
                agentQuickPicks={agentQuickPicks}
              />
            </div>
          </SectionPanel>

          {renderFeatureCards(ROUTING_FEATURES)}
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <SectionPanel variant="subtle">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-cyan-300">Live Ollama discovery</div>
                <div className="mt-1 text-xs text-gray-300">
                  {ollamaModelsQuery.isLoading
                    ? 'Loading live models from Ollama...'
                    : ollamaModelsQuery.error
                      ? ((ollamaModelsQuery.error as Error).message || 'Failed to load Ollama models.')
                      : `${liveOllamaModels.length} live model(s) available for report routing.`}
                </div>
                {ollamaModelsQuery.data?.warning?.message ? (
                  <div className="mt-1 text-[11px] text-amber-300">
                    {ollamaModelsQuery.data.warning.message}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void ollamaModelsQuery.refetch()}
                  disabled={ollamaModelsQuery.isFetching}
                >
                  {ollamaModelsQuery.isFetching ? 'Refreshing...' : 'Refresh Ollama'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setProviderCatalog((prev: AiBrainProviderCatalog) =>
                      sanitizeBrainProviderCatalog({
                        ...prev,
                        ollamaModels: Array.from(new Set([...prev.ollamaModels, ...liveOllamaModels])),
                      })
                    )
                  }
                  disabled={liveOllamaModels.length === 0}
                >
                  Add Live to Catalog
                </Button>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <KeyRound className="size-4 text-emerald-300" />
              Cloud API keys
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">OpenAI API key</Label>
                <Input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Anthropic API key</Label>
                <Input
                  type="password"
                  value={anthropicApiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnthropicApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Gemini API key</Label>
                <Input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGeminiApiKey(e.target.value)}
                  placeholder="AIza..."
                />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Model and Agent Catalog</div>
                <div className="text-xs text-gray-400">
                  Define pools for agent models, deepthinking agents, paid models, Ollama, and Playwright personas.
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={syncPlaywrightPersonas}>
                Sync Playwright Personas
              </Button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <CatalogEditorField
                label="Core model presets"
                description="General model defaults used across the Brain editors."
                value={providerCatalog.modelPresets}
                onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, modelPresets: next }))}
                placeholder="gpt-4o-mini&#10;claude-3-5-sonnet-20241022"
              />
              <CatalogEditorField
                label="Paid models"
                description="Premium models you want to route explicitly."
                value={providerCatalog.paidModels}
                onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, paidModels: next }))}
                placeholder="gpt-4.1&#10;o1-mini"
              />
              <CatalogEditorField
                label="Ollama models"
                description="Local/Ollama model ids (e.g. llama3.1, mistral)."
                value={providerCatalog.ollamaModels}
                onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, ollamaModels: next }))}
                placeholder="llama3.1&#10;mistral"
              />
              <CatalogEditorField
                label="Agent models"
                description="General purpose agent ids."
                value={providerCatalog.agentModels}
                onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, agentModels: next }))}
                placeholder="agent_sales_ops&#10;agent_growth"
              />
              <CatalogEditorField
                label="Deepthinking agents"
                description="Agent ids specialized for deeper multi-step reasoning."
                value={providerCatalog.deepthinkingAgents}
                onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, deepthinkingAgents: next }))}
                placeholder="deepthink_incident&#10;deepthink_forecast"
              />
              <CatalogEditorField
                label="Playwright personas"
                description="Persona ids for tasks that require browser automation."
                value={providerCatalog.playwrightPersonas}
                onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, playwrightPersonas: next }))}
                placeholder="persona_checkout_bot&#10;persona_scraper"
              />
            </div>
          </SectionPanel>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <SectionPanel>
            <div className="text-sm font-semibold text-white">Schedules</div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <SectionPanel variant="subtle-compact" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-200">Analytics insights schedule</div>
                    <div className="text-[11px] text-gray-500">How often analytics reports run.</div>
                  </div>
                  <Switch checked={analyticsScheduleEnabled} onCheckedChange={setAnalyticsScheduleEnabled} />
                </div>
                <Input
                  type="number"
                  min={5}
                  value={analyticsScheduleMinutes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalyticsScheduleMinutes(Number(e.target.value))}
                />
              </SectionPanel>

              <SectionPanel variant="subtle-compact" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-200">System log insights schedule</div>
                    <div className="text-[11px] text-gray-500">How often log reports run.</div>
                  </div>
                  <Switch checked={logsScheduleEnabled} onCheckedChange={setLogsScheduleEnabled} />
                </div>
                <Input
                  type="number"
                  min={5}
                  value={logsScheduleMinutes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLogsScheduleMinutes(Number(e.target.value))}
                />
                <label className="flex items-center justify-between gap-2 text-xs text-gray-300">
                  Auto-run on new errors
                  <Switch checked={logsAutoOnError} onCheckedChange={setLogsAutoOnError} />
                </label>
              </SectionPanel>
            </div>
          </SectionPanel>

          <SectionPanel>
            <div className="text-sm font-semibold text-white">Prompt steering</div>
            <div className="mt-1 text-xs text-gray-400">
              Edit the system prompt used by report generation models. JSON output requirements are enforced automatically.
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Analytics prompt</Label>
                <Textarea
                  className="min-h-[160px] text-xs"
                  value={analyticsPromptSystem}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnalyticsPromptSystem(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Logs prompt</Label>
                <Textarea
                  className="min-h-[160px] text-xs"
                  value={logsPromptSystem}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLogsPromptSystem(e.target.value)}
                />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel variant="subtle">
            <div className="text-sm font-semibold text-white">Default prompts</div>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-400">Show defaults</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-gray-950/50 p-3 text-[11px] text-gray-300">
                  {DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT}
                </pre>
                <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-gray-950/50 p-3 text-[11px] text-gray-300">
                  {DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT}
                </pre>
              </div>
            </details>
          </SectionPanel>

          {renderFeatureCards(REPORT_FEATURES)}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <SectionPanel className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Deep Metrics</div>
              <div className="text-xs text-gray-400">
                Auto-refreshing telemetry from analytics, system logs, and AI insight runs.
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void analyticsSummaryQuery.refetch();
                void logMetricsQuery.refetch();
                void insightsQuery.refetch();
                void runtimeAnalyticsQuery.refetch();
              }}
            >
              Refresh now
            </Button>
          </SectionPanel>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SectionPanel variant="subtle-compact">
              <div className="text-[11px] uppercase text-gray-500">Analytics Events (24h)</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {formatNumber(analyticsSummaryQuery.data?.totals.events)}
              </div>
            </SectionPanel>
            <SectionPanel variant="subtle-compact">
              <div className="text-[11px] uppercase text-gray-500">Visitors (24h)</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {formatNumber(analyticsSummaryQuery.data?.visitors)}
              </div>
            </SectionPanel>
            <SectionPanel variant="subtle-compact">
              <div className="text-[11px] uppercase text-gray-500">Error Logs (24h)</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {formatNumber(logMetricsQuery.data?.last24Hours)}
              </div>
            </SectionPanel>
            <SectionPanel variant="subtle-compact">
              <div className="text-[11px] uppercase text-gray-500">Error Logs (7d)</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {formatNumber(logMetricsQuery.data?.last7Days)}
              </div>
            </SectionPanel>
            <SectionPanel variant="subtle-compact">
              <div className="text-[11px] uppercase text-gray-500">Runtime Runs (24h)</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {formatNumber(runtimeAnalyticsQuery.data?.runs.total)}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                Success {formatPercent(runtimeAnalyticsQuery.data?.runs.successRate)}
              </div>
            </SectionPanel>
            <SectionPanel variant="subtle-compact">
              <div className="text-[11px] uppercase text-gray-500">Brain Reports (24h)</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {formatNumber(runtimeAnalyticsQuery.data?.brain.totalReports)}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                Warn {formatNumber(runtimeAnalyticsQuery.data?.brain.warningReports)} · Err {formatNumber(runtimeAnalyticsQuery.data?.brain.errorReports)}
              </div>
            </SectionPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionPanel>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="size-4 text-cyan-300" />
                Top Analytics Pages (24h)
              </div>
              <div className="mt-3 space-y-2">
                {(analyticsSummaryQuery.data?.topPages ?? []).slice(0, 6).map((entry: { path: string; count: number }) => (
                  <div key={entry.path} className="flex items-center justify-between rounded border border-border/50 bg-gray-950/30 px-3 py-2 text-xs">
                    <span className="truncate text-gray-200">{entry.path || '/'}</span>
                    <span className="text-gray-400">{entry.count}</span>
                  </div>
                ))}
                {(analyticsSummaryQuery.data?.topPages?.length ?? 0) === 0 ? (
                  <div className="text-xs text-gray-500">No analytics page data available.</div>
                ) : null}
              </div>
            </SectionPanel>

            <SectionPanel>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Radar className="size-4 text-amber-300" />
                Top Error Sources (logs)
              </div>
              <div className="mt-3 space-y-2">
                {(logMetricsQuery.data?.topSources ?? []).slice(0, 6).map((entry: { source: string; count: number }) => (
                  <div key={`${entry.source}-${entry.count}`} className="flex items-center justify-between rounded border border-border/50 bg-gray-950/30 px-3 py-2 text-xs">
                    <span className="truncate text-gray-200">{entry.source || 'unknown'}</span>
                    <span className="text-gray-400">{entry.count}</span>
                  </div>
                ))}
                {(logMetricsQuery.data?.topSources?.length ?? 0) === 0 ? (
                  <div className="text-xs text-gray-500">No log source data available.</div>
                ) : null}
              </div>
            </SectionPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionPanel>
              <div className="text-sm font-semibold text-white">Latest Analytics Insight</div>
              {latestAnalyticsInsight ? (
                <div className="mt-3 space-y-2">
                  <div className={cn('inline-flex rounded border px-2 py-1 text-[11px] uppercase', getInsightStatusClass(latestAnalyticsInsight.status))}>
                    {latestAnalyticsInsight.status}
                  </div>
                  <div className="text-xs text-gray-300">{latestAnalyticsInsight.summary}</div>
                  <div className="text-[11px] text-gray-500">
                    {formatDate(latestAnalyticsInsight.createdAt)}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-gray-500">No analytics insights yet.</div>
              )}
            </SectionPanel>

            <SectionPanel>
              <div className="text-sm font-semibold text-white">Latest Log Insight</div>
              {latestLogsInsight ? (
                <div className="mt-3 space-y-2">
                  <div className={cn('inline-flex rounded border px-2 py-1 text-[11px] uppercase', getInsightStatusClass(latestLogsInsight.status))}>
                    {latestLogsInsight.status}
                  </div>
                  <div className="text-xs text-gray-300">{latestLogsInsight.summary}</div>
                  <div className="text-[11px] text-gray-500">
                    {formatDate(latestLogsInsight.createdAt)}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-gray-500">No log insights yet.</div>
              )}
            </SectionPanel>
          </div>

          <SectionPanel>
            <div className="text-sm font-semibold text-white">Runtime Analysis (Redis)</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded border border-border/60 bg-card/60 p-3">
                <div className="text-[10px] uppercase text-gray-500">Queued / Started</div>
                <div className="mt-1 text-sm text-white">
                  {formatNumber(runtimeAnalyticsQuery.data?.runs.queued)} / {formatNumber(runtimeAnalyticsQuery.data?.runs.started)}
                </div>
              </div>
              <div className="rounded border border-border/60 bg-card/60 p-3">
                <div className="text-[10px] uppercase text-gray-500">Completed / Failed</div>
                <div className="mt-1 text-sm text-white">
                  {formatNumber(runtimeAnalyticsQuery.data?.runs.completed)} / {formatNumber(runtimeAnalyticsQuery.data?.runs.failed)}
                </div>
              </div>
              <div className="rounded border border-border/60 bg-card/60 p-3">
                <div className="text-[10px] uppercase text-gray-500">Avg Runtime</div>
                <div className="mt-1 text-sm text-white">
                  {formatDurationMs(runtimeAnalyticsQuery.data?.runs.avgDurationMs)}
                </div>
              </div>
              <div className="rounded border border-border/60 bg-card/60 p-3">
                <div className="text-[10px] uppercase text-gray-500">p95 Runtime</div>
                <div className="mt-1 text-sm text-white">
                  {formatDurationMs(runtimeAnalyticsQuery.data?.runs.p95DurationMs)}
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-gray-500">
              Storage: {runtimeAnalyticsQuery.data?.storage ?? '—'} · Updated {runtimeAnalyticsQuery.data?.generatedAt ? formatDate(runtimeAnalyticsQuery.data.generatedAt) : '—'}
            </div>
          </SectionPanel>

          {analyticsSummaryQuery.error || logMetricsQuery.error || insightsQuery.error || runtimeAnalyticsQuery.error ? (
            <SectionPanel variant="danger">
              <div className="text-sm text-rose-200">
                {(analyticsSummaryQuery.error as Error | null)?.message ??
                  (logMetricsQuery.error as Error | null)?.message ??
                  (insightsQuery.error as Error | null)?.message ??
                  (runtimeAnalyticsQuery.error as Error | null)?.message ??
                  'Failed to load metrics.'}
              </div>
            </SectionPanel>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
