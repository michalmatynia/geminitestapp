import type { MultiSelectOption } from '@/shared/ui/forms-and-actions.public';
import type {
  FilemakerEmailCampaign,
  FilemakerLexiconTerm,
} from '../../types';
import type { FilemakerLexiconTypeMetadataMap } from '../../pages/AdminFilemakerLexiconPage.type-metadata';
import {
  formatFilemakerLexiconCategory,
  compareFilemakerLexiconTypeKeys,
} from '../../pages/AdminFilemakerLexiconPage.type-metadata';
import {
  RESPONSIBILITY_HEADING_RE,
  RESPONSIBILITY_ITEM_START_RE,
} from './OrganizationJobListingsSection.constants';

export const toCampaignOption = (campaign: FilemakerEmailCampaign): MultiSelectOption => ({
  value: campaign.id,
  label: campaign.name.trim().length > 0 ? campaign.name : campaign.id,
});

export const toLexiconOption = (
  term: FilemakerLexiconTerm,
  typeMetadata: FilemakerLexiconTypeMetadataMap
): MultiSelectOption => ({
  value: term.id,
  label: `${term.label} (${formatFilemakerLexiconCategory(term.typeKey, typeMetadata)})`,
});

export const lexiconTermHref = (term: FilemakerLexiconTerm): string => {
  const params = new URLSearchParams({
    type: term.typeKey,
    query: term.label,
  });
  return `/admin/filemaker/lexicon?${params.toString()}`;
};

export const groupLexiconTermsByCategory = (
  terms: FilemakerLexiconTerm[],
  typeMetadata: FilemakerLexiconTypeMetadataMap
): Array<{ typeKey: FilemakerLexiconTerm['typeKey']; terms: FilemakerLexiconTerm[] }> => {
  const groups = new Map<FilemakerLexiconTerm['typeKey'], FilemakerLexiconTerm[]>();
  terms.forEach((term: FilemakerLexiconTerm): void => {
    const existing = groups.get(term.typeKey) ?? [];
    existing.push(term);
    groups.set(term.typeKey, existing);
  });
  return Array.from(groups.entries())
    .map(([typeKey, groupTerms]) => ({
      typeKey,
      terms: groupTerms,
    }))
    .sort((left, right): number =>
      compareFilemakerLexiconTypeKeys(left.typeKey, right.typeKey, typeMetadata)
    );
};

export const splitResponsibilityTermLabel = (label: string): string[] => {
  const normalized = label.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return [];
  const withoutHeading = normalized.replace(RESPONSIBILITY_HEADING_RE, '').trim();
  const withBreaks = withoutHeading
    .replace(RESPONSIBILITY_ITEM_START_RE, '\n$1')
    .replace(/([.!?])\s+/g, '$1\n');
  const items = withBreaks
    .split(/\n+|[;•]+/u)
    .map((item: string): string => item.trim())
    .filter((item: string): boolean => item.length > 0);
  return items.length > 0 ? items : [normalized];
};
