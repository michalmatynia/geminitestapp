import { ExternalLink, UserRound } from 'lucide-react';
import React, { startTransition } from 'react';

import { Badge, Button, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import { formatFilemakerAddress } from '../../settings';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import type { MongoFilemakerPerson } from '../../pages/AdminFilemakerPersonsPage.types';

const resolvePersonName = (person: MongoFilemakerPerson): string => {
  const fullName = person.fullName.trim();
  if (fullName.length > 0) return fullName;
  const name = `${person.firstName} ${person.lastName}`.trim();
  return name.length > 0 ? name : person.id;
};

const formatOptionalValue = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

const formatPersonAddress = (person: MongoFilemakerPerson): string => {
  const address = formatFilemakerAddress(person);
  return address.length > 0 ? address : 'No address';
};

export function OrganizationPersonsSection(): React.JSX.Element {
  const { linkedPersons, router } = useAdminFilemakerOrganizationEditPageStateContext();

  return (
    <FormSection title='Linked Persons' className='space-y-2 p-4'>
      {linkedPersons.length === 0 ? (
        <div className='text-xs text-gray-500'>No persons linked yet.</div>
      ) : (
        <div className='grid gap-2'>
          {linkedPersons.map((person: MongoFilemakerPerson) => {
            const name = resolvePersonName(person);
            return (
              <Card key={person.id} variant='subtle-compact' className='bg-card/20'>
                <div className='flex items-start justify-between gap-3 p-3'>
                  <div className='flex min-w-0 gap-2'>
                    <UserRound className='mt-0.5 size-3.5 shrink-0 text-emerald-300' />
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-semibold text-white'>{name}</div>
                      <div className='truncate text-xs text-gray-300'>
                        {formatPersonAddress(person)}
                      </div>
                      <div className='truncate text-[10px] text-gray-600'>
                        Legacy UUID: {formatOptionalValue(person.legacyUuid)} | Updated:{' '}
                        {formatTimestamp(person.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div className='flex shrink-0 items-center gap-2'>
                    {person.organizationLinkCount > 0 ? (
                      <Badge variant='outline' className='h-5 text-[10px]'>
                        {person.organizationLinkCount}
                      </Badge>
                    ) : null}
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='size-7'
                      aria-label={`Open person ${name}`}
                      title={`Open person ${name}`}
                      onClick={(): void => {
                        startTransition(() => {
                          router.push(`/admin/filemaker/persons/${encodeURIComponent(person.id)}`);
                        });
                      }}
                    >
                      <ExternalLink className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}
