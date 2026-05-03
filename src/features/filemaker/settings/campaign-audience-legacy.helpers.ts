import {
  type FilemakerAudienceCondition,
  type FilemakerAudienceConditionGroup,
  type FilemakerAudienceField,
} from '@/shared/contracts/filemaker';
import { generateAudienceEntityId } from './campaign-audience-normalization.helpers';

export type LegacyInputs = {
  organizationIds: string[];
  eventIds: string[];
  countries: string[];
  cities: string[];
};

const hasLegacyEntries = (legacy: LegacyInputs): boolean =>
  legacy.organizationIds.length > 0 ||
  legacy.eventIds.length > 0 ||
  legacy.countries.length > 0 ||
  legacy.cities.length > 0;

const buildEqualsCondition = (
  field: FilemakerAudienceField,
  value: string
): FilemakerAudienceCondition => ({
  id: generateAudienceEntityId('audience-condition'),
  type: 'condition',
  field,
  operator: 'equals',
  value,
});

const buildOrGroup = (
  children: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup>
): FilemakerAudienceConditionGroup => ({
  id: generateAudienceEntityId('audience-group'),
  type: 'group',
  combinator: 'or',
  children,
});

const foldLegacyOrganizationIds = (
  ids: string[],
  clauses: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup>
): void => {
  if (ids.length === 0) return;
  clauses.push(
    ids.length === 1 && ids[0] !== undefined
      ? buildEqualsCondition('organizationId', ids[0])
      : buildOrGroup(ids.map((value) => buildEqualsCondition('organizationId', value)))
  );
};

const foldLegacyEventIds = (
  ids: string[],
  clauses: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup>
): void => {
  if (ids.length === 0) return;
  clauses.push(
    ids.length === 1 && ids[0] !== undefined
      ? buildEqualsCondition('eventId', ids[0])
      : buildOrGroup(ids.map((value) => buildEqualsCondition('eventId', value)))
  );
};

const foldLegacyCountries = (
  countries: string[],
  clauses: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup>
): void => {
  if (countries.length === 0) return;
  const countryClauses = countries.flatMap((value) => [
    buildEqualsCondition('person.country', value),
    buildEqualsCondition('organization.country', value),
  ]);
  clauses.push(buildOrGroup(countryClauses));
};

const foldLegacyCities = (
  cities: string[],
  clauses: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup>
): void => {
  if (cities.length === 0) return;
  const cityClauses = cities.flatMap((value) => [
    buildEqualsCondition('person.city', value),
    buildEqualsCondition('organization.city', value),
  ]);
  clauses.push(buildOrGroup(cityClauses));
};

export const foldLegacyFieldsIntoConditionGroup = (
  currentGroup: FilemakerAudienceConditionGroup,
  legacy: LegacyInputs
): FilemakerAudienceConditionGroup => {
  if (!hasLegacyEntries(legacy)) return currentGroup;

  const legacyClauses: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup> = [];
  foldLegacyOrganizationIds(legacy.organizationIds, legacyClauses);
  foldLegacyEventIds(legacy.eventIds, legacyClauses);
  foldLegacyCountries(legacy.countries, legacyClauses);
  foldLegacyCities(legacy.cities, legacyClauses);

  if (currentGroup.children.length === 0 && currentGroup.combinator === 'and') {
    return { ...currentGroup, children: legacyClauses };
  }
  return {
    ...currentGroup,
    children: [...currentGroup.children, ...legacyClauses],
  };
};
