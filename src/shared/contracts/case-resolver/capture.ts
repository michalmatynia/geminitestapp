import { z } from 'zod';

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
export type CaseResolverCaptureRole = 'addresser' | 'addressee' | 'subject' | 'reference' | 'other';

export const caseResolverCaptureActionSchema = z.enum([
  'useMatched',
  'createInFilemaker',
  'keepText',
  'ignore',
]);
export type CaseResolverCaptureAction = 'useMatched' | 'createInFilemaker' | 'keepText' | 'ignore';

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
  role: 'addresser' | 'addressee' | 'subject' | 'reference' | 'other';
  targetPath: string;
  required: boolean;
  enabled?: boolean | undefined;
  targetRole?: 'addresser' | 'addressee' | 'subject' | 'reference' | 'other' | undefined;
  defaultAction?: 'useMatched' | 'createInFilemaker' | 'keepText' | 'ignore' | undefined;
  autoMatchPartyReference?: boolean | undefined;
  autoMatchAddress?: boolean | undefined;
}

export const caseResolverCaptureProposalStateSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'modified',
]);
export type CaseResolverCaptureProposalState = z.infer<
  typeof caseResolverCaptureProposalStateSchema
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
