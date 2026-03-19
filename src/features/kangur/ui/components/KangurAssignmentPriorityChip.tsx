import type { ComponentProps } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
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
  const { accent, labelOverride, priority, ...restProps } = props;

  return (
    <KangurStatusChip
      accent={accent ?? resolveKangurAssignmentPriorityAccent(priority)}
      {...restProps}
    >
      {labelOverride ?? formatKangurAssignmentPriorityLabel(priority)}
    </KangurStatusChip>
  );
}

export default KangurAssignmentPriorityChip;
