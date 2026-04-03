type ExistingPromptExploderLibraryItemIdentity = {
  id: string;
  name: string;
  createdAt: string;
} | null;

const resolveNonEmptyTrimmedString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

export const resolvePromptExploderLibraryItemIdentity = (args: {
  existingItem: ExistingPromptExploderLibraryItemIdentity;
  now: string;
  createItemId: () => string;
}): { id: string; createdAt: string; updatedAt: string } => ({
  id: args.existingItem?.id ?? args.createItemId(),
  createdAt: args.existingItem?.createdAt ?? args.now,
  updatedAt: args.now,
});

export const resolvePromptExploderLibraryItemName = (args: {
  prompt: string;
  libraryNameDraft: string;
  existingItem: ExistingPromptExploderLibraryItemIdentity;
  deriveName: (prompt: string) => string;
}): string =>
  resolveNonEmptyTrimmedString(args.libraryNameDraft) ??
  resolveNonEmptyTrimmedString(args.existingItem?.name) ??
  args.deriveName(args.prompt);
