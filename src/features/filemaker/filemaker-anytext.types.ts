export type FilemakerAnyTextOwnerKind = 'event' | 'organization' | 'person';

export type FilemakerAnyText = {
  createdAt?: string;
  id: string;
  legacyOwnerUuid: string;
  legacyUuid: string;
  ownerId?: string;
  ownerKind?: FilemakerAnyTextOwnerKind;
  ownerName?: string;
  text: string;
  updatedAt?: string;
  updatedBy?: string;
};
