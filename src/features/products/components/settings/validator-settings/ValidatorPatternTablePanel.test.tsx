// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useValidatorSettingsContextMock: vi.fn(),
  toastMock: vi.fn(),
  openCreateMock: vi.fn(),
  clipboardWriteTextMock: vi.fn(),
}));

vi.mock('./ValidatorSettingsContext', () => ({
  useValidatorSettingsContext: mocks.useValidatorSettingsContextMock,
}));

vi.mock('./ValidatorPatternTree', () => ({
  ValidatorPatternTree: () => <div>validator-pattern-tree</div>,
}));

vi.mock('./ValidatorPatternImportModal', () => ({
  ValidatorPatternImportModal: ({
    open,
  }: {
    open: boolean;
  }) => (open ? <div>validator-pattern-import-modal</div> : null),
}));

vi.mock('./validator-documentation-clipboard', () => ({
  buildFullValidatorDocumentationClipboardText: () => 'validator docs',
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(), logClientCatch: vi.fn(),
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    title,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    title?: string;
  }) => (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={title}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/empty-state', () => ({
  EmptyState: ({
    title,
  }: {
    title?: string;
  }) => <div>{title}</div>,
}));

vi.mock('@/shared/ui/form-section', () => ({
  FormSection: ({
    title,
    description,
    children,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
}));

vi.mock('@/shared/ui/LoadingState', () => ({
  LoadingState: ({
    message,
  }: {
    message?: string;
  }) => <div>{message}</div>,
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: mocks.toastMock,
  }),
}));

import { ValidatorPatternTablePanel } from './ValidatorPatternTablePanel';

describe('ValidatorPatternTablePanel', () => {
  beforeEach(() => {
    mocks.toastMock.mockReset();
    mocks.openCreateMock.mockReset();
    mocks.clipboardWriteTextMock.mockReset();

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: mocks.clipboardWriteTextMock,
      },
    });

    mocks.useValidatorSettingsContextMock.mockReturnValue({
      summary: { enabled: 39, total: 44 },
      loading: false,
      patterns: [{ id: 'pattern-1' }],
      openCreate: mocks.openCreateMock,
    });
  });

  it('renders the summary header with the reduced action toolbar', () => {
    render(<ValidatorPatternTablePanel />);

    expect(screen.getByRole('heading', { name: 'Regex Pattern Table' })).toBeInTheDocument();
    expect(screen.getByText('Active patterns: 39/44')).toBeInTheDocument();
    expect(screen.getByText('validator-pattern-tree')).toBeInTheDocument();

    const toolbar = screen.getByTestId('validator-pattern-actions');
    expect(toolbar).toHaveClass('w-full');
    expect(toolbar).toHaveClass('flex-wrap');
    expect(screen.queryByRole('button', { name: '+ SKU Auto Sequence' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '+ Latest Price & Stock' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '+ Name Segment to Length + Height' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '+ Name Segment to Category' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Name EN to PL' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import JSON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Full Validation Docs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Pattern/ })).toBeInTheDocument();
  });

  it('keeps toolbar actions wired after the layout change', async () => {
    mocks.clipboardWriteTextMock.mockResolvedValue(undefined);

    render(<ValidatorPatternTablePanel />);

    fireEvent.click(screen.getByRole('button', { name: /Add Pattern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Full Validation Docs' }));

    expect(mocks.openCreateMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('validator-pattern-import-modal')).toBeInTheDocument();
    expect(mocks.clipboardWriteTextMock).toHaveBeenCalledWith('validator docs');
  });
});
