"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChatbotLogic } from "../hooks/useChatbotLogic";

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
  localContextMode,
  setLocalContextMode,
  searchProvider,
  setSearchProvider,
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
}: SettingsTabProps) {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">General Settings</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Search Provider</Label>
            <Select value={searchProvider} onValueChange={setSearchProvider}>
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
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={webSearchEnabled}
              onChange={(e) => setWebSearchEnabled(e.target.checked)}
            />
            Enable Web Search
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={useGlobalContext}
              onChange={(e) => setUseGlobalContext(e.target.checked)}
            />
            Use Global Context
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={useLocalContext}
              onChange={(e) => setUseLocalContext(e.target.checked)}
            />
            Use Local Context
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Agent Settings</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={agentModeEnabled}
              onChange={(e) => setAgentModeEnabled(e.target.checked)}
            />
            Enable Agent Mode
          </label>
        </div>
        {agentModeEnabled && (
          <div className="space-y-4 rounded-md border border-gray-800 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Browser</Label>
                <Select value={agentBrowser} onValueChange={setAgentBrowser}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chromium">Chromium</SelectItem>
                    <SelectItem value="firefox">Firefox</SelectItem>
                    <SelectItem value="webkit">WebKit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Steps</Label>
                <Input
                  type="number"
                  value={agentMaxSteps}
                  onChange={(e) => setAgentMaxSteps(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={agentRunHeadless}
                  onChange={(e) => setAgentRunHeadless(e.target.checked)}
                />
                Run Headless
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={agentIgnoreRobotsTxt}
                  onChange={(e) => setAgentIgnoreRobotsTxt(e.target.checked)}
                />
                Ignore robots.txt
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={agentRequireHumanApproval}
                  onChange={(e) =>
                    setAgentRequireHumanApproval(e.target.checked)
                  }
                />
                Require Approval
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={saveChatbotSettings}
          disabled={!settingsDirty || settingsSaving}
        >
          {settingsSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
