"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, PanelLeftClose, PanelRightClose, Settings, Menu, AppWindow } from "lucide-react";
import { Button } from "@/shared/ui";
import { useAdminLayout } from "@/features/admin";
import { PageBuilderProvider, usePageBuilder } from "../../hooks/usePageBuilderContext";
import { useBuilderKeyboardShortcuts } from "../../hooks/useBuilderKeyboardShortcuts";
import { ComponentTreePanel } from "./ComponentTreePanel";
import { PagePreviewPanel } from "./PagePreviewPanel";
import { ComponentSettingsPanel } from "./ComponentSettingsPanel";
import { ThemeSettingsPanel } from "./ThemeSettingsPanel";
import { ThemeSettingsProvider } from "./ThemeSettingsContext";
import { MenuSettingsPanel } from "./MenuSettingsPanel";
import { AppEmbedsPanel } from "./AppEmbedsPanel";

function PageBuilderInner(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const { setIsProgrammaticallyCollapsed } = useAdminLayout();
  useBuilderKeyboardShortcuts();
  const isViewing = state.leftPanelCollapsed && state.rightPanelCollapsed;
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const autoCollapsedRightRef = useRef(false);
  const wasNarrowRef = useRef<boolean | null>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<"sections" | "theme" | "menu" | "app-embeds">("sections");
  const leftPanelLabel =
    leftPanelMode === "sections"
      ? "Sections"
      : leftPanelMode === "theme"
      ? "Theme settings"
      : leftPanelMode === "menu"
      ? "Menu settings"
      : "App embeds";

  useEffect((): (() => void) => {
    setIsProgrammaticallyCollapsed(true);
    return (): void => setIsProgrammaticallyCollapsed(false);
  }, [setIsProgrammaticallyCollapsed]);

  useEffect((): (() => void) | void => {
    if (typeof window === "undefined") return undefined;
    const breakpoint = 1200;
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const applyBreakpoint = (isNarrow: boolean): void => {
      if (wasNarrowRef.current === isNarrow) return;
      wasNarrowRef.current = isNarrow;

      if (isNarrow) {
        if (!state.rightPanelCollapsed) {
          dispatch({ type: "TOGGLE_RIGHT_PANEL" });
          autoCollapsedRightRef.current = true;
        }
      } else if (autoCollapsedRightRef.current) {
        if (state.rightPanelCollapsed) {
          dispatch({ type: "TOGGLE_RIGHT_PANEL" });
        }
        autoCollapsedRightRef.current = false;
      }
    };

    applyBreakpoint(media.matches);
    const handler = (event: MediaQueryListEvent): void => {
      applyBreakpoint(event.matches);
    };

    media.addEventListener("change", handler);
    return (): void => {
      media.removeEventListener("change", handler);
    };
  }, [dispatch, state.rightPanelCollapsed]);

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
          ref={leftPanelRef}
          onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => {
            event.stopPropagation();
          }}
          className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            state.leftPanelCollapsed ? "w-0 opacity-0 -translate-x-2 pointer-events-none" : "w-72 opacity-100 translate-x-0"
          }`}
        >
          <div className="flex w-72 min-h-0 flex-col border-r border-border bg-gray-900">
            <div className="border-b border-border px-4 py-2">
              <div className="flex items-center justify-end gap-1">
                <Button
                  onClick={() => setLeftPanelMode("sections")}
                  size="icon"
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
                  size="icon"
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
                  onClick={() => setLeftPanelMode("app-embeds")}
                  size="icon"
                  variant="ghost"
                  className={`h-6 w-6 p-0 ${
                    leftPanelMode === "app-embeds"
                      ? "text-blue-300 hover:text-blue-200"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                  title="App embeds"
                  aria-label="App embeds"
                >
                  <AppWindow className="size-3.5" />
                </Button>
                <Button
                  onClick={() => setLeftPanelMode("theme")}
                  size="icon"
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
                <Button
                  onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-gray-500 hover:text-gray-300"
                  aria-label="Hide left panel"
                >
                  <PanelLeftClose className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="px-4 py-2 text-right">
              <h3 className="text-sm font-semibold text-white">{leftPanelLabel}</h3>
            </div>
            {leftPanelMode === "sections" && <ComponentTreePanel />}
            {leftPanelMode === "theme" && <ThemeSettingsPanel showHeader={false} />}
            {leftPanelMode === "menu" && <MenuSettingsPanel showHeader={false} />}
            {leftPanelMode === "app-embeds" && <AppEmbedsPanel showHeader={false} />}
          </div>
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
          ref={rightPanelRef}
          onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => {
            event.stopPropagation();
          }}
          className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            state.rightPanelCollapsed ? "w-0 opacity-0 translate-x-2 pointer-events-none" : "w-80 opacity-100 translate-x-0"
          }`}
        >
          <ComponentSettingsPanel />
        </div>
      </div>
    </div>
  );
}

export function PageBuilderLayout(): React.ReactNode {
  return (
    <PageBuilderProvider>
      <ThemeSettingsProvider>
        <PageBuilderInner />
      </ThemeSettingsProvider>
    </PageBuilderProvider>
  );
}
