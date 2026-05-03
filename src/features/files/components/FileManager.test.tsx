// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FileManager, { FileManagerRuntimeContext } from './FileManager';

const mocks = vi.hoisted(() => ({
  fileManagerProvider: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div data-testid='card'>{children}</div>,
}));

vi.mock('../contexts/FileManagerContext', () => ({
  FileManagerProvider: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => {
    mocks.fileManagerProvider(props);
    return <div data-testid='file-manager-provider'>{children}</div>;
  },
}));

vi.mock('./file-manager/FileManagerHeader', () => ({
  FileManagerHeader: () => <div>header</div>,
}));

vi.mock('./file-manager/FileManagerFilters', () => ({
  FileManagerFilters: () => <div>filters</div>,
}));

vi.mock('./file-manager/FileManagerBulkActions', () => ({
  FileManagerBulkActions: () => <div>bulk-actions</div>,
}));

vi.mock('./file-manager/FileManagerContent', () => ({
  FileManagerContent: () => <div>content</div>,
}));

vi.mock('./file-manager/FileManagerModals', () => ({
  FileManagerModals: () => <div>modals</div>,
}));

describe('FileManager runtime context', () => {
  it('falls back to runtime onSelectFile when the prop is omitted', () => {
    const runtimeOnSelectFile = vi.fn();

    render(
      <FileManagerRuntimeContext.Provider value={{ onSelectFile: runtimeOnSelectFile }}>
        <FileManager mode='select' selectionMode='single' />
      </FileManagerRuntimeContext.Provider>
    );

    expect(screen.getByTestId('file-manager-provider')).toBeInTheDocument();
    expect(mocks.fileManagerProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        onSelectFile: runtimeOnSelectFile,
        mode: 'select',
        selectionMode: 'single',
      })
    );
  });

  it('prefers the explicit onSelectFile prop over the runtime value', () => {
    const runtimeOnSelectFile = vi.fn();
    const propOnSelectFile = vi.fn();

    render(
      <FileManagerRuntimeContext.Provider value={{ onSelectFile: runtimeOnSelectFile }}>
        <FileManager onSelectFile={propOnSelectFile} />
      </FileManagerRuntimeContext.Provider>
    );

    expect(mocks.fileManagerProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        onSelectFile: propOnSelectFile,
      })
    );
  });
});
