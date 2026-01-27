"use client";

import React from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Checkbox } from "@/shared/ui/checkbox";

type AgentCreatorSettingsSectionProps = {
  agentModeEnabled: boolean;
  setAgentModeEnabled: (value: boolean) => void;
  agentBrowser: string;
  setAgentBrowser: (value: string) => void;
  agentMaxSteps: number;
  setAgentMaxSteps: (value: number) => void;
  agentRunHeadless: boolean;
  setAgentRunHeadless: (value: boolean) => void;
  agentIgnoreRobotsTxt: boolean;
  setAgentIgnoreRobotsTxt: (value: boolean) => void;
  agentRequireHumanApproval: boolean;
  setAgentRequireHumanApproval: (value: boolean) => void;
};

export function AgentCreatorSettingsSection({
  agentModeEnabled,
  setAgentModeEnabled,
  agentBrowser,
  setAgentBrowser,
  agentMaxSteps,
  setAgentMaxSteps,
  agentRunHeadless,
  setAgentRunHeadless,
  agentIgnoreRobotsTxt,
  setAgentIgnoreRobotsTxt,
  agentRequireHumanApproval,
  setAgentRequireHumanApproval,
}: AgentCreatorSettingsSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Agent Settings</h3>
      <div className="flex items-center gap-4">
        <Label className="flex items-center gap-2 text-sm text-gray-300">
          <Checkbox
            checked={agentModeEnabled}
            onCheckedChange={(checked) => setAgentModeEnabled(Boolean(checked))}
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
                checked={agentRunHeadless}
                onCheckedChange={(checked) =>
                  setAgentRunHeadless(Boolean(checked))
                }
              />
              Run Headless
            </Label>
            <Label className="flex items-center gap-2 text-sm text-gray-300">
              <Checkbox
                checked={agentIgnoreRobotsTxt}
                onCheckedChange={(checked) =>
                  setAgentIgnoreRobotsTxt(Boolean(checked))
                }
              />
              Ignore robots.txt
            </Label>
            <Label className="flex items-center gap-2 text-sm text-gray-300">
              <Checkbox
                checked={agentRequireHumanApproval}
                onCheckedChange={(checked) =>
                  setAgentRequireHumanApproval(Boolean(checked))
                }
              />
              Require Approval
            </Label>
          </div>
        </div>
      )}
    </div>
  );
}
