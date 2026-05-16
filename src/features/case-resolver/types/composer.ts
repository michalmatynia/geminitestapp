/**
 * Case Resolver Composer Types
 * 
 * Type definitions for Case Resolver content composition and compilation.
 * Provides:
 * - Compile context for node processing
 * - Node output formatting types
 * - Text transformation and WYSIWYG handling
 * - Join mode and relationship processing
 * - Content compilation result types
 */

import type { AiNode, CaseResolverJoinMode, CaseResolverNodeMeta } from '@/shared/contracts/case-resolver';

export interface CompileContext {
  node: AiNode;
  meta: CaseResolverNodeMeta;
  nodeText: string;
  nodeWysiwygText: string;
  incoming: Record<string, { value: string; firstJoinMode: CaseResolverJoinMode | null }>;
  options: { transformPlainTextOutput?: (input: any) => string };
}

export interface NodeOutput {
  wysiwygText: string;
  plaintextContent: string;
  plainText: string;
  wysiwygContent: string;
}
