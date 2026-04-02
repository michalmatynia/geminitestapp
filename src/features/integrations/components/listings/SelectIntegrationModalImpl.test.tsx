import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  formModalPropsMock,
  useIntegrationSelectionMock,
} = vi.hoisted(() => ({
  formModalPropsMock: vi.fn(),
  useIntegrationSelectionMock: vi.fn(),
}));

vi.mock('./hooks/useIntegrationSelection', () => ({
  useIntegrationSelection: (...args: unknown[]) => useIntegrationSelectionMock(...args),
}));

vi.mock('@/shared/ui', () => ({
  FormModal: ({
    children,
    open,
    title,
    saveText,
  }: {
    children?: React.ReactNode;
    open?: boolean;
    title?: string;
    saveText?: string;
  }) => {
    formModalPropsMock({ title, saveText });
    return open ? <div data-testid='form-modal'>{children}</div> : null;
  },
  IntegrationSelector: () => <div data-testid='integration-selector' />,
}));

import SelectIntegrationModal from './SelectIntegrationModalImpl';

describe('SelectIntegrationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIntegrationSelectionMock.mockReturnValue({
      integrations: [],
      loading: false,
      selectedIntegrationId: null,
      selectedConnectionId: null,
      setSelectedIntegrationId: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });
  });

  it('uses shared select-integration modal copy', () => {
    render(
      <SelectIntegrationModal
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(formModalPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Select Marketplace / Integration',
        saveText: 'Continue',
      })
    );
  });

  it('renders shared integration empty-state copy when no integrations are connected', () => {
    render(
      <SelectIntegrationModal
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('No connected integrations')).toBeInTheDocument();
    expect(screen.getByText('Set up an integration first')).toBeInTheDocument();
  });
});
