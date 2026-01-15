export type NoteRecord = {
  id: string;
  title: string;
  content: string;
  color: string | null;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TagRecord = {
  id: string;
  name: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryRecord = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NoteTagRecord = {
  noteId: string;
  tagId: string;
  assignedAt: Date;
  tag: TagRecord;
};

export type NoteCategoryRecord = {
  noteId: string;
  categoryId: string;
  assignedAt: Date;
  category: CategoryRecord;
};

export type NoteWithRelations = NoteRecord & {
  tags: NoteTagRecord[];
  categories: NoteCategoryRecord[];
};

export type CreateNoteInput = {
  title: string;
  content: string;
  color?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
};

export type UpdateNoteInput = Partial<CreateNoteInput>;

export type NoteFilters = {
  search?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
};

export type CreateTagInput = {
  name: string;
  color?: string;
};

export type UpdateTagInput = Partial<CreateTagInput>;

export type CreateCategoryInput = {
  name: string;
  description?: string;
  color?: string;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;
