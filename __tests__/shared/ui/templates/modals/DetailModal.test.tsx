import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

describe('DetailModal', () => {
  it('renders detail modal', () => {
    const onClose = vi.fn();

    render(
      <DetailModal isOpen={true} onClose={onClose} title='Details'>
        <p>Detail content</p>
      </DetailModal>
    );

    expect(screen.getAllByText('Details').length).toBeGreaterThan(0);
    expect(screen.getByText('Detail content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const onClose = vi.fn();

    const { container } = render(
      <DetailModal isOpen={false} onClose={onClose} title='Details'>
        <p>Detail content</p>
      </DetailModal>
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('renders with custom footer', () => {
    const onClose = vi.fn();

    render(
      <DetailModal
        isOpen={true}
        onClose={onClose}
        title='Details'
        footer={<button>Custom Action</button>}
      >
        <p>Detail content</p>
      </DetailModal>
    );

    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });

  it('renders with subtitle', () => {
    const onClose = vi.fn();

    render(
      <DetailModal isOpen={true} onClose={onClose} title='Details' subtitle='Additional info'>
        <p>Detail content</p>
      </DetailModal>
    );

    expect(screen.getAllByText('Additional info').length).toBeGreaterThan(0);
  });
});
