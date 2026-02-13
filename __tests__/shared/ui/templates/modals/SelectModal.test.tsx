import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectModal, type SelectOption } from '@/shared/ui/templates/modals/SelectModal';

describe('SelectModal', () => {
  const mockOptions: SelectOption<string>[] = [
    { id: '1', label: 'Option 1', value: 'opt1', description: 'First option' },
    { id: '2', label: 'Option 2', value: 'opt2', description: 'Second option' },
    { id: '3', label: 'Option 3', value: 'opt3', disabled: true },
  ];

  it('renders modal when open', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    render(
      <SelectModal
        open={true}
        onClose={onClose}
        title='Select an option'
        options={mockOptions}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    const { container } = render(
      <SelectModal
        open={false}
        onClose={onClose}
        title='Select an option'
        options={mockOptions}
        onSelect={onSelect}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('calls onSelect and onClose on single select', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    render(
      <SelectModal
        open={true}
        onClose={onClose}
        title='Select an option'
        options={mockOptions}
        onSelect={onSelect}
        multiple={false}
      />
    );

    const firstOption = screen.getByText('Option 1');
    fireEvent.click(firstOption);

    expect(onSelect).toHaveBeenCalledWith(mockOptions[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('filters options based on search', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    render(
      <SelectModal
        open={true}
        onClose={onClose}
        title='Select an option'
        options={mockOptions}
        onSelect={onSelect}
        searchable={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search options..') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'First' } });

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
  });

  it('displays loading state', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    render(
      <SelectModal
        open={true}
        onClose={onClose}
        title='Select an option'
        options={mockOptions}
        onSelect={onSelect}
        loading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('disables disabled options', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    render(
      <SelectModal
        open={true}
        onClose={onClose}
        title='Select an option'
        options={mockOptions}
        onSelect={onSelect}
      />
    );

    const disabledOption = screen.getByText('Option 3').closest('button');
    expect(disabledOption).toBeDisabled();
  });

  it('handles multiple selection', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    render(
      <SelectModal
        open={true}
        onClose={onClose}
        title='Select options'
        options={mockOptions}
        onSelect={onSelect}
        multiple={true}
      />
    );

    fireEvent.click(screen.getByText('Option 1'));
    fireEvent.click(screen.getByText('Option 2'));

    const selectButton = screen.getByText('Select (2)');
    expect(selectButton).toBeInTheDocument();
  });
});
