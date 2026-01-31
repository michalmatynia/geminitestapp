"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, PanelLeftClose, PanelRightClose, Settings, Menu } from "lucide-react";
import { Button } from "@/shared/ui";
import { useAdminLayout } from "@/features/admin";
import { PageBuilderProvider, usePageBuilder } from "../../hooks/usePageBuilderContext";
import { useBuilderKeyboardShortcuts } from "../../hooks/useBuilderKeyboardShortcuts";
import { ComponentTreePanel } from "./ComponentTreePanel";
import { PagePreviewPanel } from "./PagePreviewPanel";
import { ComponentSettingsPanel } from "./ComponentSettingsPanel";
import { ThemeSettingsPanel } from "./ThemeSettingsPanel";
import { MenuSettingsPanel } from "./MenuSettingsPanel";

function PageBuilderInner(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const { setIsProgrammaticallyCollapsed } = useAdminLayout();
  useBuilderKeyboardShortcuts();
  const isViewing = state.leftPanelCollapsed && state.rightPanelCollapsed;
  const [leftPanelMode, setLeftPanelMode] = useState<"sections" | "theme" | "menu">("sections");

  useEffect((): (() => void) => {
    setIsProgrammaticallyCollapsed(true);
    return (): void => setIsProgrammaticallyCollapsed(false);
  }, [setIsProgrammaticallyCollapsed]);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-gray-900 text-white">
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left panel toggle (shown when collapsed) */}
        {state.leftPanelCollapsed && !isViewing && (
          <Button
            onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
            size="sm"
            variant="outline"
            className="absolute left-1 top-1 z-10 h-8 w-8 p-0 border text-gray-300 hover:bg-muted/50"
            aria-label="Show left panel"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}

        {/* Left panel: Component tree / Theme settings */}
        <div
          className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            state.leftPanelCollapsed ? "w-0 opacity-0 -translate-x-2 pointer-events-none" : "w-72 opacity-100 translate-x-0"
          }`}
        >
          {leftPanelMode === "sections" && <ComponentTreePanel />}
          {leftPanelMode === "theme" && <ThemeSettingsPanel />}
          {leftPanelMode === "menu" && <MenuSettingsPanel />}
          <div className="absolute right-8 top-1 flex items-center gap-1">
            <Button
              onClick={() => setLeftPanelMode("sections")}
              size="sm"
              variant="ghost"
              className={`h-6 w-6 p-0 ${
                leftPanelMode === "sections"
                  ? "text-gray-500/70"
                  : "text-blue-300 hover:text-blue-200"
              }`}
              title="Back to sections"
              aria-label="Back to sections"
              disabled={leftPanelMode === "sections"}
            >
              <ArrowLeft className="size-3.5" />
            </Button>
            <Button
              onClick={() => setLeftPanelMode("menu")}
              size="sm"
              variant="ghost"
              className={`h-6 w-6 p-0 ${
                leftPanelMode === "menu"
                  ? "text-blue-300 hover:text-blue-200"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title="Menu settings"
              aria-label="Menu settings"
            >
              <Menu className="size-3.5" />
            </Button>
            <Button
              onClick={() => setLeftPanelMode("theme")}
              size="sm"
              variant="ghost"
              className={`h-6 w-6 p-0 ${
                leftPanelMode === "theme"
                  ? "text-blue-300 hover:text-blue-200"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title="Theme settings"
              aria-label="Theme settings"
            >
              <Settings className="size-3.5" />
            </Button>
          </div>
          <Button
            onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1 h-6 w-6 p-0 text-gray-500 hover:text-gray-300"
            aria-label="Hide left panel"
          >
            <PanelLeftClose className="size-3.5" />
          </Button>
        </div>

        {/* Center panel: Preview */}
        <PagePreviewPanel />

        {/* Right panel toggle (shown when collapsed) */}
        {state.rightPanelCollapsed && !isViewing && (
          <Button
            onClick={() => dispatch({ type: "TOGGLE_RIGHT_PANEL" })}
            size="sm"
            variant="outline"
            className="absolute right-1 top-1 z-10 h-8 w-8 p-0 border text-gray-300 hover:bg-muted/50"
            aria-label="Show right panel"
          >
            <PanelRightClose className="size-4" />
          </Button>
        )}

        {/* Right panel: Settings */}
        <div
          className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            state.rightPanelCollapsed ? "w-0 opacity-0 translate-x-2 pointer-events-none" : "w-80 opacity-100 translate-x-0"
          }`}
        >
          <Button
            onClick={() => dispatch({ type: "TOGGLE_RIGHT_PANEL" })}
            size="sm"
            variant="ghost"
            className="absolute left-1 top-1 h-6 w-6 p-0 text-gray-500 hover:text-gray-300"
            aria-label="Hide right panel"
          >
            <PanelRightClose className="size-3.5" />
          </Button>
          <ComponentSettingsPanel />
        </div>
      </div>
    </div>
  );
}

export function PageBuilderLayout(): React.ReactNode {
  return (
    <PageBuilderProvider>
      <PageBuilderInner />
    </PageBuilderProvider>
  );
}
