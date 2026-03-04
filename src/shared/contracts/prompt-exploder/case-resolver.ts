import { z } from 'zod';

export type PromptExploderCaseResolverPartyKind = 'person' | 'organization';
export type PromptExploderCaseResolverPartyRole =
  | 'addresser'
  | 'addressee'
  | 'subject'
  | 'reference'
  | 'other';

export const promptExploderCaseResolverPartyCandidateSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  score: z.number().optional(),
  kind: z.enum(['person', 'organization']).optional(),
  role: z.string().optional(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  organizationName: z.string().optional(),
  displayName: z.string().optional(),
  rawText: z.string().optional(),
  street: z.string().optional(),
  streetNumber: z.string().optional(),
  houseNumber: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  sourceSegmentId: z.string().optional(),
  sourceSegmentTitle: z.string().optional(),
  sourcePatternLabels: z.array(z.string()).optional(),
  sourceSequenceLabels: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PromptExploderCaseResolverPartyCandidate = z.infer<
  typeof promptExploderCaseResolverPartyCandidateSchema
>;

export const promptExploderCaseResolverPartyConfigSchema = z.object({
  role: z.enum(['other', 'reference', 'addresser', 'addressee', 'subject']),
  targetPath: z.string(),
  required: z.boolean(),
  enabled: z.boolean().optional(),
  targetRole: z.string().optional(),
  defaultAction: z.string().optional(),
  autoMatchPartyReference: z.boolean().optional(),
  autoMatchAddress: z.boolean().optional(),
  candidates: z.array(promptExploderCaseResolverPartyCandidateSchema).optional(),
});

export type PromptExploderCaseResolverPartyConfig = z.infer<
  typeof promptExploderCaseResolverPartyConfigSchema
>;

export const promptExploderCaseResolverPartyBundleSchema = z.object({
  addresser: promptExploderCaseResolverPartyCandidateSchema.optional(),
  addressee: promptExploderCaseResolverPartyCandidateSchema.optional(),
  subject: promptExploderCaseResolverPartyCandidateSchema.optional(),
  reference: promptExploderCaseResolverPartyCandidateSchema.optional(),
  other: promptExploderCaseResolverPartyCandidateSchema.optional(),
});

export type PromptExploderCaseResolverPartyBundle = z.infer<
  typeof promptExploderCaseResolverPartyBundleSchema
>;

export const promptExploderCaseResolverPlaceDateSchema = z.object({
  city: z.string().optional(),
  day: z.string().optional(),
  month: z.string().optional(),
  year: z.string().optional(),
  sourceSegmentId: z.string().optional(),
  sourceSegmentTitle: z.string().optional(),
  sourcePatternLabels: z.array(z.string()).optional(),
  sourceSequenceLabels: z.array(z.string()).optional(),
});

export interface PromptExploderCaseResolverPlaceDate {
  city?: string | undefined;
  day?: string | undefined;
  month?: string | undefined;
  year?: string | undefined;
  sourceSegmentId?: string | undefined;
  sourceSegmentTitle?: string | undefined;
  sourcePatternLabels?: string[] | undefined;
  sourceSequenceLabels?: string[] | undefined;
}

export const promptExploderCaseResolverMetadataSchema = z.object({
  parties: promptExploderCaseResolverPartyBundleSchema.optional(),
  caseId: z.string().optional(),
  documentType: z.string().optional(),
  placeDate: promptExploderCaseResolverPlaceDateSchema.optional(),
});

export interface PromptExploderCaseResolverMetadata {
  parties?: PromptExploderCaseResolverPartyBundle | undefined;
  caseId?: string | undefined;
  documentType?: string | undefined;
  placeDate?: PromptExploderCaseResolverPlaceDate | undefined;
}

export type PromptExploderCaseResolverCaptureRole =
  | PromptExploderCaseResolverPartyRole
  | 'party'
  | 'place_date';

export type CaseResolverCaptureField =
  | 'kind'
  | 'displayName'
  | 'organizationName'
  | 'companyName'
  | 'firstName'
  | 'name'
  | 'middleName'
  | 'lastName'
  | 'street'
  | 'streetNumber'
  | 'houseNumber'
  | 'city'
  | 'postalCode'
  | 'country'
  | 'day'
  | 'month'
  | 'year';

export type CaseResolverSegmentCaptureRule = {
  id: string;
  label: string;
  role: PromptExploderCaseResolverCaptureRole;
  field: CaseResolverCaptureField;
  regex: RegExp;
  applyTo: 'segment' | 'line';
  group: number;
  normalize: 'trim' | 'lower' | 'upper' | 'country' | 'day' | 'month' | 'year';
  overwrite: boolean;
  sequence: number;
};
export type { PromptExploderCaseResolverCaptureMode } from './settings';
