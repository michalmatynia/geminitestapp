import { render, screen, fireEvent } from '@testing-library/react';
import { vi, Mock } from 'vitest';

import { AgentCreatorSettingsSection } from '@/features/ai/agentcreator/components/AgentCreatorSettingsSection';
import { useAgentCreatorSettings } from '@/features/ai/agentcreator/hooks/useAgentCreatorSettings';

// Mock the hook
vi.mock('@/features/ai/agentcreator/hooks/useAgentCreatorSettings');

describe('AgentCreatorSettingsSection Component', () => {
  const mockSetAgentModeEnabled = vi.fn();
  const mockSetAgentBrowser = vi.fn();
  const mockSetAgentMaxSteps = vi.fn();
  const mockSetAgentRunHeadless = vi.fn();
  const mockSetAgentIgnoreRobotsTxt = vi.fn();
  const mockSetAgentRequireHumanApproval = vi.fn();

  const defaultMockValues = {
    agentModeEnabled: false,
    setAgentModeEnabled: mockSetAgentModeEnabled,
    agentBrowser: 'chromium',
    setAgentBrowser: mockSetAgentBrowser,
    agentMaxSteps: 10,
    setAgentMaxSteps: mockSetAgentMaxSteps,
    agentRunHeadless: true,
    setAgentRunHeadless: mockSetAgentRunHeadless,
    agentIgnoreRobotsTxt: false,
    setAgentIgnoreRobotsTxt: mockSetAgentIgnoreRobotsTxt,
    agentRequireHumanApproval: false,
    setAgentRequireHumanApproval: mockSetAgentRequireHumanApproval,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAgentCreatorSettings as Mock).mockReturnValue(defaultMockValues);
  });

  it('should show settings only when agent mode is enabled', () => {
    const { rerender } = render(<AgentCreatorSettingsSection />);

    expect(screen.queryByText('Browser')).not.toBeInTheDocument();

    (useAgentCreatorSettings as Mock).mockReturnValue({
      ...defaultMockValues,
      agentModeEnabled: true,
    });

    rerender(<AgentCreatorSettingsSection />);
    expect(screen.getByText('Browser')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Max Steps/i })).toBeInTheDocument();
  });

  it('should call setAgentModeEnabled when checkbox is clicked', () => {
    render(<AgentCreatorSettingsSection />);

    // ToggleRow with variant="switch" renders a button with role="switch"
    const checkbox = screen.getByRole('switch', { name: /Enable Agent Mode/i });
    fireEvent.click(checkbox);

    expect(mockSetAgentModeEnabled).toHaveBeenCalledWith(true);
  });

  it('should call setAgentMaxSteps when input changes', () => {
    (useAgentCreatorSettings as Mock).mockReturnValue({
      ...defaultMockValues,
      agentModeEnabled: true,
    });
    render(<AgentCreatorSettingsSection />);

    const input = screen.getByRole('spinbutton', { name: /Max Steps/i });
    fireEvent.change(input, { target: { value: '20' } });

    expect(mockSetAgentMaxSteps).toHaveBeenCalledWith(20);
  });

  it('should call setAgentRunHeadless when checkbox is clicked', () => {
    (useAgentCreatorSettings as Mock).mockReturnValue({
      ...defaultMockValues,
      agentModeEnabled: true,
    });
    render(<AgentCreatorSettingsSection />);

    // Default ToggleRow uses Checkbox which might be an input[type=checkbox] or a button[role=checkbox]
    // Checking previous implementation of ToggleRow/Checkbox, it likely uses Radix or similar which uses role="checkbox" on a button
    // or a simple input[type=checkbox]
    // The previous error suggested no form control associated with label.
    // Let's try querying by role 'checkbox' with name.
    const checkbox = screen.getByRole('checkbox', { name: /Run Headless/i });
    fireEvent.click(checkbox);

    expect(mockSetAgentRunHeadless).toHaveBeenCalledWith(false); // was true initially
  });
});
