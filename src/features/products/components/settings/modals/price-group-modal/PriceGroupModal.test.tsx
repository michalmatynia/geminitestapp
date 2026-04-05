// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PriceGroup } from '@/shared/contracts/products/catalogs';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

const mocks = vi.hoisted(() => ({
  fields: [] as SettingsPanelField<Record<string, unknown>>[],
  mutateAsync: vi.fn(),
  toast: vi.fn(),
  priceGroups: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/features/internationalization/public', () => ({
  useInternationalizationData: () => ({
    currencies: [
      { code: 'PLN', name: 'Polish Zloty' },
      { code: 'EUR', name: 'Euro' },
    ],
    loadingCurrencies: false,
  }),
}));

vi.mock('@/features/products/components/settings/ProductSettingsContext', () => ({
  useProductSettingsPriceGroupsContext: () => ({
    priceGroups: mocks.priceGroups,
  }),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useSavePriceGroupMutation: () => ({
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  }),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: vi.fn(),
}));

vi.mock('@/shared/ui/templates/SettingsPanelBuilder', () => ({
  SettingsPanelBuilder: (props: {
    fields: SettingsPanelField<Record<string, unknown>>[];
  }) => {
    mocks.fields = props.fields;
    return (
      <div data-testid='settings-panel-builder'>
        {props.fields.map((field) => (
          <div key={String(field.key)}>
            <span>{field.label}</span>
            <span data-testid={`field-${String(field.key)}-disabled`}>
              {field.disabled ? 'disabled' : 'enabled'}
            </span>
            {'options' in field && field.options ? (
              <span data-testid={`field-${String(field.key)}-options`}>
                {field.options.map((option) => option.label).join(' | ')}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    );
  },
}));

import { PriceGroupModal } from './PriceGroupModal';

const dependentPriceGroup: PriceGroup = {
  id: 'group-eur',
  groupId: 'EUR_RETAIL',
  name: 'Retail EUR',
  description: null,
  currencyId: 'EUR',
  currencyCode: 'EUR',
  isDefault: false,
  type: 'dependent',
  basePriceField: 'price',
  sourceGroupId: 'group-pln',
  priceMultiplier: 1.25,
  addToPrice: 3,
  createdAt: '2026-04-04T00:00:00.000Z',
  updatedAt: '2026-04-04T00:00:00.000Z',
};

const standardAdjustedPriceGroup: PriceGroup = {
  id: 'group-eur-standard',
  groupId: 'EUR_STANDARD',
  name: 'Standard EUR',
  description: null,
  currencyId: 'EUR',
  currencyCode: 'EUR',
  isDefault: false,
  type: 'standard',
  basePriceField: 'price',
  sourceGroupId: null,
  priceMultiplier: 1.2,
  addToPrice: 5,
  createdAt: '2026-04-04T00:00:00.000Z',
  updatedAt: '2026-04-04T00:00:00.000Z',
};

describe('PriceGroupModal', () => {
  beforeEach(() => {
    mocks.fields = [];
    mocks.mutateAsync.mockReset().mockResolvedValue(undefined);
    mocks.toast.mockReset();
    mocks.priceGroups = [
      {
        id: 'group-pln',
        groupId: 'PLN_STANDARD',
        name: 'Standard PLN',
        description: null,
        currencyId: 'PLN',
        currencyCode: 'PLN',
        isDefault: true,
        type: 'standard',
        basePriceField: 'price',
        sourceGroupId: null,
        priceMultiplier: 1,
        addToPrice: 0,
      },
      {
        id: 'group-eur',
        groupId: 'EUR_RETAIL',
        name: 'Retail EUR',
        description: null,
        currencyId: 'EUR',
        currencyCode: 'EUR',
        isDefault: false,
        type: 'dependent',
        basePriceField: 'price',
        sourceGroupId: 'group-pln',
        priceMultiplier: 1.25,
        addToPrice: 3,
      },
    ];
  });

  it('renders dependent price-group fields and keeps them editable for dependent groups', () => {
    render(
      <PriceGroupModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        item={dependentPriceGroup}
      />
    );

    expect(screen.getByText('Group type')).toBeInTheDocument();
    expect(screen.getByText('Source price group')).toBeInTheDocument();
    expect(screen.getByText('Price multiplier')).toBeInTheDocument();
    expect(screen.getByText('Add to price')).toBeInTheDocument();
    expect(screen.getByTestId('field-sourceGroupId-disabled')).toHaveTextContent('enabled');
    expect(screen.getByTestId('field-priceMultiplier-disabled')).toHaveTextContent('enabled');
    expect(screen.getByTestId('field-addToPrice-disabled')).toHaveTextContent('enabled');
    expect(screen.getByTestId('field-sourceGroupId-options')).toHaveTextContent('Standard PLN (PLN)');
    expect(screen.getByTestId('field-sourceGroupId-options')).not.toHaveTextContent(
      'Retail EUR (EUR)'
    );
  });

  it('keeps multiplier fields editable for standard groups while leaving source disabled', () => {
    render(
      <PriceGroupModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        item={standardAdjustedPriceGroup}
      />
    );

    expect(screen.getByTestId('field-sourceGroupId-disabled')).toHaveTextContent('disabled');
    expect(screen.getByTestId('field-priceMultiplier-disabled')).toHaveTextContent('enabled');
    expect(screen.getByTestId('field-addToPrice-disabled')).toHaveTextContent('enabled');
  });

  it('hides descendant groups from source options to avoid dependency cycles', () => {
    render(
      <PriceGroupModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        item={{
          ...dependentPriceGroup,
          id: 'group-pln',
          groupId: 'PLN_STANDARD',
          name: 'Standard PLN',
          currencyId: 'PLN',
          currencyCode: 'PLN',
          type: 'dependent',
          sourceGroupId: '',
        }}
      />
    );

    expect(screen.getByTestId('field-sourceGroupId-options')).not.toHaveTextContent(
      'Retail EUR (EUR)'
    );
  });

  it('hides legacy descendant groups whose sourceGroupId points to groupId', () => {
    mocks.priceGroups = [
      {
        id: 'group-pln',
        groupId: 'PLN_STANDARD',
        name: 'Standard PLN',
        description: null,
        currencyId: 'PLN',
        currencyCode: 'PLN',
        isDefault: true,
        type: 'standard',
        basePriceField: 'price',
        sourceGroupId: null,
        priceMultiplier: 1,
        addToPrice: 0,
      },
      {
        id: 'group-eur',
        groupId: 'EUR_RETAIL',
        name: 'Retail EUR',
        description: null,
        currencyId: 'EUR',
        currencyCode: 'EUR',
        isDefault: false,
        type: 'dependent',
        basePriceField: 'price',
        sourceGroupId: 'PLN_STANDARD',
        priceMultiplier: 1.25,
        addToPrice: 3,
      },
    ];

    render(
      <PriceGroupModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        item={{
          ...dependentPriceGroup,
          id: 'group-pln',
          groupId: 'PLN_STANDARD',
          name: 'Standard PLN',
          currencyId: 'PLN',
          currencyCode: 'PLN',
          type: 'dependent',
          sourceGroupId: '',
        }}
      />
    );

    expect(screen.getByTestId('field-sourceGroupId-options')).not.toHaveTextContent(
      'Retail EUR (EUR)'
    );
  });
});
