import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilemakerValue } from '../../types';
import type {
  FilemakerOrganizationHarvestProfile,
  FilemakerOrganizationImportedDemand,
  FilemakerOrganizationImportedProfile,
} from '../../filemaker-organization-imported-metadata';
import { OrganizationImportedMetadataSection } from './OrganizationImportedMetadataSection';

const mocks = vi.hoisted(() => ({
  harvestProfiles: [] as FilemakerOrganizationHarvestProfile[],
  importedDemands: [] as FilemakerOrganizationImportedDemand[],
  importedProfiles: [] as FilemakerOrganizationImportedProfile[],
  valueCatalog: [] as FilemakerValue[],
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title: string;
  }) => (
    <section aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('../../context/AdminFilemakerOrganizationEditPageContext', () => ({
  useAdminFilemakerOrganizationEditPageStateContext: () => ({
    harvestProfiles: mocks.harvestProfiles,
    importedDemands: mocks.importedDemands,
    importedProfiles: mocks.importedProfiles,
    valueCatalog: mocks.valueCatalog,
  }),
}));

const createCatalogValue = (input: {
  id: string;
  label: string;
  legacyUuid: string;
}): FilemakerValue =>
  ({
    id: input.id,
    label: input.label,
    legacyUuid: input.legacyUuid,
    sortOrder: 0,
    value: input.label,
  }) as FilemakerValue;

describe('OrganizationImportedMetadataSection', () => {
  beforeEach(() => {
    mocks.harvestProfiles = [];
    mocks.importedDemands = [];
    mocks.importedProfiles = [];
    mocks.valueCatalog = [];
  });

  it('does not render when no imported metadata exists', () => {
    const { container } = render(<OrganizationImportedMetadataSection />);

    expect(container.firstChild).toBeNull();
  });

  it('renders imported organization profile values from the value catalog', () => {
    mocks.importedProfiles = [
      {
        id: 'profile-1',
        legacyOrganizationUuid: 'ORG-LEGACY',
        legacyUuid: 'PROFILE-LEGACY',
        legacyValueUuids: ['VALUE-ROOT', 'VALUE-CHILD'],
        valueIds: [],
        values: [],
        updatedAt: '2026-03-01T10:00:00.000Z',
        updatedBy: 'Admin',
      },
    ];
    mocks.valueCatalog = [
      createCatalogValue({
        id: 'value-root',
        label: 'Education',
        legacyUuid: 'VALUE-ROOT',
      }),
      createCatalogValue({
        id: 'value-child',
        label: 'Higher education',
        legacyUuid: 'VALUE-CHILD',
      }),
    ];

    render(<OrganizationImportedMetadataSection />);

    expect(screen.getByRole('region', { name: 'Imported FileMaker Metadata' })).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Education > Higher education')).toBeInTheDocument();
  });
});
