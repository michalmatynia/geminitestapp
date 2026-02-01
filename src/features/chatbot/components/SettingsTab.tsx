"use client";
import React from "react";
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Checkbox, useToast } from "@/shared/ui";

import Link from "next/link";



import { useChatbotLogic } from "../hooks/useChatbotLogic";

import { AgentCreatorSettingsSection } from "@/features/agentcreator/components/AgentCreatorSettingsSection";
import type { PlaywrightPersona } from "@/features/playwright/types";

type SettingsTabProps = ReturnType<typeof useChatbotLogic>;

export function SettingsTab({
  model,
  setModel,
  modelOptions,
  webSearchEnabled,
  setWebSearchEnabled,
  useGlobalContext,
  setUseGlobalContext,
  useLocalContext,
  setUseLocalContext,
  searchProvider,
  setSearchProvider,
  playwrightPersonaId,
  setPlaywrightPersonaId,
  agentModeEnabled,
  setAgentModeEnabled,
  agentBrowser,
  setAgentBrowser,
  agentRunHeadless,
  setAgentRunHeadless,
  agentIgnoreRobotsTxt,
  setAgentIgnoreRobotsTxt,
  agentRequireHumanApproval,
  setAgentRequireHumanApproval,
  agentMaxSteps,
  setAgentMaxSteps,
  saveChatbotSettings,
  settingsDirty,
  settingsSaving,
}: SettingsTabProps): React.JSX.Element {
  const { toast } = useToast();
  const [personas, setPersonas] = React.useState<PlaywrightPersona[]>([]);
  const [personasLoading, setPersonasLoading] = React.useState<boolean>(true);

  React.useEffect((): (() => void) => {
    let active: boolean = true;
    const loadPersonas = async (): Promise<void> => {
      try {
        const { fetchPlaywrightPersonas } = await import("@/features/playwright/services/playwright-personas");
        const stored = await fetchPlaywrightPersonas();
        if (!active) return;
        setPersonas(stored);
      } catch (error: unknown) {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : "Failed to load personas.";
        toast(message, { variant: "error" });
      } finally {
        if (active) setPersonasLoading(false);
      }
    };
    void loadPersonas();
    return (): void => {
      active = false;
    };
  }, [toast]);

  const handlePersonaChange = (value: string): void => {
    const nextId = value === "custom" ? null : value;
    setPlaywrightPersonaId(nextId);
    const persona = personas.find((item: PlaywrightPersona): boolean => item.id === nextId);
    if (persona) {
      setAgentRunHeadless(persona.settings.headless);
    }
  };

  const selectedPersona =
    personas.find((item: PlaywrightPersona): boolean => item.id === playwrightPersonaId) ?? null;

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">General Settings</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={(value: string): void => setModel(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((opt: string): React.JSX.Element => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Search Provider</Label>
            <Select value={searchProvider} onValueChange={(value: string): void => setSearchProvider(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="serpapi">SerpApi</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="bing">Bing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Label className="flex items-center gap-2 text-sm text-gray-300">
            <Checkbox
              checked={webSearchEnabled} onCheckedChange={(checked: boolean): void => setWebSearchEnabled(Boolean(checked))}
            />
            Enable Web Search
          </Label>
          <Label className="flex items-center gap-2 text-sm text-gray-300">
            <Checkbox
              checked={useGlobalContext} onCheckedChange={(checked: boolean): void => setUseGlobalContext(Boolean(checked))}
            />
            Use Global Context
          </Label>
          <Label className="flex items-center gap-2 text-sm text-gray-300">
            <Checkbox
              checked={useLocalContext} onCheckedChange={(checked: boolean): void => setUseLocalContext(Boolean(checked))}
            />
            Use Local Context
          </Label>
        </div>
      </div>

      <AgentCreatorSettingsSection
        agentModeEnabled={agentModeEnabled}
        setAgentModeEnabled={setAgentModeEnabled}
        agentBrowser={agentBrowser}
        setAgentBrowser={setAgentBrowser}
        agentMaxSteps={agentMaxSteps}
        setAgentMaxSteps={setAgentMaxSteps}
        agentRunHeadless={agentRunHeadless}
        setAgentRunHeadless={setAgentRunHeadless}
        agentIgnoreRobotsTxt={agentIgnoreRobotsTxt}
        setAgentIgnoreRobotsTxt={setAgentIgnoreRobotsTxt}
        agentRequireHumanApproval={agentRequireHumanApproval}
        setAgentRequireHumanApproval={setAgentRequireHumanApproval}
      />

      {agentModeEnabled && (
        <div className="rounded-md border border-border bg-card/60 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Playwright persona
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Choose a shared automation profile for agent runs.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/settings/playwright">Manage personas</Link>
            </Button>
          </div>

          {personasLoading ? (
            <p className="text-xs text-gray-500">Loading personas...</p>
          ) : personas.length === 0 ? (
            <p className="text-xs text-gray-500">
              No personas yet. Create one in settings.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Persona</Label>
                <Select
                  value={playwrightPersonaId ?? "custom"}
                  onValueChange={handlePersonaChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select persona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    {personas.map((persona: PlaywrightPersona): React.JSX.Element => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-500">
                  Selecting a persona updates the headless setting.
                </p>
              </div>
              <div className="rounded-md border border-border bg-card/60 p-3 text-xs text-gray-400">
                {selectedPersona ? (
                  <>
                    <p className="text-xs font-semibold text-gray-200">
                      {selectedPersona.name}
                    </p>
                    <p className="mt-1">
                      {selectedPersona.description ||
                        "No description provided."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-gray-200">
                      Custom settings
                    </p>
                    <p className="mt-1">
                      Pick a persona or keep your own agent preferences.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={(): void => void saveChatbotSettings()}
          disabled={!settingsDirty}
        >
          {settingsSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
