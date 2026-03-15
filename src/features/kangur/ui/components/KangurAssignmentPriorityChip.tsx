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
  priority: KangurAssignmentSnapshot['priority'];
};

export function KangurAssignmentPriorityChip(
  props: KangurAssignmentPriorityChipProps
): React.JSX.Element {
  const { accent, priority, ...restProps } = props;

  return (
    <KangurStatusChip
      accent={accent ?? resolveKangurAssignmentPriorityAccent(priority)}
      {...restProps}
    >
      {formatKangurAssignmentPriorityLabel(priority)}
    </KangurStatusChip>
  );
}

export default KangurAssignmentPriorityChip;
