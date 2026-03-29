/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useSocialPostContextMock, usePlaywrightPersonasMock } = vi.hoisted(() => ({
  useSocialPostContextMock: vi.fn(),
  usePlaywrightPersonasMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  FormModal: ({
    open,
    title,
    subtitle,
    actions,
    onSave,
    isSaveDisabled,
    saveText = 'Save',
    cancelText = 'Close',
    onClose,
    children,
  }: {
    open?: boolean;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    onSave: () => void;
    isSaveDisabled?: boolean;
    saveText?: string;
    cancelText?: string;
    onClose: () => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role='dialog' aria-label={String(title)}>
        <div>{title}</div>
        {subtitle ? <div>{subtitle}</div> : null}
        <div>{actions}</div>
        <button type='button' disabled={Boolean(isSaveDisabled)} onClick={() => onSave()}>
          {saveText}
        </button>
        <button type='button' onClick={() => onClose()}>
          {cancelText}
        </button>
        {children}
      </div>
    ) : null,
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
  ),
  FormField: ({
    label,
    description,
    children,
  }: {
    label: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {description ? <span>{description}</span> : null}
      {children}
    </label>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  LoadingState: ({ message }: { message?: string }) => <div role='status'>{message}</div>,
}));

vi.mock('./SocialPostContext', () => ({
  useSocialPostContext: () => useSocialPostContextMock(),
}));

vi.mock('@/shared/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: (...args: unknown[]) => usePlaywrightPersonasMock(...args),
}));

import { SocialPostPlaywrightCaptureModal } from './SocialPost.PlaywrightCaptureModal';

describe('SocialPostPlaywrightCaptureModal', () => {
  it('renders personas, programmable routes, and the editable script', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [{ id: 'persona-1', name: 'Fast reviewer' }],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      isProgrammablePlaywrightModalOpen: true,
      handleCloseProgrammablePlaywrightModal: vi.fn(),
      programmableCaptureBaseUrl: 'https://example.com',
      setProgrammableCaptureBaseUrl: vi.fn(),
      programmableCapturePersonaId: 'persona-1',
      setProgrammableCapturePersonaId: vi.fn(),
      programmableCaptureScript: 'return input.captures;',
      setProgrammableCaptureScript: vi.fn(),
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: 'Capture pricing hero',
          selector: '[data-pricing]',
          waitForMs: 200,
          waitForSelectorMs: 3000,
        },
      ],
      programmableCapturePending: false,
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      handleAddProgrammableCaptureRoute: vi.fn(),
      handleUpdateProgrammableCaptureRoute: vi.fn(),
      handleRemoveProgrammableCaptureRoute: vi.fn(),
      handleSeedProgrammableCaptureRoutesFromPresets: vi.fn(),
      handleResetProgrammableCaptureScript: vi.fn(),
      handleRunProgrammablePlaywrightCapture: vi.fn(),
    });

    render(<SocialPostPlaywrightCaptureModal />);

    expect(
      screen.getByRole('dialog', { name: 'Programmable Playwright capture' })
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pricing page')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/pricing')).toBeInTheDocument();
    expect(screen.getByDisplayValue('return input.captures;')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capture programmable images' })).toBeEnabled();
  });

  it('delegates modal actions to the Social page context', () => {
    const handleCloseProgrammablePlaywrightModal = vi.fn();
    const setProgrammableCapturePersonaId = vi.fn();
    const handleAddProgrammableCaptureRoute = vi.fn();
    const handleSeedProgrammableCaptureRoutesFromPresets = vi.fn();
    const handleResetProgrammableCaptureScript = vi.fn();
    const handleRunProgrammablePlaywrightCapture = vi.fn();

    usePlaywrightPersonasMock.mockReturnValue({
      data: [{ id: 'persona-1', name: 'Fast reviewer' }],
      isLoading: false,
      error: null,
    });
    useSocialPostContextMock.mockReturnValue({
      isProgrammablePlaywrightModalOpen: true,
      handleCloseProgrammablePlaywrightModal,
      programmableCaptureBaseUrl: 'https://example.com',
      setProgrammableCaptureBaseUrl: vi.fn(),
      programmableCapturePersonaId: '',
      setProgrammableCapturePersonaId,
      programmableCaptureScript: 'return input.captures;',
      setProgrammableCaptureScript: vi.fn(),
      programmableCaptureRoutes: [
        {
          id: 'route-1',
          title: 'Pricing page',
          path: '/pricing',
          description: '',
          selector: '',
          waitForMs: 0,
          waitForSelectorMs: 10000,
        },
      ],
      programmableCapturePending: false,
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      handleAddProgrammableCaptureRoute,
      handleUpdateProgrammableCaptureRoute: vi.fn(),
      handleRemoveProgrammableCaptureRoute: vi.fn(),
      handleSeedProgrammableCaptureRoutesFromPresets,
      handleResetProgrammableCaptureScript,
      handleRunProgrammablePlaywrightCapture,
    });

    render(<SocialPostPlaywrightCaptureModal />);

    fireEvent.change(screen.getByLabelText('Playwright persona'), {
      target: { value: 'persona-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add route' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seed from presets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset script' }));
    fireEvent.click(screen.getByRole('button', { name: 'Capture programmable images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(setProgrammableCapturePersonaId).toHaveBeenCalledWith('persona-1');
    expect(handleAddProgrammableCaptureRoute).toHaveBeenCalledTimes(1);
    expect(handleSeedProgrammableCaptureRoutesFromPresets).toHaveBeenCalledTimes(1);
    expect(handleResetProgrammableCaptureScript).toHaveBeenCalledTimes(1);
    expect(handleRunProgrammablePlaywrightCapture).toHaveBeenCalledTimes(1);
    expect(handleCloseProgrammablePlaywrightModal).toHaveBeenCalledTimes(1);
  });
});
