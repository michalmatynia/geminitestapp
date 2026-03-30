'use client';

import { useEffect } from 'react';

import { resolveKangurSubjectForAgeGroup } from '@/features/kangur/lessons/lesson-catalog-metadata';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';

export function KangurSubjectAgeGroupSync(): null {
  const { ageGroup } = useKangurAgeGroupFocus();
  const { subject, setSubject } = useKangurSubjectFocus();

  useEffect(() => {
    const nextSubject = resolveKangurSubjectForAgeGroup(subject, ageGroup);
    if (nextSubject !== subject) {
      setSubject(nextSubject);
    }
  }, [ageGroup, setSubject, subject]);

  return null;
}
