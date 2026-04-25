'use client';

import { Link2, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { CountryOption } from '@/shared/contracts/internationalization';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Input } from '@/shared/ui/primitives.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import type { EditableAddress } from '../../hooks/editable-address';

type OrganizationAddressFormControlsProps = {
  attachAddressId: string;
  attachOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  countryById: Map<string, CountryOption>;
  countryOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  linkedCount: number;
  linkedOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  onAddAddress: () => void;
  onAttachAddress: () => void;
  onRemoveAddress: () => void;
  onSetDefault: () => void;
  selectedAddress: EditableAddress | null;
  setAttachAddressId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedAddressId: React.Dispatch<React.SetStateAction<string>>;
  sharedCount: number;
  updateSelectedAddress: (patch: Partial<EditableAddress>) => void;
};

function AddressSummaryBadges(props: {
  linkedCount: number;
  sharedCount: number;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Linked Addresses: {props.linkedCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Shared Addresses: {props.sharedCount}
      </Badge>
    </div>
  );
}

function LinkedAddressControls(props: {
  linkedOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  onAddAddress: () => void;
  onRemoveAddress: () => void;
  onSetDefault: () => void;
  selectedAddress: EditableAddress | null;
  setSelectedAddressId: React.Dispatch<React.SetStateAction<string>>;
}): React.JSX.Element {
  const { selectedAddress } = props;

  return (
    <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]'>
      <FormField label='Linked Address'>
        <SelectSimple
          value={selectedAddress?.addressId ?? ''}
          onValueChange={props.setSelectedAddressId}
          options={props.linkedOptions}
          placeholder='Select linked address'
          size='sm'
          ariaLabel='Select linked address'
          title='Select linked address'
        />
      </FormField>
      <Button type='button' size='sm' className='mt-auto h-9' onClick={props.onAddAddress}>
        <Plus className='mr-1.5 size-3.5' />
        New
      </Button>
      <Button
        type='button'
        size='sm'
        variant='outline'
        className='mt-auto h-9'
        onClick={props.onSetDefault}
        disabled={selectedAddress === null || selectedAddress.isDefault}
      >
        Set Default
      </Button>
      <Button
        type='button'
        size='sm'
        variant='outline'
        className='mt-auto h-9'
        onClick={props.onRemoveAddress}
        disabled={selectedAddress === null}
      >
        <Trash2 className='mr-1.5 size-3.5' />
        Remove
      </Button>
    </div>
  );
}

function AttachAddressControls(props: {
  attachAddressId: string;
  attachOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  onAttachAddress: () => void;
  setAttachAddressId: React.Dispatch<React.SetStateAction<string>>;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]'>
      <FormField label='Attach Existing Address'>
        <SelectSimple
          value={props.attachAddressId}
          onValueChange={props.setAttachAddressId}
          options={props.attachOptions}
          placeholder='Select shared address'
          size='sm'
          ariaLabel='Attach existing address'
          title='Attach existing address'
        />
      </FormField>
      <Button
        type='button'
        size='sm'
        variant='outline'
        className='mt-auto h-9'
        onClick={props.onAttachAddress}
        disabled={props.attachAddressId.trim().length === 0}
      >
        <Link2 className='mr-1.5 size-3.5' />
        Attach
      </Button>
    </div>
  );
}

function AddressInputField(props: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}): React.JSX.Element {
  return (
    <FormField label={props.label}>
      <Input
        value={props.value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          props.onChange(event.target.value);
        }}
        placeholder={props.placeholder}
        disabled={props.disabled}
        aria-label={props.placeholder}
        title={props.placeholder}
      />
    </FormField>
  );
}

function AddressCountryField(props: {
  countryById: Map<string, CountryOption>;
  countryOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  disabled: boolean;
  selectedAddress: EditableAddress | null;
  updateSelectedAddress: (patch: Partial<EditableAddress>) => void;
}): React.JSX.Element {
  return (
    <FormField label='Country'>
      <SelectSimple
        value={props.selectedAddress?.countryId ?? ''}
        onValueChange={(value: string): void => {
          props.updateSelectedAddress({
            countryId: value,
            country: props.countryById.get(value)?.name ?? '',
          });
        }}
        options={props.countryOptions}
        placeholder='Select country'
        size='sm'
        disabled={props.disabled}
        ariaLabel='Select country'
        title='Select country'
      />
    </FormField>
  );
}

const getAddressInputValue = (
  address: EditableAddress | null,
  field: 'city' | 'postalCode' | 'street' | 'streetNumber'
): string => {
  if (address === null) return '';
  return address[field];
};

function AddressEditorFields(props: {
  countryById: Map<string, CountryOption>;
  countryOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  selectedAddress: EditableAddress | null;
  updateSelectedAddress: (patch: Partial<EditableAddress>) => void;
}): React.JSX.Element {
  const address = props.selectedAddress;
  const disabled = address === null;

  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
      <AddressInputField
        disabled={disabled}
        label='Street'
        onChange={(street: string): void => props.updateSelectedAddress({ street })}
        placeholder='Street'
        value={getAddressInputValue(address, 'street')}
      />
      <AddressInputField
        disabled={disabled}
        label='Street Number'
        onChange={(streetNumber: string): void => props.updateSelectedAddress({ streetNumber })}
        placeholder='Street number'
        value={getAddressInputValue(address, 'streetNumber')}
      />
      <AddressInputField
        disabled={disabled}
        label='City'
        onChange={(city: string): void => props.updateSelectedAddress({ city })}
        placeholder='City'
        value={getAddressInputValue(address, 'city')}
      />
      <AddressInputField
        disabled={disabled}
        label='Postal Code'
        onChange={(postalCode: string): void => props.updateSelectedAddress({ postalCode })}
        placeholder='Postal code'
        value={getAddressInputValue(address, 'postalCode')}
      />
      <AddressCountryField
        countryById={props.countryById}
        countryOptions={props.countryOptions}
        disabled={disabled}
        selectedAddress={address}
        updateSelectedAddress={props.updateSelectedAddress}
      />
    </div>
  );
}

export function OrganizationAddressFormControls(
  props: OrganizationAddressFormControlsProps
): React.JSX.Element {
  return (
    <>
      <AddressSummaryBadges linkedCount={props.linkedCount} sharedCount={props.sharedCount} />
      <LinkedAddressControls
        linkedOptions={props.linkedOptions}
        onAddAddress={props.onAddAddress}
        onRemoveAddress={props.onRemoveAddress}
        onSetDefault={props.onSetDefault}
        selectedAddress={props.selectedAddress}
        setSelectedAddressId={props.setSelectedAddressId}
      />
      <AttachAddressControls
        attachAddressId={props.attachAddressId}
        attachOptions={props.attachOptions}
        onAttachAddress={props.onAttachAddress}
        setAttachAddressId={props.setAttachAddressId}
      />
      <AddressEditorFields
        countryById={props.countryById}
        countryOptions={props.countryOptions}
        selectedAddress={props.selectedAddress}
        updateSelectedAddress={props.updateSelectedAddress}
      />
    </>
  );
}
