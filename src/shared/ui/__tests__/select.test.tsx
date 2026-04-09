import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn<() => string | null>(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  usePathname: usePathnameMock,
}));

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  shouldUseNativeSelectMode,
} from '@/shared/ui/select';

describe('shared Select native fallback', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/admin/image-studio');
  });

  it('switches to native select mode on the configured admin routes', () => {
    expect(shouldUseNativeSelectMode('/admin/image-studio')).toBe(true);
    expect(shouldUseNativeSelectMode('/admin/ai-paths/queue')).toBe(true);
    expect(shouldUseNativeSelectMode('/admin/kangur')).toBe(false);
  });

  it('renders the native fallback with forwarded accessibility and data attributes', () => {
    const onValueChange = vi.fn();

    render(
      <Select value='' onValueChange={onValueChange}>
        <SelectTrigger aria-label='Sort assets' data-doc-id='asset-sort'>
          <SelectValue placeholder='Sort assets' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='newest'>Newest</SelectItem>
          <SelectItem value='oldest'>Oldest</SelectItem>
        </SelectContent>
      </Select>
    );

    const select = screen.getByRole('combobox', { name: 'Sort assets' });
    expect(select).toHaveAttribute('data-doc-id', 'asset-sort');
    expect(select).toHaveValue('');

    fireEvent.change(select, { target: { value: 'oldest' } });
    expect(onValueChange).toHaveBeenCalledWith('oldest');
  });

  it('extracts nested item text for native option labels', () => {
    render(
      <Select value='nested'>
        <SelectTrigger aria-label='Nested select'>
          <SelectValue placeholder='Pick one' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='nested'>
            <span>Nested</span>
            <span> label</span>
          </SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByRole('option', { name: 'Nested label' })).toBeInTheDocument();
  });

  it('renders a disabled native select when SelectTrigger is used without Select context', () => {
    render(<SelectTrigger aria-label='Standalone select' data-doc-id='standalone' />);

    const select = screen.getByRole('combobox', { name: 'Standalone select' });
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute('data-doc-id', 'standalone');
  });
});
