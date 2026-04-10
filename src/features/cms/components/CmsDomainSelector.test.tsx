import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CmsDomain } from '@/shared/contracts/cms';

type MockSelectSimpleProps = {
  options: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  ariaLabel?: string;
};

const { cmsDomainSelectionState, latestSelectSimpleProps, setActiveDomainIdMock } = vi.hoisted(
  () => ({
    cmsDomainSelectionState: { value: null as ReturnType<typeof buildSelection> | null },
    latestSelectSimpleProps: { current: null as MockSelectSimpleProps | null },
    setActiveDomainIdMock: vi.fn(),
  })
);

vi.mock('@/features/cms/hooks/useCmsDomainSelection', () => ({
  useCmsDomainSelection: () => cmsDomainSelectionState.value,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: (props: MockSelectSimpleProps) => {
    latestSelectSimpleProps.current = props;
    return (
      <select
        aria-label={props.ariaLabel}
        className={props.triggerClassName}
        disabled={props.disabled}
        value={props.value ?? ''}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
          props.onValueChange(event.target.value)
        }
      >
        <option value=''>{props.placeholder ?? 'Select'}</option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  },
}));

import { CmsDomainSelector } from '@/features/cms/components/CmsDomainSelector';

const buildDomain = (overrides: Partial<CmsDomain> = {}): CmsDomain =>
  ({
    id: 'domain-1',
    domain: 'example.com',
    aliasOf: null,
    createdAt: '2026-03-22T00:00:00.000Z',
    updatedAt: '2026-03-22T00:00:00.000Z',
    ...overrides,
  }) as CmsDomain;

function buildSelection(
  overrides: Partial<ReturnType<typeof import('@/features/cms/hooks/useCmsDomainSelection').useCmsDomainSelection>> = {}
) {
  return {
    domains: [] as CmsDomain[],
    activeDomainId: null as string | null,
    activeDomain: null as CmsDomain | null,
    canonicalDomain: null as CmsDomain | null,
    sharedWithDomains: [] as CmsDomain[],
    hostDomainId: null as string | null,
    zoningEnabled: true,
    isLoading: false,
    isSaving: false,
    setActiveDomainId: setActiveDomainIdMock,
    ...overrides,
  };
}

describe('CmsDomainSelector', () => {
  beforeEach(() => {
    latestSelectSimpleProps.current = null;
    setActiveDomainIdMock.mockReset();
    cmsDomainSelectionState.value = buildSelection();
  });

  it('renders a loading state with the section label', () => {
    cmsDomainSelectionState.value = buildSelection({
      isLoading: true,
    });

    render(<CmsDomainSelector label='Zone' />);

    expect(screen.getByText('Zone')).toBeInTheDocument();
    expect(screen.getByText('Loading zones...')).toBeInTheDocument();
    expect(screen.getByText('Loading zones...').closest('[aria-busy="true"]')).not.toBeNull();
  });

  it('renders the simple routing fallback when zoning is disabled', () => {
    cmsDomainSelectionState.value = buildSelection({
      zoningEnabled: false,
    });

    render(<CmsDomainSelector label='Zone' />);

    expect(screen.getByText('Zone')).toBeInTheDocument();
    expect(screen.getByText('Simple routing')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Zone selector' })).not.toBeInTheDocument();
  });

  it('passes resolved select props directly and propagates domain changes', () => {
    const domains = [
      buildDomain(),
      buildDomain({
        id: 'domain-2',
        domain: 'alias.example.com',
        aliasOf: 'domain-1',
      }),
    ];
    const onChange = vi.fn();

    cmsDomainSelectionState.value = buildSelection({
      domains,
      activeDomainId: 'domain-1',
      activeDomain: domains[0],
      hostDomainId: 'domain-1',
    });

    render(<CmsDomainSelector triggerClassName='zone-trigger' onChange={onChange} />);

    expect(screen.getByRole('combobox', { name: 'Zone selector' })).toHaveValue('domain-1');
    expect(latestSelectSimpleProps.current).toMatchObject({
      value: 'domain-1',
      disabled: false,
      triggerClassName: 'zone-trigger',
      options: [
        {
          value: 'domain-1',
          label: 'example.com',
          description: 'current host',
        },
        {
          value: 'domain-2',
          label: 'alias.example.com',
          description: 'shared zone',
        },
      ],
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'Zone selector' }), {
      target: { value: 'domain-2' },
    });

    expect(setActiveDomainIdMock).toHaveBeenCalledTimes(1);
    expect(setActiveDomainIdMock).toHaveBeenCalledWith('domain-2');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('domain-2');
  });

  it('does not propagate redundant domain changes', () => {
    cmsDomainSelectionState.value = buildSelection({
      domains: [buildDomain()],
      activeDomainId: 'domain-1',
      hostDomainId: 'domain-1',
    });

    render(<CmsDomainSelector />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Zone selector' }), {
      target: { value: 'domain-1' },
    });

    expect(setActiveDomainIdMock).not.toHaveBeenCalled();
  });
});
