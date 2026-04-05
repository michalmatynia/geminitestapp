import React from 'react';

import { Label, Textarea } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

interface StudioPromptTextSectionProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  containerClassName?: string;
  labelClassName?: string;
  textareaClassName?: string;
  textareaSize?: 'default' | 'sm' | 'xs';
}

export function StudioPromptTextSection(props: StudioPromptTextSectionProps): React.JSX.Element {
  const {
    label,
    value,
    onValueChange,
    placeholder,
    containerClassName,
    labelClassName,
    textareaClassName,
    textareaSize = 'default',
  } = props;

  return (
    <div className={cn('space-y-2', containerClassName)}>
      <Label className={cn('text-xs text-gray-400', labelClassName)}>{label}</Label>
      <Textarea
        size={textareaSize}
        value={value}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
          onValueChange(event.target.value)
        }
        className={cn('font-mono text-[11px]', textareaClassName)}
        placeholder={placeholder}
       aria-label={placeholder} title={placeholder}/>
    </div>
  );
}
