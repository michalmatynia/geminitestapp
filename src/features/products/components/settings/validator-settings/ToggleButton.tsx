'use client';

import { Button } from '@/shared/ui';

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
    <Button
      type='button'
      disabled={disabled}
      onClick={onClick}
      className={`rounded border px-3 py-1 text-xs ${
        enabled
          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
          : 'border-red-500/60 bg-red-500/15 text-red-200 hover:bg-red-500/25'
      }`}
    >
      {enabled ? 'ON' : 'OFF'}
    </Button>
  );
}
