import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

import { RunHistoryPanel } from '@/features/ai/ai-paths/components/run-history-panel';
import { RunHistoryProvider } from '@/features/ai/ai-paths/context';

// Mock child components/utils
vi.mock('@/features/ai/ai-paths/components/RunHistoryEntries', () => ({
  RunHistoryEntries: () => <div data-testid='history-entries' />,
}));
vi.mock('@/features/ai/ai-paths/components/run-history-utils', () => ({
  buildHistoryNodeOptions: () => [],
}));

describe('RunHistoryPanel Component', () => {
  const mockOnResumeRun = vi.fn();
  const mockOnCancelRun = vi.fn();
  
  const defaultProps = {
    runs: [],
    isRefreshing: false,
    onRefresh: vi.fn(),
    onOpenRunDetail: vi.fn(),
    onResumeRun: mockOnResumeRun,
    onCancelRun: mockOnCancelRun,
    onRequeueDeadLetter: vi.fn(),
  };

  const renderPanel = (props: Partial<typeof defaultProps> = {}) =>
    render(
      <RunHistoryProvider>
        <RunHistoryPanel {...defaultProps} {...props} />
      </RunHistoryProvider>
    );

  it('should render empty state', () => {
    renderPanel();
    expect(screen.getByText('No runs yet.')).toBeInTheDocument();
  });

  it('should render a list of runs', () => {
    const runs = [
      { id: 'run-1', status: 'completed', createdAt: new Date().toISOString() },
      { id: 'run-2', status: 'failed', createdAt: new Date().toISOString() },
    ];
    renderPanel({ runs: runs as any });
    
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    // Use getAllByText because "Failed" also appears in filter buttons
    expect(screen.getAllByText(/failed/i).length).toBeGreaterThan(1);
  });

  it('should filter runs when a filter button is clicked', () => {
    const runs = [
      { id: 'run-completed', status: 'completed', createdAt: new Date().toISOString() },
      { id: 'run-running', status: 'running', createdAt: new Date().toISOString() },
    ];
    renderPanel({ runs: runs as any });
    
    const activeFilter = screen.getByText('Active');
    fireEvent.click(activeFilter);
    
    expect(screen.queryByText(/completed/i)).not.toBeInTheDocument();
    expect(screen.getByText(/running/i)).toBeInTheDocument();
  });

  it('should show \'Resume\' button only for failed/paused runs', () => {
    const runs = [
      { id: 'run-failed', status: 'failed', createdAt: new Date().toISOString() },
      { id: 'run-running', status: 'running', createdAt: new Date().toISOString() },
    ];
    renderPanel({ runs: runs as any });
    
    expect(screen.getByText('Resume')).toBeInTheDocument();
    // Replay button is always shown for runs, but let's check count
    const resumeButtons = screen.queryAllByText('Resume');
    expect(resumeButtons.length).toBe(1);
  });

  it('should call onResumeRun when Resume is clicked', () => {
    const runs = [{ id: 'run-failed', status: 'failed', createdAt: new Date().toISOString() }];
    renderPanel({ runs: runs as any });
    
    fireEvent.click(screen.getByText('Resume'));
    expect(mockOnResumeRun).toHaveBeenCalledWith('run-failed', 'resume');
  });

  it('should call onCancelRun when Cancel is clicked for active runs', () => {
    const runs = [{ id: 'run-active', status: 'running', createdAt: new Date().toISOString() }];
    renderPanel({ runs: runs as any });
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancelRun).toHaveBeenCalledWith('run-active');
  });
});
