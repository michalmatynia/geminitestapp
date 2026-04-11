import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ApiError } from '@/shared/lib/api-client';

const {
  mutateAsyncMock,
  toastMock,
  useDefaultTraderaConnectionMock,
  useIntegrationsWithConnectionsMock,
  useLinkExistingTraderaListingMutationMock,
} = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
  useDefaultTraderaConnectionMock: vi.fn(),
  useIntegrationsWithConnectionsMock: vi.fn(),
  useLinkExistingTraderaListingMutationMock: vi.fn(),
}));

vi.mock('@/features/integrations/public', () => ({
  isTraderaIntegrationSlug: (value: string | null | undefined) =>
    ['tradera', 'tradera-api'].includes((value ?? '').trim().toLowerCase()),
  useDefaultTraderaConnection: () => useDefaultTraderaConnectionMock(),
  useIntegrationsWithConnections: () => useIntegrationsWithConnectionsMock(),
  useLinkExistingTraderaListingMutation: () => useLinkExistingTraderaListingMutationMock(),
}));

vi.mock('@/shared/ui/FormModal', () => ({
  FormModal: ({
    open,
    title,
    children,
    onSave,
    onClose,
    saveText,
    cancelText,
    isSaveDisabled,
  }: {
    open: boolean;
    title: string;
    children?: ReactNode;
    onSave?: () => void;
    onClose?: () => void;
    saveText?: string;
    cancelText?: string;
    isSaveDisabled?: boolean;
  }) =>
    open ? (
      <div>
        <h1>{title}</h1>
        {children}
        <button type='button' onClick={onClose}>
          {cancelText ?? 'Cancel'}
        </button>
        <button type='button' onClick={onSave} disabled={isSaveDisabled}>
          {saveText ?? 'Save'}
        </button>
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/input', () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/shared/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children?: ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select
      aria-label='Choose Tradera connection'
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      <option value=''>Choose Tradera connection</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

import { TraderaLinkModal } from './TraderaLinkModal';

const product = {
  id: 'product-1',
  name_en: 'Keychain',
} as ProductWithImages;

const integrations: IntegrationWithConnections[] = [
  {
    id: 'integration-tradera',
    name: 'Tradera',
    slug: 'tradera',
    connections: [
      { id: 'connection-1', name: 'Main Browser', integrationId: 'integration-tradera' },
      { id: 'connection-2', name: 'Backup Browser', integrationId: 'integration-tradera' },
    ],
  } as IntegrationWithConnections,
];

describe('TraderaLinkModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIntegrationsWithConnectionsMock.mockReturnValue({
      data: integrations,
      isLoading: false,
    });
    useDefaultTraderaConnectionMock.mockReturnValue({
      data: { connectionId: 'connection-1' },
    });
    useLinkExistingTraderaListingMutationMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    });
  });

  it('submits the pasted Tradera URL for automatic inference', async () => {
    mutateAsyncMock.mockResolvedValue({
      linked: true,
      listingId: 'listing-1',
      connectionId: 'connection-1',
      integrationId: 'integration-tradera',
      externalListingId: '725128879',
      listingUrl: 'https://www.tradera.com/item/725128879',
      inferenceMethod: 'seller_alias',
    });

    const onClose = vi.fn();
    const onLinked = vi.fn();

    render(
      <TraderaLinkModal
        isOpen
        product={product}
        onClose={onClose}
        onLinked={onLinked}
      />
    );

    fireEvent.change(screen.getByLabelText('Tradera listing URL'), {
      target: { value: 'https://www.tradera.com/item/725128879' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Link Listing' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        listingUrl: 'https://www.tradera.com/item/725128879',
      });
    });

    expect(onLinked).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Linked existing Tradera listing by inferring the connection from the listing.',
      { variant: 'success' }
    );
  });

  it('falls back to a manual connection choice when inference is ambiguous', async () => {
    const ambiguousError = new ApiError(
      'Could not infer which Tradera connection should own this listing.',
      409
    );
    ambiguousError.payload = {
      details: {
        reason: 'ambiguous_connection',
        sellerAlias: 'seller-two',
        candidateConnections: [
          {
            integrationId: 'integration-tradera',
            integrationName: 'Tradera',
            integrationSlug: 'tradera',
            connectionId: 'connection-2',
            connectionName: 'Backup Browser',
            connectionUsername: 'seller-two',
          },
        ],
      },
    };

    mutateAsyncMock
      .mockRejectedValueOnce(ambiguousError)
      .mockResolvedValueOnce({
        linked: true,
        listingId: 'listing-2',
        connectionId: 'connection-2',
        integrationId: 'integration-tradera',
        externalListingId: '725128879',
        listingUrl: 'https://www.tradera.com/item/725128879',
        inferenceMethod: 'provided',
      });

    render(<TraderaLinkModal isOpen product={product} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Tradera listing URL'), {
      target: { value: 'https://www.tradera.com/item/725128879' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Link Listing' }));

    await waitFor(() => {
      expect(screen.getByText(/Detected seller alias:/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Choose Tradera connection'), {
      target: { value: 'connection-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Link Listing' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenLastCalledWith({
        listingUrl: 'https://www.tradera.com/item/725128879',
        connectionId: 'connection-2',
      });
    });
  });
});
