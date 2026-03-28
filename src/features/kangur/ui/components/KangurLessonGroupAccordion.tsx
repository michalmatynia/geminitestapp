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

export function KangurLessonGroupAccordion(
  props: KangurLessonGroupAccordionProps
): React.JSX.Element {
  const { isCoarsePointer: isCoarsePointerOverride, ...restProps } = props;
  const isCoarsePointer = isCoarsePointerOverride ?? useKangurCoarsePointer();

  return (
    <KangurResolvedLessonGroupAccordion
      {...restProps}
      isCoarsePointer={Boolean(isCoarsePointer)}
    />
  );
}
