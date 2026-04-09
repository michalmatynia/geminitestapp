import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VersionNodeDetailsModal } from '../VersionNodeDetailsModal';
import { VersionNodeDetailsModalRuntimeProvider } from '../VersionNodeDetailsModalRuntimeContext';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { VersionNode } from '@/features/ai/image-studio/utils/version-graph';

vi.mock('@/shared/ui/primitives.public', () => ({
  Hint: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }): React.JSX.Element => <div className={className}>{children}</div>,
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  DetailModal: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
  }): React.JSX.Element | null =>
    isOpen ? (
      <div>
        <h1>{title}</h1>
        {children}
      </div>
    ) : null,
}));

const createNode = (): VersionNode => ({
  id: 'slot-1',
  label: 'Sample Node',
  type: 'generation',
  parentIds: [],
  childIds: [],
  hasMask: false,
  depth: 0,
  x: 0,
  y: 0,
  descendantCount: 0,
  slot: {
    id: 'slot-1',
    projectId: 'project-alpha',
    name: 'Sample Slot',
    folderPath: 'root',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    imageUrl: 'https://example.test/slot-1.png',
    metadata: {
      relationType: 'generation:prompt',
      role: 'generation',
    },
  } as ImageStudioSlotRecord,
});

describe('VersionNodeDetailsModal runtime', () => {
  it('supports the shared runtime context path when explicit props are omitted', () => {
    render(
      <VersionNodeDetailsModalRuntimeProvider
        value={{
          isOpen: true,
          item: createNode(),
          onClose: vi.fn(),
          getSlotImageSrc: () => 'https://example.test/slot-1.png',
        }}
      >
        <VersionNodeDetailsModal />
      </VersionNodeDetailsModalRuntimeProvider>
    );

    expect(screen.getByText('Node Details: Sample Node')).toBeInTheDocument();
    expect(screen.getByText('Sample Slot')).toBeInTheDocument();
    expect(screen.getByText('generation:prompt')).toBeInTheDocument();
  });

  it('throws when neither runtime context nor explicit props are provided', () => {
    expect(() => render(<VersionNodeDetailsModal />)).toThrow(
      'VersionNodeDetailsModal must be used within VersionNodeDetailsModalRuntimeProvider or receive explicit props'
    );
  });
});
