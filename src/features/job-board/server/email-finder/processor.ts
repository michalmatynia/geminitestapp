import { EMAIL_REGEX, MAILTO_REGEX, ATTRIBUTE_EMAIL_REGEX } from './constants';

export const extractEmails = (text: string): string[] => {
  const emails = text.match(EMAIL_REGEX) ?? [];
  const mailtoLinks = Array.from(text.matchAll(MAILTO_REGEX), (m) => m[2]);
  const attributeEmails = Array.from(text.matchAll(ATTRIBUTE_EMAIL_REGEX), (m) => m[2]);
  return Array.from(new Set([...emails, ...mailtoLinks, ...attributeEmails]));
};
