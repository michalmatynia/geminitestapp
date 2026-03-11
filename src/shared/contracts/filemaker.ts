import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Filemaker Contracts
 */

export const filemakerPartyKindSchema = z.enum(['person', 'organization']);
export type FilemakerPartyKindDto = z.infer<typeof filemakerPartyKindSchema>;
export type FilemakerPartyKind = FilemakerPartyKindDto;

export const filemakerEntityKindSchema = z.enum([
  'person',
  'organization',
  'event',
  'address',
  'address_link',
  'database',
  'phone_number',
  'phone_number_link',
  'email',
  'email_link',
  'event_organization_link',
]);
export type FilemakerEntityKindDto = z.infer<typeof filemakerEntityKindSchema>;
export type FilemakerEntityKind = FilemakerEntityKindDto;

export const filemakerPartyReferenceSchema = z.object({
  id: z.string(),
  kind: filemakerPartyKindSchema,
  name: z.string().optional(),
});

export type FilemakerPartyReferenceDto = z.infer<typeof filemakerPartyReferenceSchema>;
export type FilemakerPartyReference = FilemakerPartyReferenceDto;

export const filemakerAddressSchema = dtoBaseSchema.extend({
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
});

export type FilemakerAddressDto = z.infer<typeof filemakerAddressSchema>;
export type FilemakerAddress = FilemakerAddressDto;

export const filemakerAddressOwnerKindSchema = z.enum(['person', 'organization', 'event']);
export type FilemakerAddressOwnerKindDto = z.infer<typeof filemakerAddressOwnerKindSchema>;
export type FilemakerAddressOwnerKind = FilemakerAddressOwnerKindDto;

export const filemakerAddressLinkSchema = dtoBaseSchema.extend({
  ownerKind: filemakerAddressOwnerKindSchema,
  ownerId: z.string(),
  addressId: z.string(),
  isDefault: z.boolean(),
});

export type FilemakerAddressLinkDto = z.infer<typeof filemakerAddressLinkSchema>;
export type FilemakerAddressLink = FilemakerAddressLinkDto;

export const filemakerPersonSchema = dtoBaseSchema.extend({
  firstName: z.string(),
  lastName: z.string(),
  addressId: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
  nip: z.string(),
  regon: z.string(),
  phoneNumbers: z.array(z.string()),
});

export type FilemakerPersonDto = z.infer<typeof filemakerPersonSchema>;
export type FilemakerPerson = FilemakerPersonDto;

export const filemakerOrganizationSchema = dtoBaseSchema.extend({
  name: z.string(),
  addressId: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
  taxId: z.string().optional(),
  krs: z.string().optional(),
});

export type FilemakerOrganizationDto = z.infer<typeof filemakerOrganizationSchema>;
export type FilemakerOrganization = FilemakerOrganizationDto;

export const filemakerEventSchema = dtoBaseSchema.extend({
  eventName: z.string(),
  addressId: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
});

export type FilemakerEventDto = z.infer<typeof filemakerEventSchema>;
export type FilemakerEvent = FilemakerEventDto;

export const filemakerEmailStatusSchema = z.enum(['active', 'inactive', 'bounced', 'unverified']);
export type FilemakerEmailStatusDto = z.infer<typeof filemakerEmailStatusSchema>;
export type FilemakerEmailStatus = FilemakerEmailStatusDto;

export const filemakerPhoneNumberSchema = dtoBaseSchema.extend({
  phoneNumber: z.string(),
});

export type FilemakerPhoneNumberDto = z.infer<typeof filemakerPhoneNumberSchema>;
export type FilemakerPhoneNumber = FilemakerPhoneNumberDto;

export const filemakerPhoneNumberLinkSchema = dtoBaseSchema.extend({
  phoneNumberId: z.string(),
  partyKind: filemakerPartyKindSchema,
  partyId: z.string(),
});

export type FilemakerPhoneNumberLinkDto = z.infer<typeof filemakerPhoneNumberLinkSchema>;
export type FilemakerPhoneNumberLink = FilemakerPhoneNumberLinkDto;

export const filemakerEmailSchema = dtoBaseSchema.extend({
  email: z.string(),
  status: filemakerEmailStatusSchema,
});

export type FilemakerEmailDto = z.infer<typeof filemakerEmailSchema>;
export type FilemakerEmail = FilemakerEmailDto;

export const filemakerEmailLinkSchema = dtoBaseSchema.extend({
  emailId: z.string(),
  partyKind: filemakerPartyKindSchema,
  partyId: z.string(),
});

export type FilemakerEmailLinkDto = z.infer<typeof filemakerEmailLinkSchema>;
export type FilemakerEmailLink = FilemakerEmailLinkDto;

export const filemakerEventOrganizationLinkSchema = dtoBaseSchema.extend({
  eventId: z.string(),
  organizationId: z.string(),
});

export type FilemakerEventOrganizationLinkDto = z.infer<
  typeof filemakerEventOrganizationLinkSchema
>;
export type FilemakerEventOrganizationLink = FilemakerEventOrganizationLinkDto;

export const filemakerDatabaseSchema = z.object({
  version: z.number().int().nonnegative(),
  persons: z.array(filemakerPersonSchema),
  organizations: z.array(filemakerOrganizationSchema),
  events: z.array(filemakerEventSchema),
  addresses: z.array(filemakerAddressSchema),
  addressLinks: z.array(filemakerAddressLinkSchema),
  phoneNumbers: z.array(filemakerPhoneNumberSchema),
  phoneNumberLinks: z.array(filemakerPhoneNumberLinkSchema),
  emails: z.array(filemakerEmailSchema),
  emailLinks: z.array(filemakerEmailLinkSchema),
  eventOrganizationLinks: z.array(filemakerEventOrganizationLinkSchema),
});

export type FilemakerDatabaseDto = z.infer<typeof filemakerDatabaseSchema>;
export type FilemakerDatabase = FilemakerDatabaseDto;

export const filemakerPartyOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string().optional(),
  kind: filemakerPartyKindSchema.optional(),
});

export type FilemakerPartyOptionDto = z.infer<typeof filemakerPartyOptionSchema>;
export type FilemakerPartyOption = FilemakerPartyOptionDto;

export type FilemakerAddressFields = {
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
  countryId: string;
};

export type FilemakerEditableAddressDto = FilemakerAddressFields & {
  addressId: string;
  isDefault: boolean;
};

export type FilemakerEditableAddress = FilemakerEditableAddressDto;

type FilemakerPatternRule = {
  id: string;
  pattern: string;
  flags?: string | null;
  sequence?: number | null;
};

export type {
  FilemakerPatternRule,
  FilemakerPatternRule as FilemakerEmailParserRule,
  FilemakerPatternRule as FilemakerPhoneValidationRule,
};

export type FilemakerEmailExtractionResult = {
  emails: string[];
  totalMatches: number;
  invalidMatches: number;
  usedDefaultRules: boolean;
};

export type FilemakerPhoneValidationResult = {
  isValid: boolean;
  normalizedPhoneNumber: string;
  matchedRuleId: string | null;
  usedDefaultRules: boolean;
};

export type UpsertFilemakerPartyEmailsResult = {
  database: FilemakerDatabase;
  partyFound: boolean;
  createdEmailCount: number;
  linkedEmailCount: number;
  existingEmailCount: number;
  invalidEmailCount: number;
  appliedEmails: string[];
};

export type UpsertFilemakerPartyPhoneNumbersResult = {
  database: FilemakerDatabase;
  partyFound: boolean;
  createdPhoneNumberCount: number;
  linkedPhoneNumberCount: number;
  existingPhoneNumberCount: number;
  invalidPhoneNumberCount: number;
  appliedPhoneNumbers: string[];
};
