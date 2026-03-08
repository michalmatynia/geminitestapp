/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/components/OperationSelector', () => ({
  default: () => <div data-testid='mock-operation-selector'>Mock operation selector</div>,
}));

vi.mock('@/features/kangur/ui/components/TrainingSetup', () => ({
  default: () => <div data-testid='mock-training-setup'>Mock training setup</div>,
}));

vi.mock('@/features/kangur/ui/components/KangurSetup', () => ({
  default: () => <div data-testid='mock-kangur-setup'>Mock Kangur setup</div>,
}));

vi.mock('@/features/kangur/ui/components/KangurPracticeAssignmentBanner', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-practice-assignment-banner'>Mock assignment banner</div>,
}));

import { KangurGameKangurSetupWidget } from '@/features/kangur/ui/components/KangurGameKangurSetupWidget';
import { KangurGameOperationSelectorWidget } from '@/features/kangur/ui/components/KangurGameOperationSelectorWidget';
import { KangurGameTrainingSetupWidget } from '@/features/kangur/ui/components/KangurGameTrainingSetupWidget';

describe('Kangur game entry top sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the shared top section for the Grajmy flow', () => {
    const handleHome = vi.fn();

    useKangurGameRuntimeMock.mockReturnValue({
      activePracticeAssignment: null,
      basePath: '/kangur',
      handleHome,
      handleSelectOperation: vi.fn(),
      playerName: 'Jan',
      practiceAssignmentsByOperation: {},
      screen: 'operation',
      setScreen: vi.fn(),
    });

    render(<KangurGameOperationSelectorWidget />);

    expect(screen.getByTestId('kangur-game-operation-top-section')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/68'
    );
    expect(screen.getByRole('heading', { name: 'Grajmy!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-operation-selector')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

    expect(handleHome).toHaveBeenCalledTimes(1);
  });

  it('renders the shared top section for the Trening mieszany flow', () => {
    const handleHome = vi.fn();

    useKangurGameRuntimeMock.mockReturnValue({
      activePracticeAssignment: null,
      basePath: '/kangur',
      handleHome,
      handleStartTraining: vi.fn(),
      screen: 'training',
    });

    render(<KangurGameTrainingSetupWidget />);

    expect(screen.getByTestId('kangur-game-training-top-section')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/68'
    );
    expect(screen.getByRole('heading', { name: 'Trening mieszany' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-training-setup')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

    expect(handleHome).toHaveBeenCalledTimes(1);
  });

  it('renders the shared top section for the Kangur Matematyczny flow', () => {
    const handleHome = vi.fn();

    useKangurGameRuntimeMock.mockReturnValue({
      handleHome,
      handleStartKangur: vi.fn(),
      screen: 'kangur_setup',
    });

    render(<KangurGameKangurSetupWidget />);

    expect(screen.getByTestId('kangur-game-kangur-setup-top-section')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/68'
    );
    expect(screen.getByRole('heading', { name: 'Kangur Matematyczny' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-kangur-setup')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

    expect(handleHome).toHaveBeenCalledTimes(1);
  });
});
