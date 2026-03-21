/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@/__tests__/test-utils';
import { describe, expect, it, vi } from 'vitest';

import {
  KangurLessonNavigationProvider,
  useKangurLessonBackAction,
} from '@/features/kangur/ui/context/KangurLessonNavigationContext';

function BackButton({ onBack }: { onBack?: () => void }): React.JSX.Element {
  const handleBack = useKangurLessonBackAction(onBack);

  return (
    <button type='button' onClick={handleBack}>
      Back
    </button>
  );
}

describe('KangurLessonNavigationContext', () => {
  it('uses the provider action when no override prop is supplied', () => {
    const onBack = vi.fn();

    render(
      <KangurLessonNavigationProvider onBack={onBack}>
        <BackButton />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('throws when no provider or override is available', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<BackButton />)).toThrow(
      'useKangurLessonBackAction must be used within a KangurLessonNavigationProvider'
    );

    consoleErrorSpy.mockRestore();
  });
});
