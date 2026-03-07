import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioInlineEditPanels } from '../StudioInlineEditPanels';

const mocks = vi.hoisted(() => ({
  setEditCardTab: vi.fn(),
  runtime: {
    editCardTab: 'card',
  },
}));

vi.mock('@/shared/ui', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    Tabs: mocks.MockTestTabs,
    TabsList: mocks.MockTestTabsList,
    TabsTrigger: mocks.MockTestTabsTrigger,
  };
});

vi.mock(
  '../StudioInlineEditContext',
  async () => {
    const { createStudioInlineEditMockModule } = await import('./studioInlineEditTestUtils');
    return createStudioInlineEditMockModule(() => ({
      editCardTab: mocks.runtime.editCardTab,
      setEditCardTab: mocks.setEditCardTab,
    }));
  }
);

vi.mock('../../modals/SlotInlineEditModal', () => ({
  SlotInlineEditModal: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <div data-testid='slot-inline-edit-modal'>{children}</div>
  ),
}));

vi.mock('../../modals/GenerationPreviewModalImpl', () => ({
  GenerationPreviewModal: (): React.JSX.Element => <div>Generation Preview Modal</div>,
}));

vi.mock('../../modals/ExtractPromptParamsModalImpl', () => ({
  ExtractPromptParamsModal: (): React.JSX.Element => <div>Extract Prompt Params Modal</div>,
}));

vi.mock('../SlotInlineEditCardTab', () => ({
  SlotInlineEditCardTab: (): React.JSX.Element => <div>Card Tab Body</div>,
}));

vi.mock('../SlotInlineEditGenerationsTab', () => ({
  SlotInlineEditGenerationsTab: (): React.JSX.Element => <div>Generations Tab Body</div>,
}));

vi.mock('../SlotInlineEditEnvironmentTab', () => ({
  SlotInlineEditEnvironmentTab: (): React.JSX.Element => <div>Environment Tab Body</div>,
}));

vi.mock('../SlotInlineEditMasksTab', () => ({
  SlotInlineEditMasksTab: (): React.JSX.Element => <div>Masks Tab Body</div>,
}));

vi.mock('../SlotInlineEditCompositesTab', () => ({
  SlotInlineEditCompositesTab: (): React.JSX.Element => <div>Composites Tab Body</div>,
}));

describe('StudioInlineEditPanels runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtime.editCardTab = 'card';
  });

  it('renders the context-backed modal cluster', () => {
    render(<StudioInlineEditPanels />);

    expect(screen.getByTestId('slot-inline-edit-modal')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-root')).toHaveAttribute('data-value', 'card');
    expect(screen.getByText('Card Tab Body')).toBeInTheDocument();
    expect(screen.getByText('Generation Preview Modal')).toBeInTheDocument();
    expect(screen.getByText('Extract Prompt Params Modal')).toBeInTheDocument();
  });

  it('forwards only allowed tab values to StudioInlineEditContext', () => {
    render(<StudioInlineEditPanels />);

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Generations' }));
    expect(mocks.setEditCardTab).toHaveBeenCalledWith('generations');

    mocks.setEditCardTab.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Invalid' }));
    expect(mocks.setEditCardTab).not.toHaveBeenCalled();
  });
});
