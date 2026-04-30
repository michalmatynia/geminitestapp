'use client';

import { useEffect, useMemo, useRef } from 'react';

import { toComparableString } from './useProductValidatorIssues.helpers';
import type { ProductValidatorTimestampRef } from './useProductValidatorIssues.types';

type UseProductValidatorFieldEditTimestampsOptions = {
  trackedFields?: string[];
  values: Record<string, unknown>;
};

const useTrackedFieldList = ({
  trackedFields,
  values,
}: UseProductValidatorFieldEditTimestampsOptions): string[] =>
  useMemo((): string[] => {
    if (trackedFields !== undefined && trackedFields.length > 0) return trackedFields;
    return Object.keys(values);
  }, [trackedFields, values]);

export const useProductValidatorFieldEditTimestamps = ({
  trackedFields,
  values,
}: UseProductValidatorFieldEditTimestampsOptions): ProductValidatorTimestampRef => {
  const previousFieldValuesRef = useRef<Record<string, string>>({});
  const fieldEditTimestampsRef = useRef<Record<string, number>>({});
  const trackedFieldList = useTrackedFieldList({ trackedFields, values });

  useEffect(() => {
    const now = Date.now();
    for (const fieldName of trackedFieldList) {
      const normalizedValue = toComparableString(values[fieldName]);
      if (!(fieldName in previousFieldValuesRef.current)) {
        previousFieldValuesRef.current[fieldName] = normalizedValue;
        continue;
      }
      if (previousFieldValuesRef.current[fieldName] === normalizedValue) continue;
      previousFieldValuesRef.current[fieldName] = normalizedValue;
      fieldEditTimestampsRef.current[fieldName] = now;
    }
  }, [trackedFieldList, values]);

  return fieldEditTimestampsRef;
};
