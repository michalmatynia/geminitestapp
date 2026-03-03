export const CASE_RESOLVER_BODY_SENTENCE_NEGATIVE_LOOKAHEAD =
  'niniejszym|dotyczy|uzasadnienie|wnosz[ęe]|na\\\\s+podstawie|post[ęe]powani\\\\p{L}*';

export const CASE_RESOLVER_ORGANIZATION_KEYWORD_PATTERN =
  'komisariat|komenda|policj\\\\p{L}*|prokuratur\\\\p{L}*|rzecznik|inspektorat|urz\\\\p{L}*|s[ąa]d\\\\p{L}*|minister\\\\p{L}*|zak[łl]ad\\\\p{L}*|oddzia\\\\p{L}*|fundacj\\\\p{L}*|stowarzysz\\\\p{L}*|sp\\\\.?\\\\s*z\\\\s*o\\\\.?\\\\s*o\\\\.?|s\\\\.?a\\\\.?|llc|ltd|inc|corp|office|depart\\\\p{L}*|agency|authority|institut\\\\p{L}*|universit\\\\p{L}*|bank|court|police|bureau|commission|ministry';

export const CASE_RESOLVER_PERSON_HEADING_STOPWORDS_PATTERN =
  'z|ze|na|w|we|do|od|dotyczy|wniosek|uzasadnienie|niniejszym|sincerely|regards|organ|inspektorat|komisariat|komenda|policj\\\\p{L}*|prokuratur\\\\p{L}*|rzecznik|urz\\\\p{L}*|s[ąa]d\\\\p{L}*|minister\\\\p{L}*|zak[łl]ad\\\\p{L}*|oddzia\\\\p{L}*|fundacj\\\\p{L}*|stowarzysz\\\\p{L}*|bank|court|police|bureau|ministry|office|agency|authority';

export const CASE_RESOLVER_PERSON_NAME_LINE_PATTERN = `^\\\\s*(?!(?:${CASE_RESOLVER_PERSON_HEADING_STOPWORDS_PATTERN})\\\\b)([\\\\p{Lu}][\\\\p{L}'’.-]{1,40}(?:\\\\s+[\\\\p{Lu}][\\\\p{L}'’.-]{1,40}){1,3})\\\\s*$`;

export const CASE_RESOLVER_PERSON_NAME_CAPTURE_PATTERN = `^\\\\s*(?!(?:${CASE_RESOLVER_PERSON_HEADING_STOPWORDS_PATTERN})\\\\b)([\\\\p{Lu}][\\\\p{L}'’.-]+)(?:\\\\s+([\\\\p{Lu}][\\\\p{L}'’.-]+(?:\\\\s+[\\\\p{Lu}][\\\\p{L}'’.-]+){0,2}))?\\\\s+([\\\\p{Lu}][\\\\p{L}'’.-]+)\\\\s*$`;

export const CASE_RESOLVER_ORGANIZATION_LINE_PATTERN = `^\\\\s*(?!.*\\\\b(?:${CASE_RESOLVER_BODY_SENTENCE_NEGATIVE_LOOKAHEAD})\\\\b)(?=.*\\\\b(?:${CASE_RESOLVER_ORGANIZATION_KEYWORD_PATTERN})\\\\b)[\\\\p{L}0-9][\\\\p{L}0-9&.,'’"\\\\-\\\\p{Pd}\\\\/()\\\\s]{2,120}\\\\s*$`;

export const CASE_RESOLVER_ORGANIZATION_LINE_CAPTURE_PATTERN = `^\\\\s*((?!.*\\\\b(?:${CASE_RESOLVER_BODY_SENTENCE_NEGATIVE_LOOKAHEAD})\\\\b)(?=.*\\\\b(?:${CASE_RESOLVER_ORGANIZATION_KEYWORD_PATTERN})\\\\b)[\\\\p{L}0-9][\\\\p{L}0-9&.,'’"\\\\-\\\\p{Pd}\\\\/()\\\\s]{2,120})\\\\s*$`;

export const CASE_RESOLVER_ADDRESSER_LABEL_PATTERN =
  '(?:from|od|nadawca|sender|addresser|wnioskodawca)';

export const CASE_RESOLVER_ADDRESSEE_LABEL_PATTERN =
  '(?:to|do|adresat|recipient|addressee|odbiorca|organ)';

export const CASE_RESOLVER_INLINE_ADDRESSER_LABEL_PATTERN = `^\\\\s*${CASE_RESOLVER_ADDRESSER_LABEL_PATTERN}\\\\s*:\\\\s*(.+?)\\\\s*$`;

export const CASE_RESOLVER_INLINE_ADDRESSEE_LABEL_PATTERN = `^\\\\s*${CASE_RESOLVER_ADDRESSEE_LABEL_PATTERN}\\\\s*:\\\\s*(.+?)\\\\s*$`;
