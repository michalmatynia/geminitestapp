export interface NoteSettings {
  sortBy: "created" | "updated" | "name";
  sortOrder: "asc" | "desc";
  showTimestamps: boolean;
  showBreadcrumbs: boolean;
  showRelatedNotes: boolean;
  searchScope: "both" | "title" | "content";
  selectedFolderId: string | null;
  selectedNotebookId: string | null;
  viewMode: "grid" | "list";
  gridDensity: 4 | 8;
  autoformatOnPaste: boolean;
}
