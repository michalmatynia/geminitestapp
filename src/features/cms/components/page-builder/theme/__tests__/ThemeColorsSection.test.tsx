import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';

const mockState = vi.hoisted(() => ({
  update: vi.fn(),
  setSchemeView: vi.fn(),
  setEditingSchemeId: vi.fn(),
  startAddScheme: vi.fn(),
  startEditScheme: vi.fn(),
  handleSaveScheme: vi.fn(),
  setNewSchemeName: vi.fn(),
  updateSchemeColor: vi.fn(),
  toggleGlobalPalette: vi.fn(),
}));

vi.mock('../ThemeColorsContext', () => ({
  useThemeColorsState: () => ({
    schemeView: 'list',
    editingSchemeId: null,
    activeScheme: null,
    newSchemeName: '',
    newSchemeColors: {},
    isGlobalPaletteOpen: false,
  }),
  useThemeColorsActions: () => ({
    setSchemeView: mockState.setSchemeView,
    setEditingSchemeId: mockState.setEditingSchemeId,
    startAddScheme: mockState.startAddScheme,
    startEditScheme: mockState.startEditScheme,
    handleSaveScheme: mockState.handleSaveScheme,
    setNewSchemeName: mockState.setNewSchemeName,
    updateSchemeColor: mockState.updateSchemeColor,
    toggleGlobalPalette: mockState.toggleGlobalPalette,
  }),
}));

vi.mock('../../ThemeSettingsContext', () => ({
  useThemeSettingsValue: () => ({
    activeColorSchemeId: 'scheme-2',
    colorSchemes: [
      {
        id: 'scheme-1',
        name: 'Warm',
        colors: {
          background: '#111111',
          border: '#222222',
          surface: '#333333',
          text: '#eeeeee',
          accent: '#f97316',
        },
      },
      {
        id: 'scheme-2',
        name: 'Cool',
        colors: {
          background: '#0f172a',
          border: '#1e293b',
          surface: '#1e293b',
          text: '#e2e8f0',
          accent: '#38bdf8',
        },
      },
    ],
  }),
  useThemeSettingsActions: () => ({
    update: mockState.update,
  }),
}));

vi.mock('./ThemeAiSection', () => ({
  ThemeAiSection: (): null => null,
}));

vi.mock('../../shared-fields', () => ({
  ColorField: (): null => null,
  TextField: (): null => null,
}));

vi.mock('@/shared/ui', () => ({
  ...(() => {
    const React = require('react') as typeof import('react');
    return {
      Button: ({
        children,
        ...props
      }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
        <button {...props}>{children}</button>
      ),
      Badge: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element => <span {...props}>{children}</span>,
      Card: ({
        children,
        className,
      }: {
        children: React.ReactNode;
        className?: string;
      }): React.JSX.Element => <div className={className}>{children}</div>,
      Hint: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
    };
  })(),
}));

import { ThemeColorsSection } from '../ThemeColorsSection';

describe('ThemeColorsSection', () => {
  beforeEach(() => {
    mockState.update.mockReset();
    mockState.startEditScheme.mockReset();
  });

  it('renders color schemes as radio options and updates the active scheme on click', () => {
    render(<ThemeColorsSection />);

    expect(screen.getByRole('radiogroup', { name: 'Color schemes' })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Cool, active color scheme' })
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Warm, select color scheme' })).toHaveAttribute(
      'aria-checked',
      'false'
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Warm, select color scheme' }));
    expect(mockState.update).toHaveBeenCalledWith('activeColorSchemeId', 'scheme-1');

    fireEvent.click(screen.getByRole('button', { name: 'Edit color scheme Cool' }));
    expect(mockState.startEditScheme).toHaveBeenCalledWith('scheme-2');
  });
});
