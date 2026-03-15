import { z } from 'zod';

import type { PromptExploderCaseResolverPartyCandidate } from '../prompt-exploder';
import type { CaseResolverPartyReference } from './relations';

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
  'useMatched',
  'createInFilemaker',
  'keepText',
  'ignore',
]);
export type CaseResolverCaptureAction = z.infer<typeof caseResolverCaptureActionSchema>;

export const caseResolverCaptureRoleMappingSchema = z.object({
  role: caseResolverCaptureRoleSchema,
  targetPath: z.string(),
  required: z.boolean(),
  enabled: z.boolean().optional(),
  targetRole: caseResolverCaptureRoleSchema.optional(),
  defaultAction: caseResolverCaptureActionSchema.optional(),
  autoMatchPartyReference: z.boolean().optional(),
  autoMatchAddress: z.boolean().optional(),
});

export interface CaseResolverCaptureRoleMapping {
  role: CaseResolverCaptureRole;
  targetPath: string;
  required: boolean;
  enabled?: boolean | undefined;
  targetRole?: CaseResolverCaptureRole | undefined;
  defaultAction?: CaseResolverCaptureAction | undefined;
  autoMatchPartyReference?: boolean | undefined;
  autoMatchAddress?: boolean | undefined;
}

export const caseResolverCaptureProposalStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'modified',
]);
export type CaseResolverCaptureProposalStatus = z.infer<
  typeof caseResolverCaptureProposalStatusSchema
>;

export const caseResolverCaptureSettingsSchema = z.object({
  enabled: z.boolean(),
  autoOpenProposalModal: z.boolean(),
  roleMappings: z.object({
    addresser: caseResolverCaptureRoleMappingSchema.optional(),
    addressee: caseResolverCaptureRoleMappingSchema.optional(),
    subject: caseResolverCaptureRoleMappingSchema.optional(),
    reference: caseResolverCaptureRoleMappingSchema.optional(),
    other: caseResolverCaptureRoleMappingSchema.optional(),
  }),
});

export interface CaseResolverCaptureSettings {
  enabled: boolean;
  autoOpenProposalModal: boolean;
  roleMappings: {
    addresser: CaseResolverCaptureRoleMapping;
    addressee: CaseResolverCaptureRoleMapping;
    subject: CaseResolverCaptureRoleMapping;
    reference: CaseResolverCaptureRoleMapping;
    other: CaseResolverCaptureRoleMapping;
  };
}

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

export interface CaseResolverCompiledSegment {
  id: string;
  nodeId: string | null;
  role: string;
  content: string;
  title?: string | undefined;
  text?: string | undefined;
  includeInOutput?: boolean | undefined;
  sourceFileId?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface CaseResolverCompileResult {
  segments: CaseResolverCompiledSegment[];
  combinedContent: string;
  prompt: string;
  outputsByNode: Record<
    string,
    {
      wysiwygText: string;
      plaintextContent: string;
      plainText: string;
      wysiwygContent: string;
    }
  >;
  warnings: string[];
}
