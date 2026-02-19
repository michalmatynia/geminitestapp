import type {
  NoteDto,
  NotebookDto,
  NoteCategoryDto,
  NoteTagDto,
  NoteThemeDto,
  CreateNoteDto,
  UpdateNoteDto,
  CreateNotebookDto,
  UpdateNotebookDto,
  CreateNoteCategoryDto,
  UpdateNoteCategoryDto,
  CreateNoteTagDto,
  UpdateNoteTagDto,
  CreateNoteThemeDto,
  UpdateNoteThemeDto,
  NoteEditorType,
  NoteWithRelationsDto,
  NoteTagRelationDto,
  NoteCategoryRelationDto,
  NoteRelationDto,
  RelatedNoteDto,
  NoteFiltersDto,
  NoteFileDto,
  CreateNoteFileDto,
  NoteCategoryRecordWithChildrenDto
} from '../../contracts/notes';
  
export type {
  NoteDto,
  NotebookDto,
  NoteCategoryDto,
  NoteTagDto,
  NoteThemeDto,
  CreateNoteDto,
  UpdateNoteDto,
  CreateNotebookDto,
  UpdateNotebookDto,
  CreateNoteCategoryDto,
  UpdateNoteCategoryDto,
  CreateNoteTagDto,
  UpdateNoteTagDto,
  CreateNoteThemeDto,
  UpdateNoteThemeDto,
  NoteEditorType,
  NoteWithRelationsDto,
  NoteTagRelationDto,
  NoteCategoryRelationDto,
  NoteRelationDto,
  RelatedNoteDto,
  NoteFiltersDto,
  NoteFileDto,
  CreateNoteFileDto
};
  
export type NotebookRecord = NotebookDto;
  
export type ThemeRecord = NoteThemeDto;
  
export type NoteRecord = NoteDto;
  
export type TagRecord = NoteTagDto;
  
export type CategoryRecord = NoteCategoryDto;
  
export type NoteTagRecord = NoteTagRelationDto;
  
export type NoteCategoryRecord = NoteCategoryRelationDto;
  
export type NoteRelationRecord = NoteRelationDto;
  
// Simple note type for related notes (without nested relations to avoid circular references)
export type RelatedNote = RelatedNoteDto;
  
export type NoteRelationWithTarget = NoteRelationRecord & {
    targetNote?: RelatedNote | undefined;
  };
  
export type NoteRelationWithSource = NoteRelationRecord & {
    sourceNote?: RelatedNote | undefined;
  };
  
export type NoteWithRelations = NoteWithRelationsDto;
  
export type CategoryWithChildren = NoteCategoryRecordWithChildrenDto & {
    notes: NoteRecord[];
  };
  
export type NoteCreateInput = CreateNoteDto;
export type NoteUpdateInput = UpdateNoteDto;
export type NotebookCreateInput = CreateNotebookDto;
export type NotebookUpdateInput = UpdateNotebookDto;
export type ThemeCreateInput = CreateNoteThemeDto;
export type ThemeUpdateInput = UpdateNoteThemeDto;
export type CategoryCreateInput = CreateNoteCategoryDto;
export type CategoryUpdateInput = UpdateNoteCategoryDto;
export type TagCreateInput = CreateNoteTagDto;
export type TagUpdateInput = UpdateNoteTagDto;
  
export type NoteFilters = NoteFiltersDto;
  
export type NoteFileRecord = NoteFileDto;
  
export type NoteFileCreateInput = CreateNoteFileDto;
