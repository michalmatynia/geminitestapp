import type {
  ContactHeroContent,
  ContactInfoContent,
} from './contactContent';
import { readHours, readLinks, readString, readStringList, TEXT_LIMITS } from './contactContentParsers';

export function buildContactHero(
  source: Record<string, unknown>,
  defaults: ContactHeroContent,
  errors: string[],
): ContactHeroContent {
  return {
    watermark: readString({
      source,
      key: 'watermark',
      fallback: defaults.watermark,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.hero.watermark',
    }),
    eyebrow: readString({
      source,
      key: 'eyebrow',
      fallback: defaults.eyebrow,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.hero.eyebrow',
    }),
    titleLine1: readString({
      source,
      key: 'titleLine1',
      fallback: defaults.titleLine1,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.hero.titleLine1',
    }),
    titleLine2: readString({
      source,
      key: 'titleLine2',
      fallback: defaults.titleLine2,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.hero.titleLine2',
    }),
    body: readString({
      source,
      key: 'body',
      fallback: defaults.body,
      maxLength: TEXT_LIMITS.long,
      errors,
      path: 'contact.hero.body',
    }),
  };
}

function buildContactAddressBlock(
  source: Record<string, unknown>,
  defaults: ContactInfoContent,
  errors: string[],
): Pick<ContactInfoContent, 'addressEyebrow' | 'addressLines'> {
  return {
    addressEyebrow: readString({
      source,
      key: 'addressEyebrow',
      fallback: defaults.addressEyebrow,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.info.addressEyebrow',
    }),
    addressLines: readStringList({
      source,
      key: 'addressLines',
      fallback: defaults.addressLines,
      maxItems: 8,
      maxItemLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.info.addressLines',
    }),
  };
}

function buildContactDirectBlock(
  source: Record<string, unknown>,
  defaults: ContactInfoContent,
  errors: string[],
): Pick<ContactInfoContent, 'directEyebrow' | 'directLinks'> {
  return {
    directEyebrow: readString({
      source,
      key: 'directEyebrow',
      fallback: defaults.directEyebrow,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.info.directEyebrow',
    }),
    directLinks: readLinks({
      input: source['directLinks'],
      fallback: defaults.directLinks,
      maxItems: 6,
      errors,
      path: 'contact.info.directLinks',
    }),
  };
}

function buildContactHoursBlock(
  source: Record<string, unknown>,
  defaults: ContactInfoContent,
  errors: string[],
): Pick<ContactInfoContent, 'hoursEyebrow' | 'hours'> {
  return {
    hoursEyebrow: readString({
      source,
      key: 'hoursEyebrow',
      fallback: defaults.hoursEyebrow,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.info.hoursEyebrow',
    }),
    hours: readHours(source['hours'], defaults.hours, errors),
  };
}

function buildContactSocialBlock(
  source: Record<string, unknown>,
  defaults: ContactInfoContent,
  errors: string[],
): Pick<ContactInfoContent, 'followEyebrow' | 'socialLinks'> {
  return {
    followEyebrow: readString({
      source,
      key: 'followEyebrow',
      fallback: defaults.followEyebrow,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'contact.info.followEyebrow',
    }),
    socialLinks: readLinks({
      input: source['socialLinks'],
      fallback: defaults.socialLinks,
      maxItems: 8,
      errors,
      path: 'contact.info.socialLinks',
    }),
  };
}

export function buildContactInfo(
  source: Record<string, unknown>,
  defaults: ContactInfoContent,
  errors: string[],
): ContactInfoContent {
  return {
    ...buildContactAddressBlock(source, defaults, errors),
    ...buildContactDirectBlock(source, defaults, errors),
    ...buildContactHoursBlock(source, defaults, errors),
    ...buildContactSocialBlock(source, defaults, errors),
  };
}
