/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import AgenticPromptTrimGame from '@/features/kangur/ui/components/AgenticPromptTrimGame';

describe('AgenticPromptTrimGame touch mode', () => {
  it('shows a touch hint and larger token buttons on coarse pointers', () => {
    render(<AgenticPromptTrimGame />);

    expect(screen.getByTestId('agentic-prompt-trim-touch-hint')).toHaveTextContent(
      'Tap a token to keep or remove it, then tap Check.'
    );

    const token = screen.getByRole('button', { name: /goal:/i });
    expect(token).toHaveClass('touch-manipulation', 'select-none', 'min-h-[3.5rem]');
  });
});
