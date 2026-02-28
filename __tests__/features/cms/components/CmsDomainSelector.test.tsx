import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CmsDomainSelector } from '@/features/cms/components/CmsDomainSelector';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';

// Mock the hook
vi.mock('@/features/cms/hooks/useCmsDomainSelection', () => ({
  useCmsDomainSelection: vi.fn(),
}));

// Mock SelectSimple to avoid Radix UI issues in unit tests
vi.mock('@/shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui')>('@/shared/ui');
  return {
    ...actual,
    SelectSimple: ({
      value,
      onValueChange,
      options,
      disabled,
    }: {
      value: string;
      onValueChange: (val: string) => void;
      options: Array<{ value: string; label: string }>;
      disabled?: boolean;
    }) => (
      <select
        data-testid='select-simple'
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
        aria-label='Zone selector'
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
  };
});

describe('CmsDomainSelector', () => {
  const mockDomains = [
    { id: '1', domain: 'example.com', aliasOf: null },
    { id: '2', domain: 'alias.com', aliasOf: '1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render simple routing message when zoning is disabled', () => {
    vi.mocked(useCmsDomainSelection).mockReturnValue({
      domains: [],
      activeDomainId: null,
      hostDomainId: null,
      setActiveDomainId: vi.fn(),
      zoningEnabled: false,
    } as any);

    render(<CmsDomainSelector />);

    expect(screen.getByText('Simple routing')).toBeInTheDocument();
    expect(screen.queryByTestId('select-simple')).not.toBeInTheDocument();
  });

  it('should render SelectSimple when zoning is enabled', () => {
    vi.mocked(useCmsDomainSelection).mockReturnValue({
      domains: mockDomains,
      activeDomainId: '1',
      hostDomainId: '1',
      setActiveDomainId: vi.fn(),
      zoningEnabled: true,
    } as any);

    render(<CmsDomainSelector label='Test Zone' />);

    expect(screen.getByText('Test Zone')).toBeInTheDocument();
    const select = screen.getByTestId('select-simple');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('1');
  });

  it('should call setActiveDomainId and onChange when selection changes', () => {
    const setActiveDomainId = vi.fn();
    const onChange = vi.fn();

    vi.mocked(useCmsDomainSelection).mockReturnValue({
      domains: mockDomains,
      activeDomainId: '1',
      hostDomainId: '1',
      setActiveDomainId,
      zoningEnabled: true,
    } as any);

    render(<CmsDomainSelector onChange={onChange} />);

    const select = screen.getByTestId('select-simple');
    fireEvent.change(select, { target: { value: '2' } });

    expect(setActiveDomainId).toHaveBeenCalledWith('2');
    expect(onChange).toHaveBeenCalledWith('2');
  });

  it('should disable selector when there are no domains', () => {
    vi.mocked(useCmsDomainSelection).mockReturnValue({
      domains: [],
      activeDomainId: null,
      hostDomainId: null,
      setActiveDomainId: vi.fn(),
      zoningEnabled: true,
    } as any);

    render(<CmsDomainSelector />);

    const select = screen.getByTestId('select-simple');
    expect(select).toBeDisabled();
  });
});
