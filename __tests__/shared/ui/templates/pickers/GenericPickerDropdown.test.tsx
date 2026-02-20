import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { GenericPickerDropdown } from '@/shared/ui/templates/pickers/GenericPickerDropdown';
import type { PickerGroup, PickerOption } from '@/shared/contracts/ui';

describe('GenericPickerDropdown', () => {
  const mockOptions: PickerOption[] = [
    { key: 'grid', label: 'Grid' },
    { key: 'block', label: 'Block' },
    { key: 'text', label: 'Text' },
  ];

  const mockGroups: PickerGroup[] = [
    {
      label: 'Layout',
      options: [mockOptions[0]!],
    },
    {
      label: 'Content',
      options: [mockOptions[1]!, mockOptions[2]!],
    },
  ];

  it('renders trigger button', () => {
    const onSelect = vi.fn();
    render(
      <GenericPickerDropdown
        groups={mockGroups}
        onSelect={onSelect}
        ariaLabel='Select section'
      />
    );

    const trigger = screen.getByRole('button', { name: /select section/i });
    expect(trigger).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    const onSelect = vi.fn();
    render(
      <GenericPickerDropdown
        groups={mockGroups}
        onSelect={onSelect}
      />
    );

    const trigger = screen.getByRole('button', { name: /add item/i });
    await userEvent.click(trigger);

    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onSelect when option clicked', async () => {
    const onSelect = vi.fn();
    render(
      <GenericPickerDropdown
        groups={mockGroups}
        onSelect={onSelect}
      />
    );

    const trigger = screen.getByRole('button', { name: /add item/i });
    await userEvent.click(trigger);

    const gridOption = screen.getByRole('button', { name: /grid/i });
    await userEvent.click(gridOption);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'grid', label: 'Grid' })
    );
  });

  it('closes dropdown after selection', async () => {
    const onSelect = vi.fn();
    render(
      <GenericPickerDropdown
        groups={mockGroups}
        onSelect={onSelect}
      />
    );

    const trigger = screen.getByRole('button', { name: /add item/i });
    await userEvent.click(trigger);
    
    const gridOption = screen.getByRole('button', { name: /grid/i });
    await userEvent.click(gridOption);

    await waitFor(() => {
      expect(screen.queryByText('Layout')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown on escape key', async () => {
    const onSelect = vi.fn();
    render(
      <GenericPickerDropdown
        groups={mockGroups}
        onSelect={onSelect}
      />
    );

    const trigger = screen.getByRole('button', { name: /add item/i });
    await userEvent.click(trigger);

    fireEvent.keyDown(screen.getByRole('button', { name: /close picker/i }), {
      key: 'Escape',
    });

    await waitFor(() => {
      expect(screen.queryByText('Layout')).not.toBeInTheDocument();
    });
  });

  it('filters options when search enabled', async () => {
    const onSelect = vi.fn();
    render(
      <GenericPickerDropdown
        groups={mockGroups}
        onSelect={onSelect}
        searchable
      />
    );

    const trigger = screen.getByRole('button', { name: /add item/i });
    await userEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'grid');

    expect(screen.getByRole('button', { name: /grid/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /block/i })).not.toBeInTheDocument();
  });

  it('highlights selected option', async () => {
    const onSelect = vi.fn();
    render(
      <GenericPickerDropdown
        groups={mockGroups}
        onSelect={onSelect}
        selectedKey='grid'
      />
    );

    const trigger = screen.getByRole('button', { name: /add item/i });
    await userEvent.click(trigger);

    const gridOption = screen.getByRole('button', { name: /grid/i });
    expect(gridOption).toHaveClass('bg-blue-500/20');
  });

  it('disables picker when disabled prop is true', () => {
    const onSelect = vi.fn();
    render(
      <GenericPickerDropdown
        groups={mockGroups}
        onSelect={onSelect}
        disabled
      />
    );

    const trigger = screen.getByRole('button', { name: /add item/i });
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
  });

  it('returns null when no options', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <GenericPickerDropdown
        groups={[]}
        onSelect={onSelect}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('does not change hook order when groups become empty', () => {
    const onSelect = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { rerender } = render(
      <GenericPickerDropdown
        groups={mockGroups}
        onSelect={onSelect}
      />
    );

    rerender(
      <GenericPickerDropdown
        groups={[]}
        onSelect={onSelect}
      />
    );

    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('React has detected a change in the order of Hooks called')
    );

    errorSpy.mockRestore();
  });
});
