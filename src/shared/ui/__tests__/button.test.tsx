/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '@/shared/ui/button';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Button', () => {
  it('forwards asChild button props to the slotted element without fragment warnings', () => {
    const childOnClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <Button asChild variant='outline' size='sm'>
        <a href='/docs' onClick={childOnClick}>
          Open docs
        </a>
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Open docs' });
    fireEvent.click(link);

    expect(childOnClick).toHaveBeenCalledTimes(1);
    expect(link.className).toContain('inline-flex');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
