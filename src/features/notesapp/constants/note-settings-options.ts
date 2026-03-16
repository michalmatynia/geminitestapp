import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { NoteSettings } from '@/shared/contracts/notes';

export const NOTE_SORT_BY_OPTIONS: Array<LabeledOptionDto<NoteSettings['sortBy']>> = [
  { value: 'created', label: 'Created Date' },
  { value: 'updated', label: 'Modified Date' },
  { value: 'name', label: 'Name' },
];

export const NOTE_SORT_ORDER_OPTIONS: Array<LabeledOptionDto<NoteSettings['sortOrder']>> = [
  { value: 'desc', label: 'Descending (Newest/Z-A)' },
  { value: 'asc', label: 'Ascending (Oldest/A-Z)' },
];

export const NOTE_SEARCH_SCOPE_OPTIONS: Array<LabeledOptionDto<NoteSettings['searchScope']>> = [
  { value: 'both', label: 'Title & Content' },
  { value: 'title', label: 'Title Only' },
  { value: 'content', label: 'Content Only' },
];
