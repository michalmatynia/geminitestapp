import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgentCreatorSettingsSection } from "@/features/agentcreator/components/AgentCreatorSettingsSection";
import { vi } from "vitest";

describe("AgentCreatorSettingsSection Component", () => {
  const defaultProps = {
    agentModeEnabled: false,
    setAgentModeEnabled: vi.fn(),
    agentBrowser: "chromium",
    setAgentBrowser: vi.fn(),
    agentMaxSteps: 10,
    setAgentMaxSteps: vi.fn(),
    agentRunHeadless: true,
    setAgentRunHeadless: vi.fn(),
    agentIgnoreRobotsTxt: false,
    setAgentIgnoreRobotsTxt: vi.fn(),
    agentRequireHumanApproval: false,
    setAgentRequireHumanApproval: vi.fn(),
  };

  it("should show settings only when agent mode is enabled", () => {
    const { rerender } = render(<AgentCreatorSettingsSection {...defaultProps} />);
    
    expect(screen.queryByText("Browser")).not.toBeInTheDocument();

    rerender(<AgentCreatorSettingsSection {...defaultProps} agentModeEnabled={true} />);
    expect(screen.getByText("Browser")).toBeInTheDocument();
    expect(screen.getByLabelText(/Max Steps/i)).toBeInTheDocument();
  });

  it("should call setAgentModeEnabled when checkbox is clicked", () => {
    render(<AgentCreatorSettingsSection {...defaultProps} />);
    
    const checkbox = screen.getByLabelText(/Enable Agent Mode/i);
    fireEvent.click(checkbox);
    
    expect(defaultProps.setAgentModeEnabled).toHaveBeenCalledWith(true);
  });

  it("should call setAgentMaxSteps when input changes", () => {
    render(<AgentCreatorSettingsSection {...defaultProps} agentModeEnabled={true} />);
    
    const input = screen.getByLabelText(/Max Steps/i);
    fireEvent.change(input, { target: { value: "20" } });
    
    expect(defaultProps.setAgentMaxSteps).toHaveBeenCalledWith(20);
  });

  it("should call setAgentRunHeadless when checkbox is clicked", () => {
    render(<AgentCreatorSettingsSection {...defaultProps} agentModeEnabled={true} />);
    
    const checkbox = screen.getByLabelText(/Run Headless/i);
    fireEvent.click(checkbox);
    
    expect(defaultProps.setAgentRunHeadless).toHaveBeenCalledWith(false); // was true initially
  });
});
