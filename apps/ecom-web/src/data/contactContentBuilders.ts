import type { ContactContent } from './contactContent';
import { isContactRecord } from './contactContentParsers';
import { buildContactHero, buildContactInfo } from './contactContentBuilderSections';
import { buildContactForm, buildContactSuccess } from './contactContentFormSuccessBuilders';

function toRecord(value: unknown): Record<string, unknown> {
  return isContactRecord(value) ? value : {};
}

export function buildContactContent(
  root: unknown,
  defaults: ContactContent,
  errors: string[],
): ContactContent {
  const source = toRecord(root);

  return {
    hero: buildContactHero(toRecord(source.hero), defaults.hero, errors),
    info: buildContactInfo(toRecord(source.info), defaults.info, errors),
    form: buildContactForm(toRecord(source.form), defaults.form, errors),
    success: buildContactSuccess(toRecord(source.success), defaults.success, errors),
  };
}
