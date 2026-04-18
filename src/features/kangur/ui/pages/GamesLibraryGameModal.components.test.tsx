/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GamesLibraryGameDialog } from './GamesLibraryGameModal.components';
import { GamesLibraryGameModalProvider } from './GamesLibraryGameModal.context';

const mockTranslations = ((key: string) => key) as any;
const mockGame = {
  id: 'clock_training',
  title: 'Clock training preview',
  description: 'Preview the runtime configuration for this game.',
  engineId: 'clock_training_engine',
  status: 'active',
  emoji: '🕐',
  ageGroup: 'age_6_7',
  subject: 'maths',
  mechanic: 'clock_training',
  variants: [],
  lessonComponentIds: [],
  legacyScreenIds: [],
} as any;

const createMockState = (overrides = {}) => ({
  open: true,
  onOpenChange: vi.fn(),
  translations: mockTranslations,
  locale: 'en',
  settingsOpen: false,
  setSettingsOpen: vi.fn(),
  handleCloseModal: vi.fn(),
  game: mockGame,
  supportsPreviewSettings: false,
  lessonGameSectionsQuery: { isPending: false } as any,
  gameInstancesQuery: { isPending: false, data: [] } as any,
  ...overrides,
}) as any;

describe('GamesLibraryGameDialog', () => {
  it('provides hidden dialog metadata required by Radix accessibility checks', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(
        <GamesLibraryGameModalProvider basePath='/kangur' state={createMockState()}>
          <GamesLibraryGameDialog>
            <div>Modal body</div>
          </GamesLibraryGameDialog>
        </GamesLibraryGameModalProvider>
      );

      expect(screen.getByText('Clock training preview')).toBeInTheDocument();
      expect(
        screen.getByText('Preview the runtime configuration for this game.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('games-library-game-modal-overlay')).toHaveClass(
        '!backdrop-blur-0'
      );
      expect(screen.getByTestId('games-library-game-modal')).toHaveClass(
        'bg-[var(--kangur-page-background,#f8fafc)]',
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
        <GamesLibraryGameModalProvider basePath='/kangur' state={createMockState({ open, onOpenChange: setOpen })}>
          <GamesLibraryGameDialog>
            <div>Modal body</div>
          </GamesLibraryGameDialog>
        </GamesLibraryGameModalProvider>
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
        <GamesLibraryGameModalProvider basePath='/kangur' state={createMockState({ open, onOpenChange: setOpen })}>
          <GamesLibraryGameDialog>
            <div>Modal body</div>
          </GamesLibraryGameDialog>
        </GamesLibraryGameModalProvider>
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
