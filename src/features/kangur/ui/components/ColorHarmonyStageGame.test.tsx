/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ColorHarmonyGame from '@/features/kangur/ui/components/ColorHarmonyStageGame';

describe('ColorHarmonyGame', () => {
  it('plays through the shared color-harmony rounds and finishes cleanly', () => {
    const onFinish = vi.fn();

    render(<ColorHarmonyGame finishLabel='Finish color studio' onFinish={onFinish} />);

    fireEvent.click(screen.getByRole('button', { name: /yellow \+ orange/i }));
    fireEvent.click(screen.getByRole('button', { name: /next palette/i }));

    fireEvent.click(screen.getByRole('button', { name: /blue \+ green/i }));
    fireEvent.click(screen.getByRole('button', { name: /next palette/i }));

    fireEvent.click(screen.getByRole('button', { name: /pink \+ violet/i }));
    fireEvent.click(screen.getByRole('button', { name: /next palette/i }));

    fireEvent.click(screen.getByRole('button', { name: /orange \+ cream/i }));
    fireEvent.click(screen.getByRole('button', { name: /see result/i }));

    expect(
      screen.getByText('You matched 4/4 color scenes')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish color studio' }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
