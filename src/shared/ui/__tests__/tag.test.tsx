/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Tag } from '@/shared/ui/tag';

describe('Tag', () => {
  it('renders a clickable colored tag with a remove action', () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();

    render(<Tag label='Urgent' color='#ff0000' dot onClick={onClick} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('button', { name: 'Urgent' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Urgent' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
