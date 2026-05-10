import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { CountryOption } from '@/shared/contracts/internationalization';

import type { EditableAddress } from '../../hooks/editable-address';
import { createClientFilemakerId } from '../../pages/filemaker-page-utils';
import {
  buildFilemakerCountryLookup,
  buildFilemakerCountryOptions,
  resolveFilemakerCountryId,
  resolveFilemakerCountryName,
} from '../../settings/filemaker-country-options';
import { formatFilemakerAddress } from '../../settings';
import type { FilemakerAddress } from '../../types';

type AddressActionHandlers = {
  handleAddAddress: () => void;
  handleAttachAddress: () => void;
  handleRemoveAddress: () => void;
  handleSetDefault: () => void;
  updateSelectedAddress: (patch: Partial<EditableAddress>) => void;
};

type AddressStateSetter = (value: SetStateAction<EditableAddress[]>) => void;

const toAddressOption = (address: EditableAddress): LabeledOptionWithDescriptionDto<string> => ({
  value: address.addressId,
  label: address.isDefault ? `Default - ${address.addressId}` : address.addressId,
  description: formatFilemakerAddress(address),
});

const toAttachOption = (
  address: FilemakerAddress
): LabeledOptionWithDescriptionDto<string> => ({
  value: address.id,
  label: address.id,
  description: formatFilemakerAddress(address),
});

const toEditableAddress = (
  address: FilemakerAddress,
  input: {
    countries: CountryOption[];
    countryById: Map<string, CountryOption>;
    isDefault: boolean;
  }
): EditableAddress => ({
  addressId: address.id,
  street: address.street,
  streetNumber: address.streetNumber,
  city: address.city,
  postalCode: address.postalCode,
  countryId: resolveFilemakerCountryId(
    address.countryId,
    address.country,
    input.countries,
    input.countryById
  ),
  country: resolveFilemakerCountryName(
    address.countryId,
    address.country,
    input.countries,
    input.countryById
  ),
  countryValueId: address.countryValueId,
  countryValueLabel: address.countryValueLabel,
  isDefault: input.isDefault,
  legacyCountryUuid: address.legacyCountryUuid,
  legacyUuid: address.legacyUuid,
});

const createBlankEditableAddress = (
  addressId: string,
  isDefault: boolean
): EditableAddress => ({
  addressId,
  street: '',
  streetNumber: '',
  city: '',
  postalCode: '',
  countryId: '',
  country: '',
  isDefault,
});

const ensureDefaultAddress = (addresses: EditableAddress[]): EditableAddress[] => {
  if (addresses.some((entry: EditableAddress): boolean => entry.isDefault)) return addresses;
  const first = addresses[0];
  if (first === undefined) return addresses;
  return [{ ...first, isDefault: true }, ...addresses.slice(1)];
};

export function useAddressSelection(addresses: EditableAddress[]): {
  selectedAddress: EditableAddress | null;
  setSelectedAddressId: Dispatch<SetStateAction<string>>;
} {
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const selectedAddress =
    addresses.find((address: EditableAddress): boolean => address.addressId === selectedAddressId) ??
    addresses[0] ??
    null;

  return { selectedAddress, setSelectedAddressId };
}

export function useAddressOptions(input: {
  countries: CountryOption[];
  databaseAddresses: FilemakerAddress[];
  editableAddresses: EditableAddress[];
}): {
  attachOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  countryById: Map<string, CountryOption>;
  countryOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  linkedOptions: Array<LabeledOptionWithDescriptionDto<string>>;
} {
  const linkedAddressIds = useMemo(
    () => new Set(input.editableAddresses.map((address) => address.addressId)),
    [input.editableAddresses]
  );
  const attachOptions = useMemo(
    () =>
      input.databaseAddresses
        .filter((address: FilemakerAddress): boolean => !linkedAddressIds.has(address.id))
        .map(toAttachOption),
    [input.databaseAddresses, linkedAddressIds]
  );
  const countryById = useMemo(
    () => buildFilemakerCountryLookup(input.countries),
    [input.countries]
  );
  const countryOptions = useMemo(
    () => buildFilemakerCountryOptions(input.countries),
    [input.countries]
  );
  const linkedOptions = useMemo(
    () => input.editableAddresses.map((address: EditableAddress) => toAddressOption(address)),
    [input.editableAddresses]
  );

  return { attachOptions, countryById, countryOptions, linkedOptions };
}

const useSelectedAddressUpdater = (
  selectedAddressId: string | null,
  setEditableAddresses: AddressStateSetter
): ((patch: Partial<EditableAddress>) => void) =>
  useCallback(
    (patch: Partial<EditableAddress>): void => {
      if (selectedAddressId === null) return;
      setEditableAddresses((previous: EditableAddress[]) =>
        previous.map((entry: EditableAddress): EditableAddress =>
          entry.addressId === selectedAddressId ? { ...entry, ...patch } : entry
        )
      );
    },
    [selectedAddressId, setEditableAddresses]
  );

function useAddressCreationActions(input: {
  attachAddressId: string;
  countries: CountryOption[];
  countryById: Map<string, CountryOption>;
  databaseAddresses: FilemakerAddress[];
  setAttachAddressId: Dispatch<SetStateAction<string>>;
  setEditableAddresses: AddressStateSetter;
  setSelectedAddressId: Dispatch<SetStateAction<string>>;
}): Pick<AddressActionHandlers, 'handleAddAddress' | 'handleAttachAddress'> {
  const {
    attachAddressId,
    countries,
    countryById,
    databaseAddresses,
    setAttachAddressId,
    setEditableAddresses,
    setSelectedAddressId,
  } = input;
  const handleAddAddress = useCallback((): void => {
    const nextId = createClientFilemakerId('address');
    setEditableAddresses((previous: EditableAddress[]) => [
      ...previous,
      createBlankEditableAddress(nextId, previous.length === 0),
    ]);
    setSelectedAddressId(nextId);
  }, [setEditableAddresses, setSelectedAddressId]);
  const handleAttachAddress = useCallback((): void => {
    const address = databaseAddresses.find((entry) => entry.id === attachAddressId);
    if (address === undefined) return;
    setEditableAddresses((previous: EditableAddress[]) => [
      ...previous,
      toEditableAddress(address, {
        countries,
        countryById,
        isDefault: previous.length === 0,
      }),
    ]);
    setSelectedAddressId(address.id);
    setAttachAddressId('');
  }, [
    attachAddressId,
    countries,
    countryById,
    databaseAddresses,
    setAttachAddressId,
    setEditableAddresses,
    setSelectedAddressId,
  ]);

  return { handleAddAddress, handleAttachAddress };
}

function useSelectedAddressListActions(
  selectedAddressId: string | null,
  setEditableAddresses: AddressStateSetter
): Pick<AddressActionHandlers, 'handleRemoveAddress' | 'handleSetDefault'> {
  const handleSetDefault = useCallback((): void => {
    if (selectedAddressId === null) return;
    setEditableAddresses((previous: EditableAddress[]) =>
      previous.map((entry: EditableAddress): EditableAddress => ({
        ...entry,
        isDefault: entry.addressId === selectedAddressId,
      }))
    );
  }, [selectedAddressId, setEditableAddresses]);
  const handleRemoveAddress = useCallback((): void => {
    if (selectedAddressId === null) return;
    setEditableAddresses((previous: EditableAddress[]) =>
      ensureDefaultAddress(
        previous.filter(
          (entry: EditableAddress): boolean => entry.addressId !== selectedAddressId
        )
      )
    );
  }, [selectedAddressId, setEditableAddresses]);

  return { handleRemoveAddress, handleSetDefault };
}

export function useAddressActionHandlers(input: {
  attachAddressId: string;
  countries: CountryOption[];
  countryById: Map<string, CountryOption>;
  databaseAddresses: FilemakerAddress[];
  selectedAddress: EditableAddress | null;
  setAttachAddressId: Dispatch<SetStateAction<string>>;
  setEditableAddresses: AddressStateSetter;
  setSelectedAddressId: Dispatch<SetStateAction<string>>;
}): AddressActionHandlers {
  const selectedAddressId = input.selectedAddress?.addressId ?? null;
  const updateSelectedAddress = useSelectedAddressUpdater(
    selectedAddressId,
    input.setEditableAddresses
  );
  const creationActions = useAddressCreationActions(input);
  const selectedAddressActions = useSelectedAddressListActions(
    selectedAddressId,
    input.setEditableAddresses
  );

  return { ...creationActions, ...selectedAddressActions, updateSelectedAddress };
}
