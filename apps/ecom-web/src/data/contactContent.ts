export interface ContactHeroContent {
  watermark: string;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  body: string;
}

export interface ContactLinkContent {
  label: string;
  href: string;
}

export interface ContactHoursContent {
  label: string;
  value: string;
  muted: boolean;
}

export interface ContactInfoContent {
  addressEyebrow: string;
  addressLines: string[];
  directEyebrow: string;
  directLinks: ContactLinkContent[];
  hoursEyebrow: string;
  hours: ContactHoursContent[];
  followEyebrow: string;
  socialLinks: ContactLinkContent[];
}

export interface ContactFormContent {
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  subjectLabel: string;
  subjects: string[];
  messageLabel: string;
  messagePlaceholder: string;
  footnote: string;
  submitLabel: string;
}

export interface ContactSuccessContent {
  toastTitle: string;
  toastMessage: string;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  body: string;
  resetLabel: string;
}

export interface ContactContent {
  hero: ContactHeroContent;
  info: ContactInfoContent;
  form: ContactFormContent;
  success: ContactSuccessContent;
}

export interface ContactContentValidationResult {
  content: ContactContent;
  errors: string[];
}

export const CONTACT_CONTENT_DEFAULTS: ContactContent = {
  hero: {
    watermark: 'Contact',
    eyebrow: 'Get in touch',
    titleLine1: "We'd love",
    titleLine2: 'to hear from you',
    body: "Whether it's a question about an object, a bespoke enquiry, or just a conversation about craft - we're here.",
  },
  info: {
    addressEyebrow: 'Atelier',
    addressLines: ['ARCANA Objects', '12 Rue des Artisans', '75003 Paris, France'],
    directEyebrow: 'Direct',
    directLinks: [
      { label: 'hello@arcana.com', href: 'mailto:hello@arcana.com' },
      { label: '+33 1 40 00 00 00', href: 'tel:+33140000000' },
    ],
    hoursEyebrow: 'Hours',
    hours: [
      { label: 'Monday - Friday', value: '10:00 - 18:00', muted: false },
      { label: 'Saturday', value: '10:00 - 16:00', muted: false },
      { label: 'Sunday', value: 'Closed', muted: true },
    ],
    followEyebrow: 'Follow',
    socialLinks: [
      { label: 'Instagram', href: '#' },
      { label: 'Pinterest', href: '#' },
      { label: 'Substack', href: '#' },
    ],
  },
  form: {
    nameLabel: 'Your name',
    namePlaceholder: 'Full name',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    subjectLabel: 'Subject',
    subjects: [
      'Product enquiry',
      'Order support',
      'Returns & exchanges',
      'Bespoke & wholesale',
      'Press & editorial',
      'Other',
    ],
    messageLabel: 'Your message',
    messagePlaceholder: "Tell us what's on your mind...",
    footnote: 'We reply within 2 business days',
    submitLabel: 'Send message',
  },
  success: {
    toastTitle: 'Message received',
    toastMessage: "We'll respond within 2 business days.",
    eyebrow: 'Message sent',
    titleLine1: 'Thank you,',
    titleLine2: "we'll be in touch.",
    body: 'Expect a reply within 2 business days. For urgent matters you can also reach us directly at hello@arcana.com.',
    resetLabel: 'Send another message',
  },
};

const TEXT_LIMITS = {
  short: 120,
  medium: 360,
  long: 900,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
  maxLength: number,
  errors: string[],
  path: string,
): string {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'string') {
    errors.push(`${path} must be text.`);
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors.push(`${path} must be ${maxLength} characters or fewer.`);
    return fallback;
  }

  return trimmed;
}

function readBoolean(source: Record<string, unknown>, key: string, fallback: boolean, errors: string[], path: string): boolean {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'boolean') {
    errors.push(`${path} must be true or false.`);
    return fallback;
  }
  return value;
}

function isAllowedHref(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.startsWith('#')) return true;
  if (value.startsWith('mailto:')) return true;
  if (value.startsWith('tel:')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function readHref(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
  errors: string[],
  path: string,
): string {
  const value = readString(source, key, fallback, TEXT_LIMITS.medium, errors, path);
  if (!value) return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${path} must be an internal path, anchor, mailto, tel, or http(s) URL.`);
    return fallback;
  }
  return value;
}

function readStringList(
  source: Record<string, unknown>,
  key: string,
  fallback: string[],
  maxItems: number,
  maxItemLength: number,
  errors: string[],
  path: string,
): string[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      errors.push(`${path} can only contain text items.`);
      return fallback;
    }
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxItemLength) {
      errors.push(`${path} items must be ${maxItemLength} characters or fewer.`);
      return fallback;
    }
    items.push(trimmed);
  }

  if (items.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }

  return items.length > 0 ? items : fallback;
}

function readLinks(
  input: unknown,
  fallback: ContactLinkContent[],
  maxItems: number,
  errors: string[],
  path: string,
): ContactLinkContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const links: ContactLinkContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackLink = fallback[index] ?? { label: '', href: '#' };
    if (!isRecord(item)) {
      errors.push(`${path} items must be objects.`);
      return fallback;
    }
    links.push({
      label: readString(item, 'label', fallbackLink.label, TEXT_LIMITS.short, errors, `${path}.${index}.label`),
      href: readHref(item, 'href', fallbackLink.href, errors, `${path}.${index}.href`),
    });
  }

  if (links.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }

  return links.length > 0 ? links : fallback;
}

function readHours(input: unknown, fallback: ContactHoursContent[], errors: string[]): ContactHoursContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('contact.info.hours must be a list.');
    return fallback;
  }

  const hours: ContactHoursContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackRow = fallback[index] ?? { label: '', value: '', muted: false };
    if (!isRecord(item)) {
      errors.push('contact.info.hours items must be objects.');
      return fallback;
    }
    hours.push({
      label: readString(item, 'label', fallbackRow.label, TEXT_LIMITS.short, errors, `contact.info.hours.${index}.label`),
      value: readString(item, 'value', fallbackRow.value, TEXT_LIMITS.short, errors, `contact.info.hours.${index}.value`),
      muted: readBoolean(item, 'muted', fallbackRow.muted, errors, `contact.info.hours.${index}.muted`),
    });
  }

  if (hours.length > 10) {
    errors.push('contact.info.hours can contain at most 10 items.');
    return fallback;
  }

  return hours.length > 0 ? hours : fallback;
}

export function validateContactContent(input: unknown): ContactContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};
  const hero = isRecord(root['hero']) ? root['hero'] : {};
  const info = isRecord(root['info']) ? root['info'] : {};
  const form = isRecord(root['form']) ? root['form'] : {};
  const success = isRecord(root['success']) ? root['success'] : {};

  const content: ContactContent = {
    hero: {
      watermark: readString(hero, 'watermark', CONTACT_CONTENT_DEFAULTS.hero.watermark, TEXT_LIMITS.short, errors, 'contact.hero.watermark'),
      eyebrow: readString(hero, 'eyebrow', CONTACT_CONTENT_DEFAULTS.hero.eyebrow, TEXT_LIMITS.short, errors, 'contact.hero.eyebrow'),
      titleLine1: readString(hero, 'titleLine1', CONTACT_CONTENT_DEFAULTS.hero.titleLine1, TEXT_LIMITS.short, errors, 'contact.hero.titleLine1'),
      titleLine2: readString(hero, 'titleLine2', CONTACT_CONTENT_DEFAULTS.hero.titleLine2, TEXT_LIMITS.short, errors, 'contact.hero.titleLine2'),
      body: readString(hero, 'body', CONTACT_CONTENT_DEFAULTS.hero.body, TEXT_LIMITS.long, errors, 'contact.hero.body'),
    },
    info: {
      addressEyebrow: readString(info, 'addressEyebrow', CONTACT_CONTENT_DEFAULTS.info.addressEyebrow, TEXT_LIMITS.short, errors, 'contact.info.addressEyebrow'),
      addressLines: readStringList(info, 'addressLines', CONTACT_CONTENT_DEFAULTS.info.addressLines, 8, TEXT_LIMITS.short, errors, 'contact.info.addressLines'),
      directEyebrow: readString(info, 'directEyebrow', CONTACT_CONTENT_DEFAULTS.info.directEyebrow, TEXT_LIMITS.short, errors, 'contact.info.directEyebrow'),
      directLinks: readLinks(info['directLinks'], CONTACT_CONTENT_DEFAULTS.info.directLinks, 6, errors, 'contact.info.directLinks'),
      hoursEyebrow: readString(info, 'hoursEyebrow', CONTACT_CONTENT_DEFAULTS.info.hoursEyebrow, TEXT_LIMITS.short, errors, 'contact.info.hoursEyebrow'),
      hours: readHours(info['hours'], CONTACT_CONTENT_DEFAULTS.info.hours, errors),
      followEyebrow: readString(info, 'followEyebrow', CONTACT_CONTENT_DEFAULTS.info.followEyebrow, TEXT_LIMITS.short, errors, 'contact.info.followEyebrow'),
      socialLinks: readLinks(info['socialLinks'], CONTACT_CONTENT_DEFAULTS.info.socialLinks, 8, errors, 'contact.info.socialLinks'),
    },
    form: {
      nameLabel: readString(form, 'nameLabel', CONTACT_CONTENT_DEFAULTS.form.nameLabel, TEXT_LIMITS.short, errors, 'contact.form.nameLabel'),
      namePlaceholder: readString(form, 'namePlaceholder', CONTACT_CONTENT_DEFAULTS.form.namePlaceholder, TEXT_LIMITS.short, errors, 'contact.form.namePlaceholder'),
      emailLabel: readString(form, 'emailLabel', CONTACT_CONTENT_DEFAULTS.form.emailLabel, TEXT_LIMITS.short, errors, 'contact.form.emailLabel'),
      emailPlaceholder: readString(form, 'emailPlaceholder', CONTACT_CONTENT_DEFAULTS.form.emailPlaceholder, TEXT_LIMITS.short, errors, 'contact.form.emailPlaceholder'),
      subjectLabel: readString(form, 'subjectLabel', CONTACT_CONTENT_DEFAULTS.form.subjectLabel, TEXT_LIMITS.short, errors, 'contact.form.subjectLabel'),
      subjects: readStringList(form, 'subjects', CONTACT_CONTENT_DEFAULTS.form.subjects, 12, TEXT_LIMITS.short, errors, 'contact.form.subjects'),
      messageLabel: readString(form, 'messageLabel', CONTACT_CONTENT_DEFAULTS.form.messageLabel, TEXT_LIMITS.short, errors, 'contact.form.messageLabel'),
      messagePlaceholder: readString(form, 'messagePlaceholder', CONTACT_CONTENT_DEFAULTS.form.messagePlaceholder, TEXT_LIMITS.medium, errors, 'contact.form.messagePlaceholder'),
      footnote: readString(form, 'footnote', CONTACT_CONTENT_DEFAULTS.form.footnote, TEXT_LIMITS.medium, errors, 'contact.form.footnote'),
      submitLabel: readString(form, 'submitLabel', CONTACT_CONTENT_DEFAULTS.form.submitLabel, TEXT_LIMITS.short, errors, 'contact.form.submitLabel'),
    },
    success: {
      toastTitle: readString(success, 'toastTitle', CONTACT_CONTENT_DEFAULTS.success.toastTitle, TEXT_LIMITS.short, errors, 'contact.success.toastTitle'),
      toastMessage: readString(success, 'toastMessage', CONTACT_CONTENT_DEFAULTS.success.toastMessage, TEXT_LIMITS.medium, errors, 'contact.success.toastMessage'),
      eyebrow: readString(success, 'eyebrow', CONTACT_CONTENT_DEFAULTS.success.eyebrow, TEXT_LIMITS.short, errors, 'contact.success.eyebrow'),
      titleLine1: readString(success, 'titleLine1', CONTACT_CONTENT_DEFAULTS.success.titleLine1, TEXT_LIMITS.short, errors, 'contact.success.titleLine1'),
      titleLine2: readString(success, 'titleLine2', CONTACT_CONTENT_DEFAULTS.success.titleLine2, TEXT_LIMITS.short, errors, 'contact.success.titleLine2'),
      body: readString(success, 'body', CONTACT_CONTENT_DEFAULTS.success.body, TEXT_LIMITS.long, errors, 'contact.success.body'),
      resetLabel: readString(success, 'resetLabel', CONTACT_CONTENT_DEFAULTS.success.resetLabel, TEXT_LIMITS.short, errors, 'contact.success.resetLabel'),
    },
  };

  return { content, errors };
}

export function normalizeContactContent(input: unknown): ContactContent {
  return validateContactContent(input).content;
}
