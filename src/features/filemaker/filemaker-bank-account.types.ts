export type FilemakerBankAccountOwnerKind = 'event' | 'organization' | 'person';

export type FilemakerBankAccount = {
  accountNumber: string;
  bankAddress?: string;
  bankName?: string;
  category?: string;
  createdAt?: string;
  currencyLabel?: string;
  currencyValueId?: string;
  displayName?: string;
  id: string;
  isDefaultForOwner: boolean;
  isDisplayForOwner: boolean;
  legacyCurrencyUuid?: string;
  legacyOwnerUuid: string;
  legacyUuid: string;
  ownerId?: string;
  ownerKind?: FilemakerBankAccountOwnerKind;
  ownerName?: string;
  swift?: string;
  updatedAt?: string;
  updatedBy?: string;
};
