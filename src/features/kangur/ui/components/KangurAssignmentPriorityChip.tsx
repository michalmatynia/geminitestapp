import type { ComponentProps } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { KangurAssignmentSnapshot } from '@kangur/platform';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import {
  formatKangurAssignmentPriorityLabel,
  resolveKangurAssignmentPriorityAccent,
} from '@/features/kangur/ui/services/delegated-assignments';

type KangurAssignmentPriorityChipProps = Omit<
  ComponentProps<typeof KangurStatusChip>,
  'children'
> & {
  labelOverride?: string;
  priority: KangurAssignmentSnapshot['priority'];
};

export function KangurAssignmentPriorityChip(
  props: KangurAssignmentPriorityChipProps
): React.JSX.Element {
  const locale = useLocale();
  const runtimeTranslations = useTranslations('KangurAssignmentsRuntime');
  const { accent, labelOverride, priority, ...restProps } = props;

  return (
    <KangurStatusChip
      accent={accent ?? resolveKangurAssignmentPriorityAccent(priority)}
      {...restProps}
    >
      {labelOverride ??
        formatKangurAssignmentPriorityLabel(priority, {
          locale,
          translate: runtimeTranslations,
        })}
    </KangurStatusChip>
  );
}

export default KangurAssignmentPriorityChip;
