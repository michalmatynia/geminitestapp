import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FilemakerEntityCardsSection } from '@/features/filemaker/components/shared/FilemakerEntityCardsSection';

type Item = {
  id: string;
  label: string;
};

const items: Item[] = [{ id: 'item-1', label: 'Item One' }];

describe('FilemakerEntityCardsSection', () => {
  it('renders items and wires add/edit/delete callbacks', () => {
    const onAdd = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <FilemakerEntityCardsSection<Item>
        title='Entities'
        addLabel='Add Item'
        emptyTitle='Nothing here'
        emptyDescription='No entities available.'
        items={items}
        renderMain={(item) => <div>{item.label}</div>}
        renderMeta={(item) => <div>Meta {item.id}</div>}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        isPending={false}
      />
    );

    expect(screen.getByText('Item One')).toBeInTheDocument();
    expect(screen.getByText('Meta item-1')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0] as HTMLElement);
    fireEvent.click(buttons[1] as HTMLElement);
    fireEvent.click(buttons[2] as HTMLElement);

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(items[0]);
    expect(onDelete).toHaveBeenCalledWith(items[0]);
  });

  it('renders empty state when list is empty', () => {
    render(
      <FilemakerEntityCardsSection<Item>
        title='Entities'
        addLabel='Add Item'
        emptyTitle='Nothing here'
        emptyDescription='No entities available.'
        items={[]}
        renderMain={(item) => <div>{item.label}</div>}
        renderMeta={(item) => <div>Meta {item.id}</div>}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isPending={false}
      />
    );

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('No entities available.')).toBeInTheDocument();
  });
});
