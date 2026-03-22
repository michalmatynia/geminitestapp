import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const builderState = vi.hoisted(() => ({
  latestProps: null as Record<string, unknown> | null,
}));

vi.mock('@/shared/ui/templates/SettingsPanelBuilder', () => ({
  SettingsPanelBuilder: (props: Record<string, unknown>) => {
    builderState.latestProps = props;
    return (
      <div data-testid='rename-path-modal-builder'>
        <button
          type='button'
          onClick={() =>
            (props.onChange as (value: { name: string }) => void)({
              name: 'Renamed path',
            })
          }
        >
          rename
        </button>
        <button
          type='button'
          onClick={() => (props.onChange as (value: Record<string, never>) => void)({})}
        >
          noop
        </button>
        <button
          type='button'
          onClick={() => {
            void (props.onSave as () => Promise<void>)();
          }}
        >
          save
        </button>
      </div>
    );
  },
}));

import { RenamePathModal } from './RenamePathModal';

describe('RenamePathModal', () => {
  it('passes the expected modal configuration to the settings panel builder', () => {
    const onClose = vi.fn();
    const setDraftName = vi.fn();
    const onSave = vi.fn();

    render(
      <RenamePathModal
        isOpen
        onClose={onClose}
        item={{ name: 'Original path' }}
        setDraftName={setDraftName}
        onSave={onSave}
      />,
    );

    expect(screen.getByTestId('rename-path-modal-builder')).toBeInTheDocument();
    expect(builderState.latestProps).toEqual(
      expect.objectContaining({
        open: true,
        onClose,
        title: 'Rename Path',
        size: 'sm',
        values: { name: 'Original path' },
      }),
    );
    expect(builderState.latestProps?.fields).toEqual([
      {
        key: 'name',
        label: 'Path Name',
        type: 'text',
        placeholder: 'e.g. My Automation Path',
        required: true,
      },
    ]);
  });

  it('maps builder change and save events back to the modal callbacks', () => {
    const setDraftName = vi.fn();
    const onSave = vi.fn();

    render(
      <RenamePathModal
        isOpen={false}
        onClose={vi.fn()}
        item={null}
        setDraftName={setDraftName}
        onSave={onSave}
      />,
    );

    expect(builderState.latestProps).toEqual(
      expect.objectContaining({
        open: false,
        values: { name: '' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'rename' }));
    fireEvent.click(screen.getByRole('button', { name: 'noop' }));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(setDraftName).toHaveBeenCalledTimes(1);
    expect(setDraftName).toHaveBeenCalledWith('Renamed path');
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
