'use client';

import { Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Badge,
  Button,
  FormSection,
  Input,
  Label,
  SectionHeader,
  useToast,
} from '@/shared/ui';

import {
  createFilemakerOrganization,
  createFilemakerPerson,
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  normalizeFilemakerDatabase,
  parseFilemakerDatabase,
} from '../settings';

import type {
  FilemakerDatabase,
  FilemakerOrganization,
  FilemakerPerson,
} from '../types';

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatTimestamp = (value: string): string => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown';
  return new Date(parsed).toLocaleString();
};

const hasAddressFields = (
  street: string,
  city: string,
  postalCode: string,
  country: string
): boolean => Boolean(street && city && postalCode && country);

export function AdminFilemakerPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const parsedDatabase = useMemo(
    (): FilemakerDatabase => parseFilemakerDatabase(rawDatabase),
    [rawDatabase]
  );
  const [database, setDatabase] = useState<FilemakerDatabase>(parsedDatabase);

  const [personFirstName, setPersonFirstName] = useState('');
  const [personLastName, setPersonLastName] = useState('');
  const [personStreet, setPersonStreet] = useState('');
  const [personCity, setPersonCity] = useState('');
  const [personPostalCode, setPersonPostalCode] = useState('');
  const [personCountry, setPersonCountry] = useState('');
  const [personNip, setPersonNip] = useState('');
  const [personRegon, setPersonRegon] = useState('');
  const [personPhones, setPersonPhones] = useState('');

  const [organizationName, setOrganizationName] = useState('');
  const [organizationStreet, setOrganizationStreet] = useState('');
  const [organizationCity, setOrganizationCity] = useState('');
  const [organizationPostalCode, setOrganizationPostalCode] = useState('');
  const [organizationCountry, setOrganizationCountry] = useState('');

  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonFirstName, setEditingPersonFirstName] = useState('');
  const [editingPersonLastName, setEditingPersonLastName] = useState('');
  const [editingPersonStreet, setEditingPersonStreet] = useState('');
  const [editingPersonCity, setEditingPersonCity] = useState('');
  const [editingPersonPostalCode, setEditingPersonPostalCode] = useState('');
  const [editingPersonCountry, setEditingPersonCountry] = useState('');
  const [editingPersonNip, setEditingPersonNip] = useState('');
  const [editingPersonRegon, setEditingPersonRegon] = useState('');
  const [editingPersonPhones, setEditingPersonPhones] = useState('');

  const [editingOrganizationId, setEditingOrganizationId] = useState<string | null>(null);
  const [editingOrganizationName, setEditingOrganizationName] = useState('');
  const [editingOrganizationStreet, setEditingOrganizationStreet] = useState('');
  const [editingOrganizationCity, setEditingOrganizationCity] = useState('');
  const [editingOrganizationPostalCode, setEditingOrganizationPostalCode] = useState('');
  const [editingOrganizationCountry, setEditingOrganizationCountry] = useState('');

  useEffect(() => {
    setDatabase(parsedDatabase);
  }, [parsedDatabase]);

  const persons = useMemo(
    () =>
      [...database.persons].sort((left: FilemakerPerson, right: FilemakerPerson) =>
        `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`)
      ),
    [database.persons]
  );
  const organizations = useMemo(
    () =>
      [...database.organizations].sort((left: FilemakerOrganization, right: FilemakerOrganization) =>
        left.name.localeCompare(right.name)
      ),
    [database.organizations]
  );

  const persistDatabase = useCallback(
    async (nextDatabase: FilemakerDatabase, successMessage: string): Promise<void> => {
      const normalized = normalizeFilemakerDatabase(nextDatabase);
      try {
        await updateSetting.mutateAsync({
          key: FILEMAKER_DATABASE_KEY,
          value: JSON.stringify(normalized),
        });
        setDatabase(normalized);
        toast(successMessage, { variant: 'success' });
      } catch (error: unknown) {
        toast(
          error instanceof Error ? error.message : 'Failed to save Filemaker database.',
          { variant: 'error' }
        );
      }
    },
    [toast, updateSetting]
  );

  const handleAddPerson = useCallback(async (): Promise<void> => {
    const firstName = personFirstName.trim();
    const lastName = personLastName.trim();
    const street = personStreet.trim();
    const city = personCity.trim();
    const postalCode = personPostalCode.trim();
    const country = personCountry.trim();
    if (!firstName || !lastName || !hasAddressFields(street, city, postalCode, country)) {
      toast('Person requires first name, last name, street, city, postal code, and country.', {
        variant: 'error',
      });
      return;
    }

    const person = createFilemakerPerson({
      id: createId('person'),
      firstName,
      lastName,
      street,
      city,
      postalCode,
      country,
      nip: personNip,
      regon: personRegon,
      phoneNumbers: personPhones,
    });

    await persistDatabase(
      {
        ...database,
        persons: [...database.persons, person],
      },
      'Person added.'
    );

    setPersonFirstName('');
    setPersonLastName('');
    setPersonStreet('');
    setPersonCity('');
    setPersonPostalCode('');
    setPersonCountry('');
    setPersonNip('');
    setPersonRegon('');
    setPersonPhones('');
  }, [
    database,
    personCity,
    personCountry,
    personFirstName,
    personLastName,
    personNip,
    personPostalCode,
    personPhones,
    personRegon,
    personStreet,
    persistDatabase,
    toast,
  ]);

  const handleDeletePerson = useCallback(
    async (personId: string): Promise<void> => {
      const target = database.persons.find((entry: FilemakerPerson) => entry.id === personId);
      if (!target) return;
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(`Delete person "${target.firstName} ${target.lastName}"?`);
        if (!confirmed) return;
      }

      await persistDatabase(
        {
          ...database,
          persons: database.persons.filter((entry: FilemakerPerson) => entry.id !== personId),
        },
        'Person deleted.'
      );
      if (editingPersonId === personId) {
        setEditingPersonId(null);
      }
    },
    [database, editingPersonId, persistDatabase]
  );

  const handleStartEditPerson = useCallback((person: FilemakerPerson): void => {
    setEditingPersonId(person.id);
    setEditingPersonFirstName(person.firstName);
    setEditingPersonLastName(person.lastName);
    setEditingPersonStreet(person.street);
    setEditingPersonCity(person.city);
    setEditingPersonPostalCode(person.postalCode);
    setEditingPersonCountry(person.country);
    setEditingPersonNip(person.nip);
    setEditingPersonRegon(person.regon);
    setEditingPersonPhones(person.phoneNumbers.join(', '));
  }, []);

  const handleCancelEditPerson = useCallback((): void => {
    setEditingPersonId(null);
    setEditingPersonFirstName('');
    setEditingPersonLastName('');
    setEditingPersonStreet('');
    setEditingPersonCity('');
    setEditingPersonPostalCode('');
    setEditingPersonCountry('');
    setEditingPersonNip('');
    setEditingPersonRegon('');
    setEditingPersonPhones('');
  }, []);

  const handleSavePerson = useCallback(async (): Promise<void> => {
    if (!editingPersonId) return;
    const firstName = editingPersonFirstName.trim();
    const lastName = editingPersonLastName.trim();
    const street = editingPersonStreet.trim();
    const city = editingPersonCity.trim();
    const postalCode = editingPersonPostalCode.trim();
    const country = editingPersonCountry.trim();
    if (!firstName || !lastName || !hasAddressFields(street, city, postalCode, country)) {
      toast('Person requires first name, last name, street, city, postal code, and country.', {
        variant: 'error',
      });
      return;
    }

    await persistDatabase(
      {
        ...database,
        persons: database.persons.map((person: FilemakerPerson) =>
          person.id === editingPersonId
            ? createFilemakerPerson({
              id: person.id,
              firstName,
              lastName,
              street,
              city,
              postalCode,
              country,
              nip: editingPersonNip,
              regon: editingPersonRegon,
              phoneNumbers: editingPersonPhones,
              createdAt: person.createdAt,
              updatedAt: new Date().toISOString(),
            })
            : person
        ),
      },
      'Person updated.'
    );
    handleCancelEditPerson();
  }, [
    database,
    editingPersonCity,
    editingPersonCountry,
    editingPersonFirstName,
    editingPersonId,
    editingPersonLastName,
    editingPersonNip,
    editingPersonPostalCode,
    editingPersonPhones,
    editingPersonRegon,
    editingPersonStreet,
    handleCancelEditPerson,
    persistDatabase,
    toast,
  ]);

  const handleAddOrganization = useCallback(async (): Promise<void> => {
    const name = organizationName.trim();
    const street = organizationStreet.trim();
    const city = organizationCity.trim();
    const postalCode = organizationPostalCode.trim();
    const country = organizationCountry.trim();
    if (!name || !hasAddressFields(street, city, postalCode, country)) {
      toast('Organization requires name, street, city, postal code, and country.', {
        variant: 'error',
      });
      return;
    }

    const organization = createFilemakerOrganization({
      id: createId('organization'),
      name,
      street,
      city,
      postalCode,
      country,
    });

    await persistDatabase(
      {
        ...database,
        organizations: [...database.organizations, organization],
      },
      'Organization added.'
    );
    setOrganizationName('');
    setOrganizationStreet('');
    setOrganizationCity('');
    setOrganizationPostalCode('');
    setOrganizationCountry('');
  }, [
    database,
    organizationCity,
    organizationCountry,
    organizationName,
    organizationPostalCode,
    organizationStreet,
    persistDatabase,
    toast,
  ]);

  const handleDeleteOrganization = useCallback(
    async (organizationId: string): Promise<void> => {
      const target = database.organizations.find(
        (entry: FilemakerOrganization) => entry.id === organizationId
      );
      if (!target) return;
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(`Delete organization "${target.name}"?`);
        if (!confirmed) return;
      }

      await persistDatabase(
        {
          ...database,
          organizations: database.organizations.filter(
            (entry: FilemakerOrganization) => entry.id !== organizationId
          ),
        },
        'Organization deleted.'
      );
      if (editingOrganizationId === organizationId) {
        setEditingOrganizationId(null);
      }
    },
    [database, editingOrganizationId, persistDatabase]
  );

  const handleStartEditOrganization = useCallback((organization: FilemakerOrganization): void => {
    setEditingOrganizationId(organization.id);
    setEditingOrganizationName(organization.name);
    setEditingOrganizationStreet(organization.street);
    setEditingOrganizationCity(organization.city);
    setEditingOrganizationPostalCode(organization.postalCode);
    setEditingOrganizationCountry(organization.country);
  }, []);

  const handleCancelEditOrganization = useCallback((): void => {
    setEditingOrganizationId(null);
    setEditingOrganizationName('');
    setEditingOrganizationStreet('');
    setEditingOrganizationCity('');
    setEditingOrganizationPostalCode('');
    setEditingOrganizationCountry('');
  }, []);

  const handleSaveOrganization = useCallback(async (): Promise<void> => {
    if (!editingOrganizationId) return;
    const name = editingOrganizationName.trim();
    const street = editingOrganizationStreet.trim();
    const city = editingOrganizationCity.trim();
    const postalCode = editingOrganizationPostalCode.trim();
    const country = editingOrganizationCountry.trim();
    if (!name || !hasAddressFields(street, city, postalCode, country)) {
      toast('Organization requires name, street, city, postal code, and country.', {
        variant: 'error',
      });
      return;
    }

    await persistDatabase(
      {
        ...database,
        organizations: database.organizations.map((organization: FilemakerOrganization) =>
          organization.id === editingOrganizationId
            ? createFilemakerOrganization({
              id: organization.id,
              name,
              street,
              city,
              postalCode,
              country,
              createdAt: organization.createdAt,
              updatedAt: new Date().toISOString(),
            })
            : organization
        ),
      },
      'Organization updated.'
    );
    handleCancelEditOrganization();
  }, [
    database,
    editingOrganizationCity,
    editingOrganizationCountry,
    editingOrganizationId,
    editingOrganizationName,
    editingOrganizationPostalCode,
    editingOrganizationStreet,
    handleCancelEditOrganization,
    persistDatabase,
    toast,
  ]);

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <SectionHeader
        title='Filemaker'
        description='Manage persons and organizations that can be attached as addresser/addressee in Case Resolver documents.'
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>Persons: {persons.length}</Badge>
        <Badge variant='outline' className='text-[10px]'>Organizations: {organizations.length}</Badge>
      </div>

      <FormSection
        title='Persons'
        className='space-y-4 p-4'
        actions={(
          <Button
            type='button'
            onClick={(): void => {
              void handleAddPerson();
            }}
            disabled={updateSetting.isPending}
            className='h-8'
          >
            <Plus className='mr-1.5 size-3.5' />
            Add Person
          </Button>
        )}
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>First Name</Label>
            <Input
              value={personFirstName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPersonFirstName(event.target.value);
              }}
              placeholder='First name'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Last Name</Label>
            <Input
              value={personLastName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPersonLastName(event.target.value);
              }}
              placeholder='Last name'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Street</Label>
            <Input
              value={personStreet}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPersonStreet(event.target.value);
              }}
              placeholder='Street and number'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>City</Label>
            <Input
              value={personCity}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPersonCity(event.target.value);
              }}
              placeholder='City'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Postal Code</Label>
            <Input
              value={personPostalCode}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPersonPostalCode(event.target.value);
              }}
              placeholder='Postal code'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Country</Label>
            <Input
              value={personCountry}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPersonCountry(event.target.value);
              }}
              placeholder='Country'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>NIP</Label>
            <Input
              value={personNip}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPersonNip(event.target.value);
              }}
              placeholder='NIP code'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>REGON</Label>
            <Input
              value={personRegon}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPersonRegon(event.target.value);
              }}
              placeholder='REGON code'
              className='h-9'
            />
          </div>
          <div className='space-y-2 md:col-span-2'>
            <Label className='text-xs text-gray-400'>Telephone Numbers</Label>
            <Input
              value={personPhones}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPersonPhones(event.target.value);
              }}
              placeholder='Comma-separated numbers'
              className='h-9'
            />
          </div>
        </div>

        <div className='space-y-2'>
          {persons.length === 0 ? (
            <div className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-6 text-sm text-gray-400'>
              No persons added yet.
            </div>
          ) : (
            persons.map((person: FilemakerPerson) => {
              const isEditing = editingPersonId === person.id;
              return (
                <div key={person.id} className='rounded-lg border border-border/60 bg-card/35 p-3'>
                  {isEditing ? (
                    <div className='grid gap-3 md:grid-cols-2'>
                      <Input
                        value={editingPersonFirstName}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingPersonFirstName(event.target.value);
                        }}
                        placeholder='First name'
                        className='h-9'
                      />
                      <Input
                        value={editingPersonLastName}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingPersonLastName(event.target.value);
                        }}
                        placeholder='Last name'
                        className='h-9'
                      />
                      <Input
                        value={editingPersonStreet}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingPersonStreet(event.target.value);
                        }}
                        placeholder='Street'
                        className='h-9'
                      />
                      <Input
                        value={editingPersonCity}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingPersonCity(event.target.value);
                        }}
                        placeholder='City'
                        className='h-9'
                      />
                      <Input
                        value={editingPersonPostalCode}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingPersonPostalCode(event.target.value);
                        }}
                        placeholder='Postal code'
                        className='h-9'
                      />
                      <Input
                        value={editingPersonCountry}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingPersonCountry(event.target.value);
                        }}
                        placeholder='Country'
                        className='h-9'
                      />
                      <Input
                        value={editingPersonNip}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingPersonNip(event.target.value);
                        }}
                        placeholder='NIP'
                        className='h-9'
                      />
                      <Input
                        value={editingPersonRegon}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingPersonRegon(event.target.value);
                        }}
                        placeholder='REGON'
                        className='h-9'
                      />
                      <Input
                        value={editingPersonPhones}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingPersonPhones(event.target.value);
                        }}
                        placeholder='Comma-separated numbers'
                        className='h-9 md:col-span-2'
                      />
                      <div className='md:col-span-2 flex items-center gap-2'>
                        <Button
                          type='button'
                          onClick={(): void => {
                            void handleSavePerson();
                          }}
                          disabled={updateSetting.isPending}
                          className='h-8'
                        >
                          <Save className='mr-1.5 size-3.5' />
                          Save
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={handleCancelEditPerson}
                          className='h-8'
                        >
                          <X className='mr-1.5 size-3.5' />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='min-w-0 flex-1 space-y-1'>
                        <div className='text-sm font-semibold text-white'>
                          {person.firstName} {person.lastName}
                        </div>
                        <div className='text-xs text-gray-300'>{formatFilemakerAddress(person)}</div>
                        <div className='text-[11px] text-gray-500'>
                          NIP: {person.nip || 'n/a'} | REGON: {person.regon || 'n/a'}
                        </div>
                        <div className='text-[11px] text-gray-500'>
                          Phones: {person.phoneNumbers.length > 0 ? person.phoneNumbers.join(', ') : 'n/a'}
                        </div>
                        <div className='text-[10px] text-gray-600'>
                          Updated: {formatTimestamp(person.updatedAt)}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8 w-8 p-0'
                          onClick={(): void => {
                            handleStartEditPerson(person);
                          }}
                        >
                          <Edit2 className='size-3.5' />
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8 w-8 p-0 text-red-200 hover:text-red-100'
                          onClick={(): void => {
                            void handleDeletePerson(person.id);
                          }}
                        >
                          <Trash2 className='size-3.5' />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </FormSection>

      <FormSection
        title='Organizations'
        className='space-y-4 p-4'
        actions={(
          <Button
            type='button'
            onClick={(): void => {
              void handleAddOrganization();
            }}
            disabled={updateSetting.isPending}
            className='h-8'
          >
            <Plus className='mr-1.5 size-3.5' />
            Add Organization
          </Button>
        )}
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Organization Name</Label>
            <Input
              value={organizationName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setOrganizationName(event.target.value);
              }}
              placeholder='Organization name'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Street</Label>
            <Input
              value={organizationStreet}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setOrganizationStreet(event.target.value);
              }}
              placeholder='Street and number'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>City</Label>
            <Input
              value={organizationCity}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setOrganizationCity(event.target.value);
              }}
              placeholder='City'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Postal Code</Label>
            <Input
              value={organizationPostalCode}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setOrganizationPostalCode(event.target.value);
              }}
              placeholder='Postal code'
              className='h-9'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Country</Label>
            <Input
              value={organizationCountry}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setOrganizationCountry(event.target.value);
              }}
              placeholder='Country'
              className='h-9'
            />
          </div>
        </div>

        <div className='space-y-2'>
          {organizations.length === 0 ? (
            <div className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-6 text-sm text-gray-400'>
              No organizations added yet.
            </div>
          ) : (
            organizations.map((organization: FilemakerOrganization) => {
              const isEditing = editingOrganizationId === organization.id;
              return (
                <div key={organization.id} className='rounded-lg border border-border/60 bg-card/35 p-3'>
                  {isEditing ? (
                    <div className='grid gap-3 md:grid-cols-2'>
                      <Input
                        value={editingOrganizationName}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingOrganizationName(event.target.value);
                        }}
                        placeholder='Organization name'
                        className='h-9'
                      />
                      <Input
                        value={editingOrganizationStreet}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingOrganizationStreet(event.target.value);
                        }}
                        placeholder='Street'
                        className='h-9'
                      />
                      <Input
                        value={editingOrganizationCity}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingOrganizationCity(event.target.value);
                        }}
                        placeholder='City'
                        className='h-9'
                      />
                      <Input
                        value={editingOrganizationPostalCode}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingOrganizationPostalCode(event.target.value);
                        }}
                        placeholder='Postal code'
                        className='h-9'
                      />
                      <Input
                        value={editingOrganizationCountry}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingOrganizationCountry(event.target.value);
                        }}
                        placeholder='Country'
                        className='h-9'
                      />
                      <div className='md:col-span-2 flex items-center gap-2'>
                        <Button
                          type='button'
                          onClick={(): void => {
                            void handleSaveOrganization();
                          }}
                          disabled={updateSetting.isPending}
                          className='h-8'
                        >
                          <Save className='mr-1.5 size-3.5' />
                          Save
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={handleCancelEditOrganization}
                          className='h-8'
                        >
                          <X className='mr-1.5 size-3.5' />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='min-w-0 flex-1 space-y-1'>
                        <div className='text-sm font-semibold text-white'>{organization.name}</div>
                        <div className='text-xs text-gray-300'>{formatFilemakerAddress(organization)}</div>
                        <div className='text-[10px] text-gray-600'>
                          Updated: {formatTimestamp(organization.updatedAt)}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8 w-8 p-0'
                          onClick={(): void => {
                            handleStartEditOrganization(organization);
                          }}
                        >
                          <Edit2 className='size-3.5' />
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8 w-8 p-0 text-red-200 hover:text-red-100'
                          onClick={(): void => {
                            void handleDeleteOrganization(organization.id);
                          }}
                        >
                          <Trash2 className='size-3.5' />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </FormSection>
    </div>
  );
}
