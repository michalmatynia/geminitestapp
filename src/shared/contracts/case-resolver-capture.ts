import { z } from 'zod';
import { type CaseResolverPartyReference } from './case-resolver';
import { type PromptExploderCaseResolverPartyCandidate } from './prompt-exploder';

/**
 * Case Resolver Capture DTOs
 */

export const caseResolverCaptureRoleSchema = z.enum([
  'addresser',
  'addressee',
  'subject',
  'reference',
  'other',
]);
export type CaseResolverCaptureRole = z.infer<typeof caseResolverCaptureRoleSchema>;

export const caseResolverCaptureActionSchema = z.enum([
  'upsert',
  'link_only',
  'ignore',
  'keepText',
  'useMatched',
  'createInFilemaker',
]);
export type CaseResolverCaptureAction = z.infer<typeof caseResolverCaptureActionSchema>;

export const caseResolverCaptureProposalMatchKindSchema = z.enum([
  'none',
  'party',
  'address',
  'party_and_address',
]);
export type CaseResolverCaptureProposalMatchKind = z.infer<
  typeof caseResolverCaptureProposalMatchKindSchema
>;

export const caseResolverCaptureProposalSchema = z.object({
  role: caseResolverCaptureRoleSchema,
  sourceRole: caseResolverCaptureRoleSchema,
  candidate: z.any(), // PromptExploderCaseResolverPartyCandidate
  existingReference: z.any().nullable(), // CaseResolverPartyReference
  existingAddressId: z.string().nullable(),
  matchKind: caseResolverCaptureProposalMatchKindSchema,
  hasAddressCandidate: z.boolean(),
  action: caseResolverCaptureActionSchema,
});

export type CaseResolverCaptureProposal = {
  role: CaseResolverCaptureRole;
  sourceRole: CaseResolverCaptureRole;
  candidate: PromptExploderCaseResolverPartyCandidate;
  existingReference: CaseResolverPartyReference | null;
  existingAddressId: string | null;
  matchKind: CaseResolverCaptureProposalMatchKind;
  hasAddressCandidate: boolean;
  action: CaseResolverCaptureAction;
};

export const caseResolverCaptureDocumentDateActionSchema = z.enum([
  'useDetectedDate',
  'keepText',
  'ignore',
]);
export type CaseResolverCaptureDocumentDateAction = z.infer<
  typeof caseResolverCaptureDocumentDateActionSchema
>;

export const caseResolverCaptureDocumentDateProposalSchema = z.object({
  isoDate: z.string(),
  source: z.enum(['metadata', 'text']),
  sourceLine: z.string().nullable(),
  cityHint: z.string().nullable(),
  city: z.string().nullable(),
  action: caseResolverCaptureDocumentDateActionSchema,
});

export type CaseResolverCaptureDocumentDateProposal = z.infer<
  typeof caseResolverCaptureDocumentDateProposalSchema
>;

export const caseResolverCaptureProposalStateSchema = z.object({
  targetFileId: z.string(),
  addresser: caseResolverCaptureProposalSchema.nullable(),
  addressee: caseResolverCaptureProposalSchema.nullable(),
  documentDate: caseResolverCaptureDocumentDateProposalSchema.nullable(),
});

export type CaseResolverCaptureProposalState = {
  targetFileId: string;
  addresser: CaseResolverCaptureProposal | null;
  addressee: CaseResolverCaptureProposal | null;
  documentDate: CaseResolverCaptureDocumentDateProposal | null;
};

export const caseResolverCaptureCleanupReportSchema = z.object({
  changed: z.boolean(),
  sourceWasHtml: z.boolean(),
  removedAddressLineCount: z.number(),
  removedAddresserLineCount: z.number(),
  removedAddresseeLineCount: z.number(),
  removedDateLineCount: z.number(),
});

export type CaseResolverCaptureCleanupReport = z.infer<
  typeof caseResolverCaptureCleanupReportSchema
>;

export const caseResolverCaptureCleanupResultSchema = z.object({
  text: z.string(),
  report: caseResolverCaptureCleanupReportSchema,
});

export type CaseResolverCaptureCleanupResult = z.infer<
  typeof caseResolverCaptureCleanupResultSchema
>;
