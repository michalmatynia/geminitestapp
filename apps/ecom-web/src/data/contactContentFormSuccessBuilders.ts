import type {
  ContactFormContent,
  ContactSuccessContent,
} from './contactContent';
import { readString, readStringList, TEXT_LIMITS } from './contactContentParsers';

function buildContactNameFields(
  source: Record<string, unknown>,
  defaults: ContactFormContent,
  errors: string[],
): Pick<
  ContactFormContent,
  'nameLabel' | 'namePlaceholder' | 'emailLabel' | 'emailPlaceholder'
> {
  return {
    nameLabel: readString({
      source,
      key: 'nameLabel',
      fallback: defaults.nameLabel,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.form.nameLabel',
    }),
    namePlaceholder: readString({
      source,
      key: 'namePlaceholder',
      fallback: defaults.namePlaceholder,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.form.namePlaceholder',
    }),
    emailLabel: readString({
      source,
      key: 'emailLabel',
      fallback: defaults.emailLabel,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.form.emailLabel',
    }),
    emailPlaceholder: readString({
      source,
      key: 'emailPlaceholder',
      fallback: defaults.emailPlaceholder,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.form.emailPlaceholder',
    }),
  };
}

function buildContactMessageFields(
  source: Record<string, unknown>,
  defaults: ContactFormContent,
  errors: string[],
): Pick<ContactFormContent, 'messageLabel' | 'messagePlaceholder' | 'subjectLabel'> {
  return {
    messageLabel: readString({
      source,
      key: 'messageLabel',
      fallback: defaults.messageLabel,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.form.messageLabel',
    }),
    messagePlaceholder: readString({
      source,
      key: 'messagePlaceholder',
      fallback: defaults.messagePlaceholder,
      maxLength: TEXT_LIMITS.medium,
      errors,
      path: 'contact.form.messagePlaceholder',
    }),
    subjectLabel: readString({
      source,
      key: 'subjectLabel',
      fallback: defaults.subjectLabel,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.form.subjectLabel',
    }),
  };
}

function buildContactSubmissionFields(
  source: Record<string, unknown>,
  defaults: ContactFormContent,
  errors: string[],
): Pick<ContactFormContent, 'footnote' | 'submitLabel' | 'subjects'> {
  return {
    footnote: readString({
      source,
      key: 'footnote',
      fallback: defaults.footnote,
      maxLength: TEXT_LIMITS.medium,
      errors,
      path: 'contact.form.footnote',
    }),
    submitLabel: readString({
      source,
      key: 'submitLabel',
      fallback: defaults.submitLabel,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.form.submitLabel',
    }),
    subjects: readStringList({
      source,
      key: 'subjects',
      fallback: defaults.subjects,
      maxItems: 12,
      maxItemLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.form.subjects',
    }),
  };
}

export function buildContactForm(
  source: Record<string, unknown>,
  defaults: ContactFormContent,
  errors: string[],
): ContactFormContent {
  return {
    ...buildContactNameFields(source, defaults, errors),
    ...buildContactMessageFields(source, defaults, errors),
    ...buildContactSubmissionFields(source, defaults, errors),
  };
}

function buildContactSuccessHeader(
  source: Record<string, unknown>,
  defaults: ContactSuccessContent,
  errors: string[],
): Pick<ContactSuccessContent, 'toastTitle' | 'toastMessage'> {
  return {
    toastTitle: readString({
      source,
      key: 'toastTitle',
      fallback: defaults.toastTitle,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.success.toastTitle',
    }),
    toastMessage: readString({
      source,
      key: 'toastMessage',
      fallback: defaults.toastMessage,
      maxLength: TEXT_LIMITS.medium,
      errors,
      path: 'contact.success.toastMessage',
    }),
  };
}

function buildContactSuccessCopy(
  source: Record<string, unknown>,
  defaults: ContactSuccessContent,
  errors: string[],
): Pick<
  ContactSuccessContent,
  'eyebrow' | 'titleLine1' | 'titleLine2' | 'body' | 'resetLabel'
> {
  return {
    eyebrow: readString({
      source,
      key: 'eyebrow',
      fallback: defaults.eyebrow,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.success.eyebrow',
    }),
    titleLine1: readString({
      source,
      key: 'titleLine1',
      fallback: defaults.titleLine1,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.success.titleLine1',
    }),
    titleLine2: readString({
      source,
      key: 'titleLine2',
      fallback: defaults.titleLine2,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.success.titleLine2',
    }),
    body: readString({
      source,
      key: 'body',
      fallback: defaults.body,
      maxLength: TEXT_LIMITS.long,
      errors,
      path: 'contact.success.body',
    }),
    resetLabel: readString({
      source,
      key: 'resetLabel',
      fallback: defaults.resetLabel,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.success.resetLabel',
    }),
  };
}

export function buildContactSuccess(
  source: Record<string, unknown>,
  defaults: ContactSuccessContent,
  errors: string[],
): ContactSuccessContent {
  return {
    ...buildContactSuccessHeader(source, defaults, errors),
    ...buildContactSuccessCopy(source, defaults, errors),
  };
}
