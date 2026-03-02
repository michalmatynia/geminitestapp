import 'server-only';

import type {
  ContextRegistryRef,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';

export type RuntimeContextProviderResolveOptions = {
  maxDocuments?: number;
};

export interface RuntimeContextProvider {
  id: string;
  canInferRefs(input: Record<string, unknown> | null): boolean;
  inferRefs(input: Record<string, unknown>): ContextRegistryRef[];
  canResolveRef(ref: ContextRegistryRef): boolean;
  resolveRefs(
    refs: ContextRegistryRef[],
    options?: RuntimeContextProviderResolveOptions
  ): Promise<ContextRuntimeDocument[]>;
  getVersion(): string;
}
