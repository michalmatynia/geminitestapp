import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toastMock, writeTextMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  writeTextMock: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('lucide-react', () => ({
  Copy: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid='copy-icon' />,
}));

import { ProductFormFooter } from './ProductFormFooter';

describe('ProductFormFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeTextMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });
  });

  it('renders inline product id with copy icon and copies id on click', async () => {
    render(<ProductFormFooter entityId='product-123' />);

    expect(screen.getByText('Product ID:')).toBeTruthy();
    expect(screen.getByText('product-123')).toBeTruthy();
    expect(screen.getByTestId('copy-icon')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Copy product ID' }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('product-123');
      expect(toastMock).toHaveBeenCalledWith('Product ID copied to clipboard.', {
        variant: 'success',
      });
    });
  });

  it('does not render when product id is missing', () => {
    const { container } = render(<ProductFormFooter entityId={null} />);
    expect(container.firstChild).toBeNull();
  });
});
