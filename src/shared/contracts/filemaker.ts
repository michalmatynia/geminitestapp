import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Filemaker DTOs
 */

export const filemakerEntityKindSchema = z.enum(['person', 'organization']);
export type FilemakerEntityKindDto = z.infer<typeof filemakerEntityKindSchema>;

export const filemakerPartyReferenceSchema = z.object({
  kind: filemakerEntityKindSchema,
  id: z.string(),
});
export type FilemakerPartyReferenceDto = z.infer<typeof filemakerPartyReferenceSchema>;

export const filemakerPersonSchema = dtoBaseSchema.extend({
  firstName: z.string(),
  lastName: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
  addressId: z.string(),
  nip: z.string(),
  regon: z.string(),
  phoneNumbers: z.array(z.string()),
});
export type FilemakerPersonDto = z.infer<typeof filemakerPersonSchema>;

export const filemakerOrganizationSchema = dtoBaseSchema.extend({
  name: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
  addressId: z.string(),
});
export type FilemakerOrganizationDto = z.infer<typeof filemakerOrganizationSchema>;

export const filemakerAddressSchema = dtoBaseSchema.extend({
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  countryId: z.string(),
});
export type FilemakerAddressDto = z.infer<typeof filemakerAddressSchema>;

export const filemakerDatabaseSchema = z.object({
  version: z.literal(2),
  persons: z.array(filemakerPersonSchema),
  organizations: z.array(filemakerOrganizationSchema),
  addresses: z.array(filemakerAddressSchema),
});
export type FilemakerDatabaseDto = z.infer<typeof filemakerDatabaseSchema>;

export const filemakerPartyOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
});
export type FilemakerPartyOptionDto = z.infer<typeof filemakerPartyOptionSchema>;
