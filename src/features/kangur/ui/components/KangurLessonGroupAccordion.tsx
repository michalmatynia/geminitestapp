'use client';

import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  KangurResolvedLessonGroupAccordion,
  type KangurResolvedLessonGroupAccordionProps,
} from './KangurResolvedLessonGroupAccordion';

export type KangurLessonGroupAccordionProps = Omit<
  KangurResolvedLessonGroupAccordionProps,
  'isCoarsePointer'
> & {
  isCoarsePointer?: boolean;
};

export function KangurLessonGroupAccordion({
  isCoarsePointer: isCoarsePointerOverride,
  ...props
}: KangurLessonGroupAccordionProps): React.JSX.Element {
  const isCoarsePointer = isCoarsePointerOverride ?? useKangurCoarsePointer();

  return (
    <KangurResolvedLessonGroupAccordion
      {...props}
      isCoarsePointer={Boolean(isCoarsePointer)}
    />
  );
}
