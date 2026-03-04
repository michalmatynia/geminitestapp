import type {
  CaseResolverDefaultDocumentFormat,
  CaseResolverSettings,
} from '@/shared/contracts/case-resolver';

export const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v2';
export const CASE_RESOLVER_TAGS_KEY = 'case_resolver_tags_v1';
export const CASE_RESOLVER_IDENTIFIERS_KEY = 'case_resolver_identifiers_v1';
export const CASE_RESOLVER_CATEGORIES_KEY = 'case_resolver_categories_v1';
export const CASE_RESOLVER_SETTINGS_KEY = 'case_resolver_settings_v1';
export const CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY = 'case_resolver_default_document_format_v1';
export const CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP = '1970-01-01T00:00:00.000Z';

export const DEFAULT_CASE_RESOLVER_OCR_PROMPT =
  'Extract all readable text from the attached image and return plain text only. Keep line breaks. Do not add commentary.';
export const DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT = 'Extract text from the uploaded document';

export type CaseResolverPartySearchKind = CaseResolverSettings['defaultAddresserPartyKind'];

export const DEFAULT_CASE_RESOLVER_SETTINGS: CaseResolverSettings = {
  ocrModel: '',
  ocrPrompt: DEFAULT_CASE_RESOLVER_OCR_PROMPT,
  defaultDocumentFormat: 'wysiwyg',
  confirmDeleteDocument: true,
  defaultAddresserPartyKind: 'person',
  defaultAddresseePartyKind: 'organization',
};

export const CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_OPTIONS: Array<{
  value: CaseResolverDefaultDocumentFormat;
  label: string;
  description: string;
}> = [
  {
    value: 'wysiwyg',
    label: 'WYSIWYG',
    description: 'Open and create documents using rich text editor mode.',
  },
];

export const CASE_RESOLVER_CONFIRM_DELETE_OPTIONS: Array<{
  value: 'on' | 'off';
  label: string;
  description: string;
}> = [
  {
    value: 'on',
    label: 'On',
    description: 'Ask for confirmation before deleting a document.',
  },
  {
    value: 'off',
    label: 'Off',
    description: 'Delete documents immediately without confirmation.',
  },
];

export const CASE_RESOLVER_PARTY_SEARCH_KIND_OPTIONS: Array<{
  value: CaseResolverPartySearchKind;
  label: string;
  description: string;
}> = [
  {
    value: 'person',
    label: 'Persons',
    description: 'Search and suggest only people.',
  },
  {
    value: 'organization',
    label: 'Organizations',
    description: 'Search and suggest only organizations.',
  },
];

export const CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT = 120;

export const CASE_RESOLVER_DATE_LABEL_REGEX = /\b(date|document\s*date|data|data\s*dokumentu)\b/i;
export const CASE_RESOLVER_YMD_DATE_REGEX =
  /\b((?:19|20)\d{2})[.\-/](0?[1-9]|1[0-2])[.\-/](0?[1-9]|[12]\d|3[01])\b/g;
export const CASE_RESOLVER_DMY_DATE_REGEX =
  /\b(0?[1-9]|[12]\d|3[01])[.-](0?[1-9]|1[0-2])[.-]((?:19|20)\d{2})\b/g;
export const CASE_RESOLVER_MDY_DATE_REGEX =
  /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/((?:19|20)\d{2})\b/g;
