import { buildContactContent, isContactRecord } from './contactContentHelpers';

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
    titleLine1: 'We\'d love',
    titleLine2: 'to hear from you',
    body: 'Whether it\'s a question about an object, a bespoke enquiry, or just a conversation about craft - we\'re here.',
  },
  info: {
    addressEyebrow: 'Atelier',
    addressLines: ['STARGATER Objects', '12 Rue des Artisans', '75003 Paris, France'],
    directEyebrow: 'Direct',
    directLinks: [
      { label: 'hello@stargater.com', href: 'mailto:hello@stargater.com' },
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
    messagePlaceholder: 'Tell us what\'s on your mind...',
    footnote: 'We reply within 2 business days',
    submitLabel: 'Send message',
  },
  success: {
    toastTitle: 'Message received',
    toastMessage: 'We\'ll respond within 2 business days.',
    eyebrow: 'Message sent',
    titleLine1: 'Thank you,',
    titleLine2: 'we\'ll be in touch.',
    body: 'Expect a reply within 2 business days. For urgent matters you can also reach us directly at hello@stargater.com.',
    resetLabel: 'Send another message',
  },
};

export function validateContactContent(input: unknown): ContactContentValidationResult {
  const errors: string[] = [];
  const content = buildContactContent(
    isContactRecord(input) ? input : {},
    CONTACT_CONTENT_DEFAULTS,
    errors,
  );

  return {
    content,
    errors,
  };
}

export function normalizeContactContent(input: unknown): ContactContent {
  return validateContactContent(input).content;
}
