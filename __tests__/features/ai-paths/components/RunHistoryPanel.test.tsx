import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RunHistoryPanel } from "@/features/ai-paths/components/run-history-panel";
import { vi } from "vitest";

// Mock child components/utils
vi.mock("./RunHistoryEntries", () => ({
  RunHistoryEntries: () => <div data-testid="history-entries" />,
}));
vi.mock("./run-history-utils", () => ({
  buildHistoryNodeOptions: () => [],
}));

describe("RunHistoryPanel Component", () => {
  const mockSetRunFilter = vi.fn();
  const mockOnResumeRun = vi.fn();
  const mockOnCancelRun = vi.fn();
  
  const defaultProps = {
    runs: [],
    isRefreshing: false,
    onRefresh: vi.fn(),
    runFilter: "all" as const,
    setRunFilter: mockSetRunFilter,
    expandedRunHistory: {},
    setExpandedRunHistory: vi.fn(),
    runHistorySelection: {},
    setRunHistorySelection: vi.fn(),
    onOpenRunDetail: vi.fn(),
    onResumeRun: mockOnResumeRun,
    onCancelRun: mockOnCancelRun,
    onRequeueDeadLetter: vi.fn(),
  };

  it("should render empty state", () => {
    render(<RunHistoryPanel {...defaultProps} />);
    expect(screen.getByText("No runs yet.")).toBeInTheDocument();
  });

  it("should render a list of runs", () => {
    const runs = [
      { id: "run-1", status: "completed", createdAt: new Date().toISOString() },
      { id: "run-2", status: "failed", createdAt: new Date().toISOString() },
    ];
    render(<RunHistoryPanel {...defaultProps} runs={runs as any} />);
    
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    // Use getAllByText because "Failed" also appears in filter buttons
    expect(screen.getAllByText(/failed/i).length).toBeGreaterThan(1);
  });

  it("should call setRunFilter when a filter button is clicked", () => {
    render(<RunHistoryPanel {...defaultProps} />);
    
    const activeFilter = screen.getByText("Active");
    fireEvent.click(activeFilter);
    
    expect(mockSetRunFilter).toHaveBeenCalledWith("active");
  });

  it("should show 'Resume' button only for failed/paused runs", () => {
    const runs = [
      { id: "run-failed", status: "failed", createdAt: new Date().toISOString() },
      { id: "run-running", status: "running", createdAt: new Date().toISOString() },
    ];
    render(<RunHistoryPanel {...defaultProps} runs={runs as any} />);
    
    expect(screen.getByText("Resume")).toBeInTheDocument();
    // Replay button is always shown for runs, but let's check count
    const resumeButtons = screen.queryAllByText("Resume");
    expect(resumeButtons.length).toBe(1);
  });

  it("should call onResumeRun when Resume is clicked", () => {
    const runs = [{ id: "run-failed", status: "failed", createdAt: new Date().toISOString() }];
    render(<RunHistoryPanel {...defaultProps} runs={runs as any} />);
    
    fireEvent.click(screen.getByText("Resume"));
    expect(mockOnResumeRun).toHaveBeenCalledWith("run-failed", "resume");
  });

  it("should call onCancelRun when Cancel is clicked for active runs", () => {
    const runs = [{ id: "run-active", status: "running", createdAt: new Date().toISOString() }];
    render(<RunHistoryPanel {...defaultProps} runs={runs as any} />);
    
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockOnCancelRun).toHaveBeenCalledWith("run-active");
  });
});
