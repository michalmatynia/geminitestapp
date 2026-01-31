import { renderHook } from "@testing-library/react";
import { useBuilderKeyboardShortcuts } from "@/features/cms/hooks/useBuilderKeyboardShortcuts";
import { usePageBuilder } from "@/features/cms/hooks/usePageBuilderContext";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/features/cms/hooks/usePageBuilderContext", () => ({
  usePageBuilder: vi.fn(),
}));

describe("useBuilderKeyboardShortcuts Hook", () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (usePageBuilder as any).mockReturnValue({
      state: { selectedNodeId: "node-1", selectedEdgeId: null },
      dispatch: mockDispatch,
    });
  });

  it("should dispatch UNDO on Ctrl+Z", () => {
    renderHook(() => useBuilderKeyboardShortcuts());
    
    const event = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true });
    window.dispatchEvent(event);
    
    expect(mockDispatch).toHaveBeenCalledWith({ type: "UNDO" });
  });

  it("should dispatch REDO on Ctrl+Shift+Z", () => {
    renderHook(() => useBuilderKeyboardShortcuts());
    
    const event = new KeyboardEvent("keydown", { key: "Z", ctrlKey: true, shiftKey: true, bubbles: true });
    window.dispatchEvent(event);
    
    expect(mockDispatch).toHaveBeenCalledWith({ type: "REDO" });
  });

  it("should dispatch SELECT_NODE with null on Escape", () => {
    renderHook(() => useBuilderKeyboardShortcuts());
    
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    window.dispatchEvent(event);
    
    expect(mockDispatch).toHaveBeenCalledWith({ type: "SELECT_NODE", nodeId: null });
  });
});
