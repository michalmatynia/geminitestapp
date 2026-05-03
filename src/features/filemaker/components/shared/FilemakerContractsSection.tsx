import { FileSignature } from 'lucide-react';
import React from 'react';

import type {
  FilemakerContract,
  FilemakerContractEventLink,
  FilemakerContractPersonLink,
} from '../../filemaker-contract.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { Badge, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

export interface FilemakerContractsSectionProps {
  contracts: FilemakerContract[];
  title?: string;
}

const missingValue = 'n/a';

const formatOptionalValue = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : missingValue;
};

const contractTitle = (contract: FilemakerContract): string =>
  formatOptionalValue(contract.firstEventName ?? contract.legacyUuid);

const eventLabel = (link: FilemakerContractEventLink): string => {
  const name = formatOptionalValue(link.eventName ?? link.legacyEventUuid);
  const start = formatTimestamp(link.startDate);
  const end = formatTimestamp(link.endDate);
  return start === end ? `${name} (${start})` : `${name} (${start} - ${end})`;
};

const personLabel = (link: FilemakerContractPersonLink): string => {
  const name = formatOptionalValue(link.personName ?? link.legacyPersonUuid);
  const status = formatOptionalValue(link.statusLabel ?? link.legacyStatusUuid);
  return status === missingValue ? name : `${name}: ${status}`;
};

const ContractLinkBadges = ({ contract }: { contract: FilemakerContract }): React.JSX.Element => (
  <div className='flex flex-wrap gap-1.5'>
    {contract.eventLinks.slice(0, 4).map((link: FilemakerContractEventLink) => (
      <Badge key={link.id} variant='outline' className='max-w-full text-[10px]'>
        <span className='truncate'>Event: {eventLabel(link)}</span>
      </Badge>
    ))}
    {contract.personLinks.slice(0, 4).map((link: FilemakerContractPersonLink) => (
      <Badge key={link.id} variant='outline' className='max-w-full text-[10px]'>
        <span className='truncate'>Person: {personLabel(link)}</span>
      </Badge>
    ))}
  </div>
);

const FilemakerContractCard = ({
  contract,
}: {
  contract: FilemakerContract;
}): React.JSX.Element => (
  <Card key={contract.id} variant='subtle-compact' className='bg-card/20'>
    <div className='space-y-2 p-3'>
      <div className='flex min-w-0 items-start gap-2'>
        <FileSignature className='mt-0.5 size-3.5 shrink-0 text-amber-300' />
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold text-white'>{contractTitle(contract)}</div>
          <div className='truncate text-[10px] text-gray-600'>
            Legacy UUID: {contract.legacyUuid}
          </div>
        </div>
      </div>
      <div className='grid gap-2 text-xs text-gray-300 md:grid-cols-2'>
        <div>Start: {formatTimestamp(contract.firstEventStartDate)}</div>
        <div>End: {formatTimestamp(contract.firstEventEndDate)}</div>
        <div>On behalf: {formatOptionalValue(contract.onBehalfName ?? contract.legacyOnBehalfUuid)}</div>
        <div>Updated: {formatTimestamp(contract.updatedAt)}</div>
      </div>
      <ContractLinkBadges contract={contract} />
    </div>
  </Card>
);

export function FilemakerContractsSection({
  contracts,
  title = 'Contracts',
}: FilemakerContractsSectionProps): React.JSX.Element {
  return (
    <FormSection title={title} className='space-y-2 p-4'>
      {contracts.length === 0 ? (
        <div className='text-xs text-gray-500'>No contracts linked yet.</div>
      ) : (
        <div className='grid gap-2'>
          {contracts.map((contract: FilemakerContract) => (
            <FilemakerContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      )}
    </FormSection>
  );
}
