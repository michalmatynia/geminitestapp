"use client";

import React from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useChatbotLogic } from "../hooks/useChatbotLogic";
import { Checkbox } from "@/shared/ui/checkbox";

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
          <Label className="flex items-center gap-2 text-sm text-gray-300">
            <Checkbox
              checked={webSearchEnabled} onCheckedChange={(checked) => setWebSearchEnabled(Boolean(checked))}
            />
            Enable Web Search
          </Label>
          <Label className="flex items-center gap-2 text-sm text-gray-300">
            <Checkbox
              checked={useGlobalContext} onCheckedChange={(checked) => setUseGlobalContext(Boolean(checked))}
            />
            Use Global Context
          </Label>
          <Label className="flex items-center gap-2 text-sm text-gray-300">
            <Checkbox
              checked={useLocalContext} onCheckedChange={(checked) => setUseLocalContext(Boolean(checked))}
            />
            Use Local Context
          </Label>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Agent Settings</h3>
        <div className="flex items-center gap-4">
          <Label className="flex items-center gap-2 text-sm text-gray-300">
            <Checkbox
              checked={agentModeEnabled} onCheckedChange={(checked) => setAgentModeEnabled(Boolean(checked))}
            />
            Enable Agent Mode
          </Label>
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
              <Label className="flex items-center gap-2 text-sm text-gray-300">
                <Checkbox
                  checked={agentRunHeadless} onCheckedChange={(checked) => setAgentRunHeadless(Boolean(checked))}
                />
                Run Headless
              </Label>
              <Label className="flex items-center gap-2 text-sm text-gray-300">
                <Checkbox
                  checked={agentIgnoreRobotsTxt} onCheckedChange={(checked) => setAgentIgnoreRobotsTxt(Boolean(checked))}
                />
                Ignore robots.txt
              </Label>
              <Label className="flex items-center gap-2 text-sm text-gray-300">
                <Checkbox
                  checked={agentRequireHumanApproval} onCheckedChange={(checked) =>
                    setAgentRequireHumanApproval(Boolean(checked))
                  }
                />
                Require Approval
              </Label>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => void saveChatbotSettings()}
          disabled={!settingsDirty}
        >
          {settingsSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
