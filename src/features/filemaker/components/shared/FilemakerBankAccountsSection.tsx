import { Landmark } from 'lucide-react';
import React from 'react';

import type { FilemakerBankAccount } from '../../filemaker-bank-account.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { Badge, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

export interface FilemakerBankAccountsSectionProps {
  bankAccounts: FilemakerBankAccount[];
  title?: string;
}

const missingValue = 'n/a';

const formatOptionalValue = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : missingValue;
};

const firstNonEmpty = (...values: Array<string | null | undefined>): string =>
  values.map((value: string | null | undefined): string => value?.trim() ?? '').find(
    (value: string): boolean => value.length > 0
  ) ?? missingValue;

const buildBankAndAccountTitle = (bankName: string, accountNumber: string): string => {
  if (bankName.length > 0 && accountNumber.length > 0) return `${bankName}, ${accountNumber}`;
  return '';
};

const bankAccountTitle = (bankAccount: FilemakerBankAccount): string =>
  firstNonEmpty(
    buildBankAndAccountTitle(bankAccount.bankName?.trim() ?? '', bankAccount.accountNumber.trim()),
    bankAccount.displayName,
    bankAccount.accountNumber,
    bankAccount.legacyUuid
  );

const StatusBadges = ({
  bankAccount,
}: {
  bankAccount: FilemakerBankAccount;
}): React.JSX.Element => (
  <div className='flex flex-wrap gap-2'>
    {bankAccount.isDefaultForOwner ? (
      <Badge variant='success' className='text-[10px]'>
        Default
      </Badge>
    ) : null}
    {bankAccount.isDisplayForOwner ? (
      <Badge variant='outline' className='text-[10px]'>
        Display
      </Badge>
    ) : null}
    <Badge variant='outline' className='text-[10px]'>
      Category: {formatOptionalValue(bankAccount.category)}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Currency: {formatOptionalValue(bankAccount.currencyLabel ?? bankAccount.legacyCurrencyUuid)}
    </Badge>
  </div>
);

const FilemakerBankAccountCard = ({
  bankAccount,
}: {
  bankAccount: FilemakerBankAccount;
}): React.JSX.Element => (
  <Card key={bankAccount.id} variant='subtle-compact' className='bg-card/20'>
    <div className='space-y-2 p-3'>
      <div className='flex min-w-0 items-start gap-2'>
        <Landmark className='mt-0.5 size-3.5 shrink-0 text-emerald-300' />
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold text-white'>
            {bankAccountTitle(bankAccount)}
          </div>
          <div className='truncate text-[10px] text-gray-600'>
            Legacy UUID: {formatOptionalValue(bankAccount.legacyUuid)} | Owner UUID:{' '}
            {formatOptionalValue(bankAccount.legacyOwnerUuid)}
          </div>
        </div>
      </div>
      <div className='grid gap-2 text-xs text-gray-300 md:grid-cols-2'>
        <div>Account: {formatOptionalValue(bankAccount.accountNumber)}</div>
        <div>SWIFT: {formatOptionalValue(bankAccount.swift)}</div>
        <div>Bank: {formatOptionalValue(bankAccount.bankName)}</div>
        <div>Address: {formatOptionalValue(bankAccount.bankAddress)}</div>
      </div>
      <StatusBadges bankAccount={bankAccount} />
      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Modified: {formatTimestamp(bankAccount.updatedAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Modified By: {formatOptionalValue(bankAccount.updatedBy)}
        </Badge>
      </div>
    </div>
  </Card>
);

export function FilemakerBankAccountsSection({
  bankAccounts,
  title = 'Bank Accounts',
}: FilemakerBankAccountsSectionProps): React.JSX.Element {
  return (
    <FormSection title={title} className='space-y-2 p-4'>
      {bankAccounts.length === 0 ? (
        <div className='text-xs text-gray-500'>No bank accounts linked yet.</div>
      ) : (
        <div className='grid gap-2'>
          {bankAccounts.map((bankAccount: FilemakerBankAccount) => (
            <FilemakerBankAccountCard key={bankAccount.id} bankAccount={bankAccount} />
          ))}
        </div>
      )}
    </FormSection>
  );
}
