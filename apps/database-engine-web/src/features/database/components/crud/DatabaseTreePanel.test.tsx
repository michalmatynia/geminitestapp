// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DatabaseTableDetail } from '@/shared/contracts/database';

import { DatabaseTreePanel } from './DatabaseTreePanel';

const buildTable = (overrides: Partial<DatabaseTableDetail>): DatabaseTableDetail => ({
  name: 'users',
  columns: [],
  indexes: [],
  foreignKeys: [],
  rowEstimate: 0,
  sizeFormatted: 'n/a',
  ...overrides,
});

describe('DatabaseTreePanel', () => {
  it('renders the full collection tree with row counts and sizes', () => {
    const onSelectTable = vi.fn();

    render(
      <DatabaseTreePanel
        databaseLabel='StudiQ / Local'
        databaseSize='2.5 MB'
        isFetching={false}
        onSelectTable={onSelectTable}
        selectedTable='users'
        tableDetails={[
          buildTable({
            name: 'users',
            rowEstimate: 12,
            sizeFormatted: '256 KB',
            columns: [
              {
                name: '_id',
                type: 'ObjectId',
                nullable: false,
                defaultValue: null,
                isPrimaryKey: true,
                isForeignKey: false,
              },
              {
                name: 'email',
                type: 'string',
                nullable: false,
                defaultValue: null,
                isPrimaryKey: false,
                isForeignKey: false,
              },
            ],
            indexes: [
              {
                name: '_id_',
                columns: ['_id'],
                isUnique: true,
                definition: '_id: 1',
              },
            ],
          }),
          buildTable({ name: 'sessions', rowEstimate: 1, sizeFormatted: '8 KB' }),
        ]}
      />
    );

    expect(screen.getByRole('tree', { name: 'Database tree' })).toBeInTheDocument();
    expect(screen.getAllByText('StudiQ / Local')).toHaveLength(2);
    expect(screen.getAllByText('2')).toHaveLength(2);
    expect(screen.getByText('2.5 MB')).toBeInTheDocument();
    expect(screen.getByText('12 rows')).toBeInTheDocument();
    expect(screen.getAllByText('1 row')).toHaveLength(1);
    expect(screen.getByText('256 KB')).toBeInTheDocument();
    expect(screen.getByText('8 KB')).toBeInTheDocument();
    expect(screen.getByText('Fields')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: 'users.email field' })).toBeInTheDocument();
    expect(screen.getByText('Indexes')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: 'users._id_ index' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select users collection' }).closest('[role="treeitem"]')).toHaveAttribute(
      'aria-selected',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Collapse visible collections' }));
    expect(screen.queryByRole('treeitem', { name: 'users.email field' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand visible collections' }));
    expect(screen.getByRole('treeitem', { name: 'users.email field' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select sessions collection' }));

    expect(onSelectTable).toHaveBeenCalledWith('sessions');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter database tree' }), {
      target: { value: 'email' },
    });

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select users collection' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select sessions collection' })).not.toBeInTheDocument();
  });

  it('uses n/a when size metadata is missing', () => {
    render(
      <DatabaseTreePanel
        databaseLabel='Current MongoDB'
        databaseSize=''
        isFetching
        onSelectTable={vi.fn()}
        selectedTable=''
        tableDetails={[buildTable({ name: 'logs', sizeFormatted: '' })]}
      />
    );

    expect(screen.getByText('Refreshing')).toBeInTheDocument();
    expect(screen.getAllByText('n/a')).toHaveLength(2);
  });
});
