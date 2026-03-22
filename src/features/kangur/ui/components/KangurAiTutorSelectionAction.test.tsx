import { fireEvent, render, screen } from '@testing-library/react';

import { KangurAiTutorSelectionAction } from './KangurAiTutorSelectionAction';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

describe('KangurAiTutorSelectionAction', () => {
  it('renders the floating action with the themed question badge', () => {
    const onAskAbout = vi.fn();
    const onSelectionActionMouseDown = vi.fn();

    render(
      <KangurAiTutorSelectionAction
        onAskAbout={onAskAbout}
        onSelectionActionMouseDown={onSelectionActionMouseDown}
        placement='bottom'
        prefersReducedMotion
        shouldRender
        style={{ top: 12, left: 18 }}
      />
    );

    const root = screen.getByTestId('kangur-ai-tutor-selection-action');
    const button = screen.getByRole('button', { name: 'Zapytaj o to' });
    const badge = button.querySelector('span[aria-hidden="true"]');

    expect(root).toHaveAttribute('data-selection-placement', 'bottom');
    expect(button).toHaveClass('min-h-11', 'min-w-[156px]', 'px-4', 'text-sm');
    expect(badge).toHaveClass(
      'h-5',
      'w-5',
      'text-[11px]',
      'kangur-chat-selection-badge'
    );

    fireEvent.mouseDown(button);
    fireEvent.click(button);

    expect(onSelectionActionMouseDown).toHaveBeenCalledTimes(1);
    expect(onAskAbout).toHaveBeenCalledTimes(1);
  });

  it('stays hidden when selection actions are disabled', () => {
    render(
      <KangurAiTutorSelectionAction
        onAskAbout={vi.fn()}
        onSelectionActionMouseDown={vi.fn()}
        placement='top'
        prefersReducedMotion={false}
        shouldRender={false}
        style={null}
      />
    );

    expect(screen.queryByTestId('kangur-ai-tutor-selection-action')).not.toBeInTheDocument();
  });
});
