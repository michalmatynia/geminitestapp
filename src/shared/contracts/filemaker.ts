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
  'address',
  'database',
  'email',
  'email_link',
]);
export type FilemakerEntityKindDto = z.infer<typeof filemakerEntityKindSchema>;
export type FilemakerEntityKind = FilemakerEntityKindDto;

export const filemakerPartyReferenceSchema = z.object({
  id: z.string(),
  kind: filemakerPartyKindSchema,
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
});

export type FilemakerOrganizationDto = z.infer<typeof filemakerOrganizationSchema>;
export type FilemakerOrganization = FilemakerOrganizationDto;

export const filemakerEmailStatusSchema = z.enum([
  'active',
  'inactive',
  'bounced',
  'unverified',
]);
export type FilemakerEmailStatusDto = z.infer<typeof filemakerEmailStatusSchema>;
export type FilemakerEmailStatus = FilemakerEmailStatusDto;

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

export const filemakerDatabaseSchema = z.object({
  version: z.number().int().nonnegative(),
  persons: z.array(filemakerPersonSchema),
  organizations: z.array(filemakerOrganizationSchema),
  addresses: z.array(filemakerAddressSchema),
  emails: z.array(filemakerEmailSchema),
  emailLinks: z.array(filemakerEmailLinkSchema),
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
