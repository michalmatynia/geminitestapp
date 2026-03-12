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

export function KangurAssignmentPriorityChip({
  accent,
  priority,
  ...props
}: KangurAssignmentPriorityChipProps): React.JSX.Element {
  return (
    <KangurStatusChip
      accent={accent ?? resolveKangurAssignmentPriorityAccent(priority)}
      {...props}
    >
      {formatKangurAssignmentPriorityLabel(priority)}
    </KangurStatusChip>
  );
}

export default KangurAssignmentPriorityChip;
