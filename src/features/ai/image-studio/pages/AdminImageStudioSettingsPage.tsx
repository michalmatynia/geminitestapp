"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";

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
import { useSettingsStore } from "@/shared/providers/SettingsStoreProvider";
import { serializeSetting } from "@/shared/utils/settings-json";
import { logClientError } from "@/features/observability";

import {
  defaultImageStudioSettings,
  IMAGE_STUDIO_SETTINGS_KEY,
  parseImageStudioSettings,
  type ImageStudioSettings,
} from "../utils/studio-settings";
import {
  defaultPromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
  parsePromptValidationRules,
} from "@/features/prompt-engine/settings";

export function AdminImageStudioSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const heavySettings = useSettingsMap({ scope: "heavy" });
  const updateSetting = useUpdateSetting();

  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [studioSettings, setStudioSettings] = useState<ImageStudioSettings>(defaultImageStudioSettings);
  const [advancedOverridesText, setAdvancedOverridesText] = useState<string>(
    JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2)
  );
  const [advancedOverridesError, setAdvancedOverridesError] = useState<string | null>(null);
  const [promptValidationEnabled, setPromptValidationEnabled] = useState<boolean>(
    defaultPromptEngineSettings.promptValidation.enabled
  );
  const [promptValidationRulesText, setPromptValidationRulesText] = useState<string>(
    JSON.stringify(defaultPromptEngineSettings.promptValidation.rules, null, 2)
  );
  const [promptValidationRulesError, setPromptValidationRulesError] = useState<string | null>(null);

  // Derived state for settings initialization
  const [prevSettingsData, setPrevSettingsData] = useState<unknown>(null);
  const promptEngineRaw = settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY);
  const promptEngineSettings = useMemo(
    () => parsePromptEngineSettings(promptEngineRaw),
    [promptEngineRaw]
  );
  const heavyMap = heavySettings.data ?? new Map<string, string>();

  useEffect(() => {
    if (!heavySettings.data || settingsLoaded) return;
    if (heavySettings.data === prevSettingsData) return;

    setPrevSettingsData(heavySettings.data);

    const stored = parseImageStudioSettings(heavySettings.data.get(IMAGE_STUDIO_SETTINGS_KEY));
    const promptEngineStored = parsePromptEngineSettings(settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY));
    const openaiModelFallback = settingsStore.get("openai_model");

    const hydrated: ImageStudioSettings =
      openaiModelFallback && stored.targetAi.openai.model === defaultImageStudioSettings.targetAi.openai.model
        ? {
            ...stored,
            targetAi: {
              ...stored.targetAi,
              openai: {
                ...stored.targetAi.openai,
                model: openaiModelFallback,
              },
            },
          }
        : stored;

    setStudioSettings(hydrated);
    setAdvancedOverridesText(JSON.stringify(hydrated.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setPromptValidationEnabled(promptEngineStored.promptValidation.enabled);
    setPromptValidationRulesText(JSON.stringify(promptEngineStored.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
    setSettingsLoaded(true);
  }, [heavySettings.data, prevSettingsData, settingsLoaded, settingsStore]);

  const handleRefresh = useCallback((): void => {
    setSettingsLoaded(false);
    void settingsStore.refetch();
    void heavySettings.refetch();
  }, [settingsStore, heavySettings]);

  const handleAdvancedOverridesChange = useCallback((raw: string): void => {
    setAdvancedOverridesText(raw);
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null) {
        setAdvancedOverridesError(null);
        setStudioSettings((prev: ImageStudioSettings) => ({
          ...prev,
          targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, advanced_overrides: null } },
        }));
        return;
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setAdvancedOverridesError("Must be a JSON object (or null).");
        return;
      }
      setAdvancedOverridesError(null);
      setStudioSettings((prev: ImageStudioSettings) => ({
        ...prev,
        targetAi: {
          ...prev.targetAi,
          openai: { ...prev.targetAi.openai, advanced_overrides: parsed as Record<string, unknown> },
        },
      }));
    } catch {
      setAdvancedOverridesError("Invalid JSON.");
    }
  }, []);

  const handlePromptValidationRulesChange = useCallback((raw: string): void => {
    setPromptValidationRulesText(raw);
    const parsed = parsePromptValidationRules(raw);
    if (!parsed.ok) {
      setPromptValidationRulesError(parsed.error);
      return;
    }
    setPromptValidationRulesError(null);
  }, []);

  const saveStudioSettings = useCallback(async (): Promise<void> => {
    if (advancedOverridesError) {
      toast(`Settings not saved: ${advancedOverridesError}`, { variant: "error" });
      return;
    }
    if (promptValidationRulesError) {
      toast(`Settings not saved: ${promptValidationRulesError}`, { variant: "error" });
      return;
    }

    if (studioSettings.promptExtraction.mode === "gpt" && !studioSettings.promptExtraction.gpt.model.trim()) {
      toast("Prompt extract model is required when prompt extraction mode is GPT.", { variant: "error" });
      return;
    }

    if (!studioSettings.targetAi.openai.model.trim()) {
      toast("Target AI model is required.", { variant: "error" });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: IMAGE_STUDIO_SETTINGS_KEY,
        value: serializeSetting(studioSettings),
      });
      const parsedRules = parsePromptValidationRules(promptValidationRulesText);
      if (!parsedRules.ok) {
        throw new Error(parsedRules.error);
      }
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting({
          ...promptEngineSettings,
          promptValidation: {
            ...promptEngineSettings.promptValidation,
            enabled: promptValidationEnabled,
            rules: parsedRules.rules,
          },
        }),
      });
      toast("Image Studio settings saved.", { variant: "success" });
    } catch (error) {
      logClientError(error, { context: { source: "AdminImageStudioSettingsPage", action: "saveSettings" } });
      toast("Failed to save Image Studio settings.", { variant: "error" });
    }
  }, [
    advancedOverridesError,
    promptValidationEnabled,
    promptValidationRulesError,
    studioSettings,
    promptValidationRulesText,
    promptEngineSettings,
    toast,
    updateSetting,
  ]);

  const resetStudioSettings = useCallback((): void => {
    setStudioSettings(defaultImageStudioSettings);
    setAdvancedOverridesText(JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setAdvancedOverridesError(null);
    setPromptValidationEnabled(defaultPromptEngineSettings.promptValidation.enabled);
    setPromptValidationRulesText(JSON.stringify(defaultPromptEngineSettings.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
  }, []);

  const studioSettingsRaw = heavyMap.get(IMAGE_STUDIO_SETTINGS_KEY);

  const settingsSource = useMemo(() => {
    return studioSettingsRaw ? "saved settings" : "defaults";
  }, [studioSettingsRaw]);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="AI · Image Studio"
        title="Settings"
        description="Configure prompt extraction, prompt validation, and target AI defaults."
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/image-studio">Back to Studio</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/prompt-engine/validation">Global Validation Patterns</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleRefresh()}
              disabled={settingsStore.isFetching}
              title="Reload settings"
            >
              <RefreshCcw className={cn("mr-2 size-4", settingsStore.isFetching ? "animate-spin" : "")} />
              Refresh
            </Button>
          </>
        }
      />

      <SectionPanel variant="subtle">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-gray-300">Studio Settings</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetStudioSettings}
              disabled={updateSetting.isPending}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => void saveStudioSettings()}
              disabled={updateSetting.isPending || Boolean(advancedOverridesError) || Boolean(promptValidationRulesError)}
            >
              {updateSetting.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="mt-1 text-[11px] text-gray-500">
          Source: {settingsSource}
        </div>

        {settingsStore.isLoading && !settingsLoaded ? (
          <div className="mt-2 text-xs text-gray-500">Loading settings…</div>
        ) : null}

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Prompt Extraction</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Mode</div>
                <Select
                  value={studioSettings.promptExtraction.mode}
                  onValueChange={(value: string) =>
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      promptExtraction: {
                        ...prev.promptExtraction,
                        mode: value === "gpt" ? "gpt" : "programmatic",
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programmatic">Programmatic</SelectItem>
                    <SelectItem value="gpt">GPT (AI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Model</div>
                <Input
                  value={studioSettings.promptExtraction.gpt.model}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      promptExtraction: {
                        ...prev.promptExtraction,
                        gpt: { ...prev.promptExtraction.gpt, model: e.target.value },
                      },
                    }))
                  }
                  className="h-8"
                  placeholder="e.g. gpt-4o-mini"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Temperature</div>
                <Input
                  type="number"
                  value={studioSettings.promptExtraction.gpt.temperature ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    const next = raw === "" ? null : Number(raw);
                    if (raw !== "" && !Number.isFinite(next)) return;
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      promptExtraction: {
                        ...prev.promptExtraction,
                        gpt: { ...prev.promptExtraction.gpt, temperature: next },
                      },
                    }));
                  }}
                  className="h-8"
                  min={0}
                  max={2}
                  step={0.1}
                />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Top P</div>
                <Input
                  type="number"
                  value={studioSettings.promptExtraction.gpt.top_p ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    const next = raw === "" ? null : Number(raw);
                    if (raw !== "" && !Number.isFinite(next)) return;
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      promptExtraction: {
                        ...prev.promptExtraction,
                        gpt: { ...prev.promptExtraction.gpt, top_p: next },
                      },
                    }));
                  }}
                  className="h-8"
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Max Output Tokens</div>
                <Input
                  type="number"
                  value={studioSettings.promptExtraction.gpt.max_output_tokens ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    const next = raw === "" ? null : Number(raw);
                    if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      promptExtraction: {
                        ...prev.promptExtraction,
                        gpt: { ...prev.promptExtraction.gpt, max_output_tokens: next },
                      },
                    }));
                  }}
                  className="h-8"
                  min={1}
                  step={1}
                />
              </div>
              <div className="text-[11px] text-gray-500">
                Used by the AI extract button in Image Studio.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-gray-400">Prompt Validator</Label>
              <label className="flex items-center gap-2 text-xs text-gray-200">
                <input
                  type="checkbox"
                  checked={promptValidationEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPromptValidationEnabled(e.target.checked)
                  }
                />
                Enabled
              </label>
            </div>
            <div className="text-[11px] text-gray-500">
              Validates programmatic prompts and suggests fixes when patterns look almost correct. Auto format uses each rule’s <span className="text-gray-300">autofix</span> operations.
            </div>
            <Textarea
              value={promptValidationRulesText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handlePromptValidationRulesChange(e.target.value)}
              className="h-40 font-mono text-[11px]"
              placeholder="JSON array of validator rules"
            />
            {promptValidationRulesError ? (
              <div className="text-[11px] text-red-300">{promptValidationRulesError}</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Target AI (OpenAI / GPT)</Label>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">API</div>
                <Select
                  value={studioSettings.targetAi.openai.api}
                  onValueChange={(value: string) =>
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, api: value === "responses" ? "responses" : "images" } },
                    }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="images">Images</SelectItem>
                    <SelectItem value="responses">Responses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Model</div>
                <Input
                  value={studioSettings.targetAi.openai.model}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, model: e.target.value } },
                    }))
                  }
                  className="h-8"
                  placeholder={studioSettings.targetAi.openai.api === "images" ? "e.g. gpt-image-1" : "e.g. gpt-4o-mini"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Temperature</div>
                <Input
                  type="number"
                  value={studioSettings.targetAi.openai.temperature ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    const next = raw === "" ? null : Number(raw);
                    if (raw !== "" && !Number.isFinite(next)) return;
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, temperature: next } },
                    }));
                  }}
                  className="h-8"
                  min={0}
                  max={2}
                  step={0.1}
                />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Top P</div>
                <Input
                  type="number"
                  value={studioSettings.targetAi.openai.top_p ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    const next = raw === "" ? null : Number(raw);
                    if (raw !== "" && !Number.isFinite(next)) return;
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, top_p: next } },
                    }));
                  }}
                  className="h-8"
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Max Output Tokens</div>
                <Input
                  type="number"
                  value={studioSettings.targetAi.openai.max_output_tokens ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    const next = raw === "" ? null : Number(raw);
                    if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, max_output_tokens: next } },
                    }));
                  }}
                  className="h-8"
                  min={1}
                  step={1}
                />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Seed</div>
                <Input
                  type="number"
                  value={studioSettings.targetAi.openai.seed ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    const next = raw === "" ? null : Number(raw);
                    if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, seed: next } },
                    }));
                  }}
                  className="h-8"
                  step={1}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Presence Penalty</div>
                <Input
                  type="number"
                  value={studioSettings.targetAi.openai.presence_penalty ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    const next = raw === "" ? null : Number(raw);
                    if (raw !== "" && !Number.isFinite(next)) return;
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, presence_penalty: next } },
                    }));
                  }}
                  className="h-8"
                  min={-2}
                  max={2}
                  step={0.1}
                />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Frequency Penalty</div>
                <Input
                  type="number"
                  value={studioSettings.targetAi.openai.frequency_penalty ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    const next = raw === "" ? null : Number(raw);
                    if (raw !== "" && !Number.isFinite(next)) return;
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, frequency_penalty: next } },
                    }));
                  }}
                  className="h-8"
                  min={-2}
                  max={2}
                  step={0.1}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-200">
                <input
                  type="checkbox"
                  checked={studioSettings.targetAi.openai.stream}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, stream: e.target.checked } },
                    }))
                  }
                />
                Stream
              </label>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Tool Choice</div>
                <Select
                  value={studioSettings.targetAi.openai.tool_choice ?? "__null__"}
                  onValueChange={(value: string) =>
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: {
                        ...prev.targetAi,
                        openai: { ...prev.targetAi.openai, tool_choice: value === "__null__" ? null : value === "none" ? "none" : "auto" },
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__null__">Default</SelectItem>
                    <SelectItem value="auto">auto</SelectItem>
                    <SelectItem value="none">none</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Reasoning Effort</div>
                <Select
                  value={studioSettings.targetAi.openai.reasoning_effort ?? "__null__"}
                  onValueChange={(value: string) =>
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: {
                        ...prev.targetAi,
                        openai: {
                          ...prev.targetAi.openai,
                          reasoning_effort: value === "__null__" ? null : (value as ImageStudioSettings["targetAi"]["openai"]["reasoning_effort"]),
                        },
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__null__">Default</SelectItem>
                    <SelectItem value="low">low</SelectItem>
                    <SelectItem value="medium">medium</SelectItem>
                    <SelectItem value="high">high</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">Response Format</div>
                <Select
                  value={studioSettings.targetAi.openai.response_format ?? "__null__"}
                  onValueChange={(value: string) =>
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: {
                        ...prev.targetAi,
                        openai: {
                          ...prev.targetAi.openai,
                          response_format: value === "__null__" ? null : value === "json" ? "json" : "text",
                        },
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__null__">Default</SelectItem>
                    <SelectItem value="text">text</SelectItem>
                    <SelectItem value="json">json</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500">User (optional)</div>
                <Input
                  value={studioSettings.targetAi.openai.user ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStudioSettings((prev: ImageStudioSettings) => ({
                      ...prev,
                      targetAi: {
                        ...prev.targetAi,
                        openai: { ...prev.targetAi.openai, user: e.target.value.trim() ? e.target.value : null },
                      },
                    }))
                  }
                  className="h-8"
                  placeholder="e.g. user_123"
                />
              </div>
              <div className="text-[11px] text-gray-500">
                Tip: store your API key at <span className="text-gray-300">/admin/settings/ai</span>.
              </div>
            </div>

            {studioSettings.targetAi.openai.api === "images" ? (
              <div className="space-y-2 rounded border border-border/60 bg-card/30 p-2">
                <div className="text-xs text-gray-400">Images API options</div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[11px] text-gray-500">Size</div>
                    <Input
                      value={studioSettings.targetAi.openai.image.size ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          targetAi: {
                            ...prev.targetAi,
                            openai: {
                              ...prev.targetAi.openai,
                              image: { ...prev.targetAi.openai.image, size: e.target.value.trim() ? e.target.value : null },
                            },
                          },
                        }))
                      }
                      className="h-8"
                      placeholder="e.g. 1536x1024"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] text-gray-500">Quality</div>
                    <Select
                      value={studioSettings.targetAi.openai.image.quality ?? "__null__"}
                      onValueChange={(value: string) =>
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          targetAi: {
                            ...prev.targetAi,
                            openai: {
                              ...prev.targetAi.openai,
                              image: {
                                ...prev.targetAi.openai.image,
                                quality: value === "__null__" ? null : value === "high" ? "high" : "standard",
                              },
                            },
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__null__">Default</SelectItem>
                        <SelectItem value="standard">standard</SelectItem>
                        <SelectItem value="high">high</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[11px] text-gray-500">Background</div>
                    <Select
                      value={studioSettings.targetAi.openai.image.background ?? "__null__"}
                      onValueChange={(value: string) =>
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          targetAi: {
                            ...prev.targetAi,
                            openai: {
                              ...prev.targetAi.openai,
                              image: {
                                ...prev.targetAi.openai.image,
                                background: value === "__null__" ? null : value === "transparent" ? "transparent" : "white",
                              },
                            },
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__null__">Default</SelectItem>
                        <SelectItem value="white">white</SelectItem>
                        <SelectItem value="transparent">transparent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] text-gray-500">Format</div>
                    <Select
                      value={studioSettings.targetAi.openai.image.format ?? "png"}
                      onValueChange={(value: string) =>
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          targetAi: {
                            ...prev.targetAi,
                            openai: {
                              ...prev.targetAi.openai,
                              image: { ...prev.targetAi.openai.image, format: value === "jpeg" ? "jpeg" : "png" },
                            },
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">png</SelectItem>
                        <SelectItem value="jpeg">jpeg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[11px] text-gray-500">N</div>
                    <Input
                      type="number"
                      value={studioSettings.targetAi.openai.image.n ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const raw = e.target.value;
                        const next = raw === "" ? null : Number(raw);
                        if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                        setStudioSettings((prev: ImageStudioSettings) => ({
                          ...prev,
                          targetAi: {
                            ...prev.targetAi,
                            openai: {
                              ...prev.targetAi.openai,
                              image: { ...prev.targetAi.openai.image, n: next },
                            },
                          },
                        }));
                      }}
                      className="h-8"
                      min={1}
                      step={1}
                    />
                  </div>
                  <div className="text-[11px] text-gray-500">
                    For edits, keep <span className="text-gray-300">N=1</span>.
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Advanced Overrides (JSON)</div>
              <Textarea
                value={advancedOverridesText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAdvancedOverridesChange(e.target.value)}
                className="h-28 font-mono text-[11px]"
                placeholder='e.g. {"metadata":{"project":"milkbar-001"}}'
              />
              {advancedOverridesError ? (
                <div className="text-[11px] text-red-300">{advancedOverridesError}</div>
              ) : null}
            </div>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}
