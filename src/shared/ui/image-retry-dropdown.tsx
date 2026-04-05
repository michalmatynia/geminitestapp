import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface ImageRetryDropdownProps {
  presets: ImageRetryPreset[];
  onRetry: (preset: ImageRetryPreset) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}

export function ImageRetryDropdown(props: ImageRetryDropdownProps) {
  const {
    presets,
    onRetry,
    disabled = false,
    className,
    buttonClassName = 'bg-red-500/20 text-red-100 hover:bg-red-500/30',
  } = props;

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='secondary' size='sm' className={buttonClassName} disabled={disabled}>
            Retry image export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='bg-card border-border'>
          {presets.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onSelect={() => onRetry(preset)}
              className='text-gray-200 focus:bg-gray-800/70'
            >
              <div className='flex flex-col'>
                <span className='text-sm'>{preset.label}</span>
                <span className='text-xs text-gray-400'>{preset.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
