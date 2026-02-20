import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Filemaker Data Transformation Contracts
 */

export const filemakerEntityKindSchema = z.enum(['person', 'organization', 'address', 'database']);
export type FilemakerEntityKindDto = z.infer<typeof filemakerEntityKindSchema>;
export type FilemakerEntityKind = FilemakerEntityKindDto;

export const filemakerPartyReferenceSchema = z.object({
  id: z.string(),
  kind: filemakerEntityKindSchema,
  name: z.string(),
});

export type FilemakerPartyReferenceDto = z.infer<typeof filemakerPartyReferenceSchema>;
export type FilemakerPartyReference = FilemakerPartyReferenceDto;

export const filemakerPersonSchema = namedDtoSchema.extend({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

export type FilemakerPersonDto = z.infer<typeof filemakerPersonSchema>;
export type FilemakerPerson = FilemakerPersonDto;

export const filemakerOrganizationSchema = namedDtoSchema.extend({
  taxId: z.string().nullable(),
  website: z.string().nullable(),
});

export type FilemakerOrganizationDto = z.infer<typeof filemakerOrganizationSchema>;
export type FilemakerOrganization = FilemakerOrganizationDto;

export const filemakerAddressSchema = dtoBaseSchema.extend({
  street: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

export type FilemakerAddressDto = z.infer<typeof filemakerAddressSchema>;
export type FilemakerAddress = FilemakerAddressDto;

export const filemakerDatabaseSchema = namedDtoSchema.extend({
  host: z.string(),
  port: z.number(),
  version: z.string().optional(),
});

export type FilemakerDatabaseDto = z.infer<typeof filemakerDatabaseSchema>;
export type FilemakerDatabase = FilemakerDatabaseDto;

export const filemakerPartyOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  kind: filemakerEntityKindSchema,
});

export type FilemakerPartyOptionDto = z.infer<typeof filemakerPartyOptionSchema>;
export type FilemakerPartyOption = FilemakerPartyOptionDto;
