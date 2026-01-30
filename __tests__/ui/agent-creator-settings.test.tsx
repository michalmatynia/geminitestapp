/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentCreatorSettingsSection } from "@/features/agentcreator/components/AgentCreatorSettingsSection";

describe("AgentCreatorSettingsSection", () => {
  const defaultProps = {
    agentModeEnabled: false,
    setAgentModeEnabled: vi.fn(),
    agentBrowser: "chromium",
    setAgentBrowser: vi.fn(),
    agentMaxSteps: 12,
    setAgentMaxSteps: vi.fn(),
    agentRunHeadless: true,
    setAgentRunHeadless: vi.fn(),
    agentIgnoreRobotsTxt: false,
    setAgentIgnoreRobotsTxt: vi.fn(),
    agentRequireHumanApproval: false,
    setAgentRequireHumanApproval: vi.fn(),
  };

  it("renders only the toggle when agent mode is disabled", () => {
    render(<AgentCreatorSettingsSection {...defaultProps} />);
    
    expect(screen.getByText("Enable Agent Mode")).toBeInTheDocument();
    expect(screen.queryByText("Browser")).not.toBeInTheDocument();
    expect(screen.queryByText("Max Steps")).not.toBeInTheDocument();
  });

  it("renders all settings when agent mode is enabled", () => {
    render(<AgentCreatorSettingsSection {...defaultProps} agentModeEnabled={true} />);
    
    expect(screen.getByText("Browser")).toBeInTheDocument();
    expect(screen.getByText("Max Steps")).toBeInTheDocument();
    expect(screen.getByText("Run Headless")).toBeInTheDocument();
    expect(screen.getByText("Ignore robots.txt")).toBeInTheDocument();
    expect(screen.getByText("Require Approval")).toBeInTheDocument();
  });

  it("calls setAgentModeEnabled when checkbox is clicked", async () => {
    const user = userEvent.setup();
    render(<AgentCreatorSettingsSection {...defaultProps} />);
    
    const checkbox = screen.getByRole("checkbox", { name: /enable agent mode/i });
    await user.click(checkbox);
    
    expect(defaultProps.setAgentModeEnabled).toHaveBeenCalledWith(true);
  });

  it("calls setAgentMaxSteps when input changes", async () => {
    const user = userEvent.setup();
    render(<AgentCreatorSettingsSection {...defaultProps} agentModeEnabled={true} />);
    
    const input = screen.getByLabelText(/max steps/i);
    await user.clear(input);
    await user.type(input, "15");
    
    expect(defaultProps.setAgentMaxSteps).toHaveBeenCalledWith(15);
  });

  it("calls toggle handlers for checkboxes", async () => {
    const user = userEvent.setup();
    render(<AgentCreatorSettingsSection {...defaultProps} agentModeEnabled={true} />);
    
    await user.click(screen.getByRole("checkbox", { name: /run headless/i }));
    expect(defaultProps.setAgentRunHeadless).toHaveBeenCalledWith(false); // Initial was true

    await user.click(screen.getByRole("checkbox", { name: /ignore robots.txt/i }));
    expect(defaultProps.setAgentIgnoreRobotsTxt).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("checkbox", { name: /require approval/i }));
    expect(defaultProps.setAgentRequireHumanApproval).toHaveBeenCalledWith(true);
  });
});
