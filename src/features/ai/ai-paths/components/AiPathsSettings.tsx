"use client";


import { AiPathsSettingsView } from "./ai-paths-settings/AiPathsSettingsView";
import { useAiPathsSettingsState, type AiPathsSettingsState } from "./ai-paths-settings/useAiPathsSettingsState";

type AiPathsSettingsProps = {
  activeTab: "canvas" | "paths" | "docs";
  renderActions?: (actions: React.ReactNode) => React.ReactNode;
  onTabChange?: (tab: "canvas" | "paths" | "docs") => void;
};

export function AiPathsSettings({ activeTab, renderActions, onTabChange }: AiPathsSettingsProps): React.JSX.Element {
  const state: AiPathsSettingsState = useAiPathsSettingsState({ activeTab });

  return (
    <AiPathsSettingsView
      activeTab={activeTab}
      renderActions={renderActions}
      onTabChange={onTabChange}
      state={state}
    />
  );
}
