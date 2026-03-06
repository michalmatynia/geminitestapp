export type CaseResolverWorkspaceDetachedPayload<TSchema extends string, TFileEntry> = {
  schema: TSchema;
  workspaceRevision: number;
  lastMutationId: string | null;
  files: TFileEntry[];
};
