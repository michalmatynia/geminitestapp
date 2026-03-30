/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GamesLibraryGameDialog } from './GamesLibraryGameModal.components';

describe('GamesLibraryGameDialog', () => {
  it('provides hidden dialog metadata required by Radix accessibility checks', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(
        <GamesLibraryGameDialog
          open
          onOpenChange={() => undefined}
          title='Clock training preview'
          description='Preview the runtime configuration for this game.'
        >
          <div>Modal body</div>
        </GamesLibraryGameDialog>
      );

      expect(screen.getByText('Clock training preview')).toBeInTheDocument();
      expect(
        screen.getByText('Preview the runtime configuration for this game.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('games-library-game-modal')).toHaveClass(
        'bg-[var(--kangur-soft-card-background,#ffffff)]',
        'overflow-hidden'
      );

      const loggedOutput = consoleErrorSpy.mock.calls
        .flatMap((call) => call.map((value) => String(value)))
        .join('\n');
      expect(loggedOutput).not.toContain('`DialogContent` requires a `DialogTitle`');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('closes when the backdrop is clicked', async () => {
    function Harness(): React.JSX.Element {
      const [open, setOpen] = React.useState(true);

      return (
        <GamesLibraryGameDialog
          open={open}
          onOpenChange={setOpen}
          title='Clock training preview'
          description='Preview the runtime configuration for this game.'
        >
          <div>Modal body</div>
        </GamesLibraryGameDialog>
      );
    }

    render(<Harness />);

    expect(screen.getByTestId('games-library-game-modal')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('games-library-game-modal-overlay'));
    fireEvent.click(screen.getByTestId('games-library-game-modal-overlay'));

    await waitFor(() => {
      expect(screen.queryByTestId('games-library-game-modal')).not.toBeInTheDocument();
    });
  });

  it('closes when escape is pressed', async () => {
    function Harness(): React.JSX.Element {
      const [open, setOpen] = React.useState(true);

      return (
        <GamesLibraryGameDialog
          open={open}
          onOpenChange={setOpen}
          title='Clock training preview'
          description='Preview the runtime configuration for this game.'
        >
          <div>Modal body</div>
        </GamesLibraryGameDialog>
      );
    }

    render(<Harness />);

    expect(screen.getByTestId('games-library-game-modal')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('games-library-game-modal')).not.toBeInTheDocument();
    });
  });
});
