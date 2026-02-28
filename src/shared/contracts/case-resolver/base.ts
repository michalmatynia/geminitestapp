import { z } from 'zod';
import { dtoBaseSchema, namedDtoSchema, type DtoBase } from '../base';

/**
 * Case Resolver Node Roles
 */
export const caseResolverNodeRoleSchema = z.enum(['text_note', 'explanatory', 'ai_prompt']);
export type CaseResolverNodeRole = z.infer<typeof caseResolverNodeRoleSchema>;

/**
 * Case Resolver Formatting Modes
 */
export const caseResolverQuoteModeSchema = z.enum(['none', 'double', 'single']);
export type CaseResolverQuoteMode = z.infer<typeof caseResolverQuoteModeSchema>;

export const caseResolverJoinModeSchema = z.enum(['newline', 'tab', 'space', 'none']);
export type CaseResolverJoinMode = z.infer<typeof caseResolverJoinModeSchema>;

/**
 * Case Resolver Node Ports
 */
export const caseResolverDocumentNodePortSchema = z.enum([
  'wysiwygText',
  'content',
  'plaintextContent',
  'plainText',
  'wysiwygContent',
]);
export type CaseResolverDocumentNodePort = z.infer<typeof caseResolverDocumentNodePortSchema>;

/**
 * Case Resolver Asset Kinds
 */
export const caseResolverAssetKindSchema = z.enum([
  'document',
  'folder',
  'workspace',
  'pdf',
  'image',
  'file',
  'node_file',
]);
export type CaseResolverAssetKind = z.infer<typeof caseResolverAssetKindSchema>;

/**
 * Case Resolver File Types
 */
export const caseResolverFileTypeSchema = z.enum([
  'pdf',
  'image',
  'text',
  'markdown',
  'html',
  'json',
  'scanfile',
  'document',
  'case',
]);
export type CaseResolverFileType = z.infer<typeof caseResolverFileTypeSchema>;

/**
 * Case Resolver Versions
 */
export const caseResolverDocumentVersionSchema = z.union([
  z.literal(1),
  z.enum(['original', 'exploded']),
]);
export type CaseResolverDocumentVersion = z.infer<typeof caseResolverDocumentVersionSchema>;

export type CaseResolverDocumentFormatVersion = 1;

/**
 * Case Resolver Editor Types
 */
export const caseResolverEditorTypeSchema = z.enum([
  'graph',
  'document',
  'capture',
  'settings',
  'wysiwyg',
  'markdown',
  'code',
  'rich-text',
  'plain-text',
]);
export type CaseResolverEditorType = z.infer<typeof caseResolverEditorTypeSchema>;

/**
 * Case Resolver PDF Extraction Presets
 */
export const caseResolverPdfExtractionPresetIdSchema = z.enum([
  'plain_text',
  'structured_sections',
]);
export type CaseResolverPdfExtractionPresetId = z.infer<
  typeof caseResolverPdfExtractionPresetIdSchema
>;
