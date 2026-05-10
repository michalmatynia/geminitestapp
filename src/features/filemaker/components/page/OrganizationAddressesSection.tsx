'use client';

import React, { useState } from 'react';

import type { CountryOption } from '@/shared/contracts/internationalization';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';
import type { EditableAddress } from '../../hooks/editable-address';
import type { FilemakerAddress } from '../../types';
import { OrganizationAddressFormControls } from './OrganizationAddressControls';
import {
  useAddressActionHandlers,
  useAddressOptions,
  useAddressSelection,
} from './OrganizationAddressesSection.controller';

type FilemakerAddressesSectionProps = {
  countries: CountryOption[];
  databaseAddresses: FilemakerAddress[];
  editableAddresses: EditableAddress[];
  setEditableAddresses: (value: React.SetStateAction<EditableAddress[]>) => void;
  title?: string;
};

export function FilemakerAddressesSection(
  props: FilemakerAddressesSectionProps
): React.JSX.Element {
  const [attachAddressId, setAttachAddressId] = useState('');
  const { selectedAddress, setSelectedAddressId } = useAddressSelection(props.editableAddresses);
  const { attachOptions, countryById, countryOptions, linkedOptions } = useAddressOptions({
    countries: props.countries,
    databaseAddresses: props.databaseAddresses,
    editableAddresses: props.editableAddresses,
  });
  const actions = useAddressActionHandlers({
    attachAddressId,
    countries: props.countries,
    countryById,
    databaseAddresses: props.databaseAddresses,
    selectedAddress,
    setAttachAddressId,
    setEditableAddresses: props.setEditableAddresses,
    setSelectedAddressId,
  });

  return (
    <FormSection title={props.title ?? 'Addresses'} className='space-y-4 p-4'>
      <OrganizationAddressFormControls
        attachAddressId={attachAddressId}
        attachOptions={attachOptions}
        countryById={countryById}
        countryOptions={countryOptions}
        linkedCount={props.editableAddresses.length}
        linkedOptions={linkedOptions}
        onAddAddress={actions.handleAddAddress}
        onAttachAddress={actions.handleAttachAddress}
        onRemoveAddress={actions.handleRemoveAddress}
        onSetDefault={actions.handleSetDefault}
        selectedAddress={selectedAddress}
        setAttachAddressId={setAttachAddressId}
        setSelectedAddressId={setSelectedAddressId}
        sharedCount={props.databaseAddresses.length}
        updateSelectedAddress={actions.updateSelectedAddress}
      />
    </FormSection>
  );
}

export function OrganizationAddressesSection(): React.JSX.Element {
  const { editableAddresses, database, countries } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const { setEditableAddresses } = useAdminFilemakerOrganizationEditPageActionsContext();

  return (
    <FilemakerAddressesSection
      countries={countries}
      databaseAddresses={database.addresses}
      editableAddresses={editableAddresses}
      setEditableAddresses={setEditableAddresses}
    />
  );
}
