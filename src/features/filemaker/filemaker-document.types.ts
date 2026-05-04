/**
 * FileMaker Document Types
 * 
 * Type definitions for FileMaker document management.
 * Provides:
 * - Document owner kind types (event, organization, person)
 * - Document structure interface
 * - Document metadata fields
 * - Type and code classification
 * - Timestamp and comment tracking
 */

export type FilemakerDocumentOwnerKind = 'event' | 'organization' | 'person';

export type FilemakerDocument = {
  codeA?: string;
  codeB?: string;
  comment?: string;
  createdAt?: string;
  documentName?: string;
  documentTypeLabel?: string;
  documentTypeValueId?: string;
  expiryDate?: string;
  id: string;
  issueDate?: string;
  issuedBy?: string;
  legacyDocumentTypeUuid?: string;
  legacyOwnerUuid?: string;
  legacyUuid: string;
  ownerId?: string;
  ownerKind?: FilemakerDocumentOwnerKind;
  ownerName?: string;
  updatedAt?: string;
  updatedBy?: string;
};
