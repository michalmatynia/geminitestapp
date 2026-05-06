import type { AiNode, CaseResolverEdgeMeta, CaseResolverJoinMode, CaseResolverNodeMeta } from '@/shared/contracts/case-resolver';
import type { CaseResolverCompileResult } from '@/shared/contracts/case-resolver/capture';

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
