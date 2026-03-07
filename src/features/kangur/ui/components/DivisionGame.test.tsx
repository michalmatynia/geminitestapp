/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DivisionGame from '@/features/kangur/ui/components/DivisionGame';

describe('DivisionGame', () => {
  it('uses the shared pill CTA style for the confirm action', () => {
    render(<DivisionGame onFinish={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Sprawdź ✓' })).toHaveClass(
      'kangur-cta-pill',
      'play-cta'
    );
  });
});
