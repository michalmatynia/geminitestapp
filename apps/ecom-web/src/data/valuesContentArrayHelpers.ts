import { isValuesRecord, readValuesString, TEXT_LIMITS } from './valuesContentHelpers';
import type {
  ValuesCommitmentContent,
  ValuesMaterialContent,
  ValuesStatContent,
} from './valuesContent';

export function readStats(
  source: Record<string, unknown>,
  key: string,
  fallback: ValuesStatContent[],
  errors: string[],
): ValuesStatContent[] {
  const value = source[key];
  if (value === null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('values.stats must be a list.');
    return fallback;
  }

  const stats: ValuesStatContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackStat = fallback[index] ?? fallback[0];
    if (!isValuesRecord(item)) {
      errors.push('values.stats items must be objects.');
      return fallback;
    }
    stats.push({
      value: readValuesString({
        source: item,
        key: 'value',
        fallback: fallbackStat.value,
        maxLength: TEXT_LIMITS.short,
        errors,
        path: `values.stats.${index}.value`,
      }),
      label: readValuesString({
        source: item,
        key: 'label',
        fallback: fallbackStat.label,
        maxLength: TEXT_LIMITS.short,
        errors,
        path: `values.stats.${index}.label`,
      }),
    });
  }

  if (stats.length > 8) {
    errors.push('values.stats can contain at most 8 items.');
    return fallback;
  }

  return stats.length > 0 ? stats : fallback;
}

export function readMaterials(
  source: Record<string, unknown>,
  key: string,
  fallback: ValuesMaterialContent[],
  errors: string[],
): ValuesMaterialContent[] {
  const value = source[key];
  if (value === null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('values.materials must be a list.');
    return fallback;
  }

  const materials: ValuesMaterialContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackMaterial = fallback[index] ?? fallback[0];
    if (!isValuesRecord(item)) {
      errors.push('values.materials items must be objects.');
      return fallback;
    }
    materials.push({
      name: readValuesString({
        source: item,
        key: 'name',
        fallback: fallbackMaterial.name,
        maxLength: TEXT_LIMITS.short,
        errors,
        path: `values.materials.${index}.name`,
      }),
      origin: readValuesString({
        source: item,
        key: 'origin',
        fallback: fallbackMaterial.origin,
        maxLength: TEXT_LIMITS.short,
        errors,
        path: `values.materials.${index}.origin`,
      }),
      desc: readValuesString({
        source: item,
        key: 'desc',
        fallback: fallbackMaterial.desc,
        maxLength: TEXT_LIMITS.long,
        errors,
        path: `values.materials.${index}.desc`,
      }),
    });
  }

  if (materials.length > 12) {
    errors.push('values.materials can contain at most 12 items.');
    return fallback;
  }

  return materials.length > 0 ? materials : fallback;
}

export function readCommitments(
  source: Record<string, unknown>,
  key: string,
  fallback: ValuesCommitmentContent[],
  errors: string[],
): ValuesCommitmentContent[] {
  const value = source[key];
  if (value === null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('values.commitments must be a list.');
    return fallback;
  }

  const commitments: ValuesCommitmentContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackCommitment = fallback[index] ?? fallback[0];
    if (!isValuesRecord(item)) {
      errors.push('values.commitments items must be objects.');
      return fallback;
    }
    commitments.push({
      title: readValuesString({
        source: item,
        key: 'title',
        fallback: fallbackCommitment.title,
        maxLength: TEXT_LIMITS.short,
        errors,
        path: `values.commitments.${index}.title`,
      }),
      body: readValuesString({
        source: item,
        key: 'body',
        fallback: fallbackCommitment.body,
        maxLength: TEXT_LIMITS.long,
        errors,
        path: `values.commitments.${index}.body`,
      }),
    });
  }

  if (commitments.length > 12) {
    errors.push('values.commitments can contain at most 12 items.');
    return fallback;
  }

  return commitments.length > 0 ? commitments : fallback;
}
