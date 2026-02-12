'use client';

import { StatusToggle } from '@/shared/ui';

type ToggleButtonProps = {
  enabled: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function ToggleButton({
  enabled,
  disabled,
  onClick,
}: ToggleButtonProps): React.JSX.Element {
  return (
    <StatusToggle
      enabled={enabled}
      disabled={disabled}
      onToggle={onClick}
    />
  );
}
