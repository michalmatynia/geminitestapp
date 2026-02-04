"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain } from "lucide-react";

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
  Textarea,
  useToast,
} from "@/shared/ui";
import { cn } from "@/shared/utils";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";
import { serializeSetting } from "@/shared/utils/settings-json";
import { logClientError } from "@/features/observability";

import {
  AI_BRAIN_SETTINGS_KEY,
  defaultBrainSettings,
  parseBrainSettings,
  resolveBrainAssignment,
  sanitizeBrainAssignment,
  type AiBrainAssignment,
  type AiBrainFeature,
  type AiBrainProvider,
  type AiBrainSettings,
} from "../settings";

type FeatureConfig = {
  key: AiBrainFeature;
  label: string;
  description: string;
};

const FEATURES: FeatureConfig[] = [
  {
    key: "cms_builder",
    label: "CMS Builder",
    description: "Theme/style generation and design assistants inside the CMS Builder.",
  },
  {
    key: "image_studio",
    label: "Image Studio",
    description: "Prompt extraction, UI extractor, and prompt learning for Image Studio.",
  },
  {
    key: "prompt_engine",
    label: "Prompt Engine",
    description: "Validation learning and prompt tooling shared across the app.",
  },
  {
    key: "ai_paths",
    label: "AI Paths",
    description: "Default model settings for AI Paths model nodes.",
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "AI analytics summaries and warnings across the dashboard.",
  },
  {
    key: "system_logs",
    label: "System Logs",
    description: "AI summaries and insights in the System Logs dashboard.",
  },
  {
    key: "error_logs",
    label: "Error Logs",
    description: "AI interpretation and diagnostics for error log entries.",
  },
];

const providerOptions: Array<{ value: AiBrainProvider; label: string }> = [
  { value: "model", label: "Model" },
  { value: "agent", label: "Agent" },
];

const buildAssignment = (): AiBrainAssignment => ({ ...defaultBrainSettings.defaults });

const AssignmentEditor = ({
  assignment,
  onChange,
  readOnly,
}: {
  assignment: AiBrainAssignment;
  onChange: (next: AiBrainAssignment) => void;
  readOnly?: boolean;
}): React.JSX.Element => {
  const updateField = (patch: Partial<AiBrainAssignment>): void => {
    onChange({ ...assignment, ...patch });
  };

  return (
    <div className={cn("grid gap-3", readOnly ? "opacity-70" : "")}
      aria-disabled={!!readOnly}
    >
      <label className="flex items-center gap-2 text-xs text-gray-300">
        <input
          type="checkbox"
          className="h-3 w-3 rounded border-gray-600"
          checked={assignment.enabled}
          onChange={(e) => updateField({ enabled: e.target.checked })}
          disabled={!!readOnly}
        />
        Enabled
      </label>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Provider</Label>
          <Select
            value={assignment.provider}
            onValueChange={(value) => updateField({ provider: value as AiBrainProvider })}
            disabled={!!readOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providerOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Model ID</Label>
          <Input
            value={assignment.modelId}
            onChange={(e) => updateField({ modelId: e.target.value })}
            placeholder="gpt-4o-mini"
            disabled={!!readOnly || assignment.provider !== "model"}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Agent ID</Label>
          <Input
            value={assignment.agentId}
            onChange={(e) => updateField({ agentId: e.target.value })}
            placeholder="agent_xxx"
            disabled={!!readOnly || assignment.provider !== "agent"}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Temperature</Label>
          <Input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={assignment.temperature ?? ""}
            onChange={(e) => updateField({ temperature: e.target.value === "" ? undefined : Number(e.target.value) })}
            disabled={!!readOnly}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Max tokens</Label>
          <Input
            type="number"
            min={1}
            max={8192}
            step={1}
            value={assignment.maxTokens ?? ""}
            onChange={(e) => updateField({ maxTokens: e.target.value === "" ? undefined : Number(e.target.value) })}
            disabled={!!readOnly}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Notes</Label>
        <Textarea
          className="min-h-[72px] text-xs"
          value={assignment.notes ?? ""}
          onChange={(e) => updateField({ notes: e.target.value })}
          placeholder="Optional notes for this assignment"
          disabled={!!readOnly}
        />
      </div>
    </div>
  );
};

export function AdminBrainPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const [settings, setSettings] = useState<AiBrainSettings>(defaultBrainSettings);
  const [overridesEnabled, setOverridesEnabled] = useState<Record<AiBrainFeature, boolean>>({
    cms_builder: false,
    image_studio: false,
    prompt_engine: false,
    ai_paths: false,
    analytics: false,
    system_logs: false,
    error_logs: false,
  });
  const [initializedAt, setInitializedAt] = useState<number | null>(null);

  if (settingsQuery.isSuccess && initializedAt !== settingsQuery.dataUpdatedAt) {
    setInitializedAt(settingsQuery.dataUpdatedAt);
    const parsed = parseBrainSettings(settingsQuery.data.get(AI_BRAIN_SETTINGS_KEY));
    setSettings(parsed);
    setOverridesEnabled({
      cms_builder: Boolean(parsed.assignments.cms_builder),
      image_studio: Boolean(parsed.assignments.image_studio),
      prompt_engine: Boolean(parsed.assignments.prompt_engine),
      ai_paths: Boolean(parsed.assignments.ai_paths),
      analytics: Boolean(parsed.assignments.analytics),
      system_logs: Boolean(parsed.assignments.system_logs),
      error_logs: Boolean(parsed.assignments.error_logs),
    });
  }

  const effectiveAssignments = useMemo(() => {
    return FEATURES.reduce<Record<AiBrainFeature, AiBrainAssignment>>((acc, feature) => {
      acc[feature.key] = resolveBrainAssignment(settings, feature.key);
      return acc;
    }, {} as Record<AiBrainFeature, AiBrainAssignment>);
  }, [settings]);

  const handleDefaultChange = useCallback((next: AiBrainAssignment): void => {
    setSettings((prev) => ({
      ...prev,
      defaults: sanitizeBrainAssignment(next),
    }));
  }, []);

  const handleOverrideChange = useCallback((feature: AiBrainFeature, next: AiBrainAssignment): void => {
    setSettings((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [feature]: sanitizeBrainAssignment(next),
      },
    }));
  }, []);

  const toggleOverride = useCallback((feature: AiBrainFeature, enabled: boolean): void => {
    setOverridesEnabled((prev) => ({ ...prev, [feature]: enabled }));
    if (!enabled) {
      setSettings((prev) => {
        const nextAssignments = { ...prev.assignments };
        delete nextAssignments[feature];
        return { ...prev, assignments: nextAssignments };
      });
    } else {
    setSettings((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [feature]: prev.assignments[feature] ?? resolveBrainAssignment(prev, feature),
      },
    }));
    }
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    try {
      const next: AiBrainSettings = {
        ...settings,
        defaults: sanitizeBrainAssignment(settings.defaults),
        assignments: {
          ...(overridesEnabled.cms_builder ? { cms_builder: sanitizeBrainAssignment(settings.assignments.cms_builder ?? buildAssignment()) } : {}),
          ...(overridesEnabled.image_studio ? { image_studio: sanitizeBrainAssignment(settings.assignments.image_studio ?? buildAssignment()) } : {}),
          ...(overridesEnabled.prompt_engine ? { prompt_engine: sanitizeBrainAssignment(settings.assignments.prompt_engine ?? buildAssignment()) } : {}),
          ...(overridesEnabled.ai_paths ? { ai_paths: sanitizeBrainAssignment(settings.assignments.ai_paths ?? buildAssignment()) } : {}),
          ...(overridesEnabled.analytics ? { analytics: sanitizeBrainAssignment(settings.assignments.analytics ?? buildAssignment()) } : {}),
          ...(overridesEnabled.system_logs ? { system_logs: sanitizeBrainAssignment(settings.assignments.system_logs ?? buildAssignment()) } : {}),
          ...(overridesEnabled.error_logs ? { error_logs: sanitizeBrainAssignment(settings.assignments.error_logs ?? buildAssignment()) } : {}),
        },
      };
      await updateSetting.mutateAsync({
        key: AI_BRAIN_SETTINGS_KEY,
        value: serializeSetting(next),
      });
      toast("Brain settings saved.", { variant: "success" });
    } catch (error) {
      logClientError(error, { context: { source: "AdminBrainPage", action: "save" } });
      toast("Failed to save Brain settings.", { variant: "error" });
    }
  }, [overridesEnabled, settings, toast, updateSetting]);

  const handleReset = useCallback((): void => {
    setSettings(defaultBrainSettings);
    setOverridesEnabled({
      cms_builder: false,
      image_studio: false,
      prompt_engine: false,
      ai_paths: false,
      analytics: false,
      system_logs: false,
      error_logs: false,
    });
  }, []);

  useEffect(() => {
    const raw = settingsQuery.data?.get(AI_BRAIN_SETTINGS_KEY);
    if (!raw && settingsQuery.isSuccess && initializedAt === settingsQuery.dataUpdatedAt) {
      setSettings(defaultBrainSettings);
    }
  }, [initializedAt, settingsQuery.data, settingsQuery.dataUpdatedAt, settingsQuery.isSuccess]);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="System"
        title="Brain"
        icon={<Brain className="size-5 text-emerald-300" />}
        description="Centralized AI steering for the app. Configure defaults and override AI assignments per feature."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? "Saving..." : "Save"}
            </Button>
          </>
        }
      />

      <SectionPanel variant="subtle">
        <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
          <div>Assignments are applied instantly to AI routing across the product.</div>
          <div>Source: {settingsQuery.data?.get(AI_BRAIN_SETTINGS_KEY) ? "saved settings" : "defaults"}</div>
        </div>
      </SectionPanel>

      <SectionPanel>
        <div className="text-xs uppercase text-gray-500">Global defaults</div>
        <div className="mt-2">
          <AssignmentEditor assignment={settings.defaults} onChange={handleDefaultChange} />
        </div>
      </SectionPanel>

      <div className="grid gap-4 md:grid-cols-2">
        {FEATURES.map((feature) => {
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
                    onChange={(e) => toggleOverride(feature.key, e.target.checked)}
                  />
                  Override
                </label>
              </div>

              <div className="mt-3">
                <AssignmentEditor
                  assignment={assignment}
                  onChange={(next) => handleOverrideChange(feature.key, next)}
                  readOnly={!overrideEnabled}
                />
              </div>

              {!overrideEnabled ? (
                <div className="mt-2 text-[11px] text-gray-500">Using global defaults.</div>
              ) : null}
            </SectionPanel>
          );
        })}
      </div>
    </div>
  );
}
