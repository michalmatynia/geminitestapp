"use client";

import React, { useEffect } from "react";
import { PanelLeftClose, PanelRightClose } from "lucide-react";
import { Button } from "@/shared/ui";
import { useAdminLayout } from "@/features/admin";
import { PageBuilderProvider, usePageBuilder } from "../../hooks/usePageBuilderContext";
import { ComponentTreePanel } from "./ComponentTreePanel";
import { PagePreviewPanel } from "./PagePreviewPanel";
import { ComponentSettingsPanel } from "./ComponentSettingsPanel";

function PageBuilderInner(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const { setIsProgrammaticallyCollapsed } = useAdminLayout();

  useEffect((): (() => void) => {
    setIsProgrammaticallyCollapsed(true);
    return (): void => setIsProgrammaticallyCollapsed(false);
  }, [setIsProgrammaticallyCollapsed]);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-900 text-white">
      {/* Left panel toggle (shown when collapsed) */}
      {state.leftPanelCollapsed && (
        <Button
          onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
          size="sm"
          variant="outline"
          className="absolute left-1 top-1 z-10 h-8 w-8 p-0 border text-gray-300 hover:bg-muted/50"
        >
          <PanelLeftClose className="size-4" />
        </Button>
      )}

      {/* Left panel: Component tree */}
      {!state.leftPanelCollapsed && (
        <div className="relative flex">
          <ComponentTreePanel />
          <Button
            onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1 h-6 w-6 p-0 text-gray-500 hover:text-gray-300"
          >
            <PanelLeftClose className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Center panel: Preview */}
      <PagePreviewPanel />

      {/* Right panel toggle (shown when collapsed) */}
      {state.rightPanelCollapsed && (
        <Button
          onClick={() => dispatch({ type: "TOGGLE_RIGHT_PANEL" })}
          size="sm"
          variant="outline"
          className="absolute right-1 top-1 z-10 h-8 w-8 p-0 border text-gray-300 hover:bg-muted/50"
        >
          <PanelRightClose className="size-4" />
        </Button>
      )}

      {/* Right panel: Settings */}
      {!state.rightPanelCollapsed && (
        <div className="relative flex">
          <Button
            onClick={() => dispatch({ type: "TOGGLE_RIGHT_PANEL" })}
            size="sm"
            variant="ghost"
            className="absolute left-1 top-1 h-6 w-6 p-0 text-gray-500 hover:text-gray-300"
          >
            <PanelRightClose className="size-3.5" />
          </Button>
          <ComponentSettingsPanel />
        </div>
      )}
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
