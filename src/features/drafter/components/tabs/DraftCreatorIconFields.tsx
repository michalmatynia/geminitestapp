import type React from 'react';

import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { FormField, Input, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Button, Card } from '@/shared/ui/primitives.public';

import { DEFAULT_ICON_COLOR, ICON_COLOR_MODE_OPTIONS } from '../../constants';

type IconColorMode = 'theme' | 'custom';

const normalizeIconColor = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
  if (HEX_PATTERN.test(trimmed) === false) return null;
  return trimmed.toLowerCase();
};

function IconPreview(props: {
  icon: string | null;
  iconColorMode: IconColorMode;
  resolvedIconColor: string;
}): React.JSX.Element {
  const SelectedIcon =
    props.icon !== null && props.icon.length > 0 ? ICON_LIBRARY_MAP[props.icon] ?? null : null;

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-gray-800 ${
        props.iconColorMode === 'custom' ? '' : 'text-gray-200'
      }`}
      style={props.iconColorMode === 'custom' ? { color: props.resolvedIconColor } : undefined}
    >
      {SelectedIcon !== null ? (
        <SelectedIcon className='h-4 w-4' />
      ) : (
        <span className='text-xs text-gray-500'>None</span>
      )}
    </div>
  );
}

function IconButtons(props: {
  icon: string | null;
  setIcon: (next: string | null) => void;
  openIconLibrary: () => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <Button type='button' variant='outline' onClick={props.openIconLibrary}>
        Choose Icon
      </Button>
      {props.icon !== null && props.icon.length > 0 ? (
        <Button type='button' variant='ghost' onClick={(): void => props.setIcon(null)}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}

function IconColorControls(props: {
  iconColorMode: IconColorMode;
  setIconColorMode: (next: IconColorMode) => void;
  iconColor: string;
  setIconColor: (next: string) => void;
  resolvedIconColor: string;
}): React.JSX.Element {
  return (
    <div className='grid grid-cols-1 gap-3 md:grid-cols-[12rem_minmax(0,1fr)] mt-3'>
      <FormField label='Icon Color' id='iconColorMode'>
        <SelectSimple
          size='sm'
          options={ICON_COLOR_MODE_OPTIONS}
          value={props.iconColorMode}
          onValueChange={(value: string): void =>
            props.setIconColorMode(value === 'custom' ? 'custom' : 'theme')
          }
          placeholder='Select color mode'
          ariaLabel='Select color mode'
          title='Select color mode'
        />
      </FormField>
      {props.iconColorMode === 'custom' ? <CustomIconColorFields {...props} /> : null}
    </div>
  );
}

function CustomIconColorFields(props: {
  iconColor: string;
  setIconColor: (next: string) => void;
  resolvedIconColor: string;
}): React.JSX.Element {
  return (
    <FormField label='Custom Icon Color' id='iconColor'>
      <div className='flex items-center gap-2'>
        <Input
          id='iconColorPicker'
          type='color'
          value={props.resolvedIconColor}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            props.setIconColor(event.target.value)
          }
          className='h-10 w-14 cursor-pointer p-1'
          aria-label='Pick icon color'
          title='Custom Icon Color'
        />
        <Input
          id='iconColor'
          value={props.iconColor}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            props.setIconColor(event.target.value)
          }
          onBlur={(): void =>
            props.setIconColor(normalizeIconColor(props.iconColor) ?? DEFAULT_ICON_COLOR)
          }
          placeholder='#60a5fa'
          className='font-mono uppercase'
          aria-label='#60a5fa'
          title='#60a5fa'
        />
      </div>
    </FormField>
  );
}

export function IconPickerField(props: {
  icon: string | null;
  setIcon: (next: string | null) => void;
  iconColorMode: IconColorMode;
  setIconColorMode: (next: IconColorMode) => void;
  iconColor: string;
  setIconColor: (next: string) => void;
  resolvedIconColor: string;
  openIconLibrary: () => void;
}): React.JSX.Element {
  return (
    <FormField label='Icon' description='Icons are shown only after you click Choose Icon.'>
      <Card
        variant='subtle-compact'
        padding='sm'
        className={`${UI_CENTER_ROW_SPACED_CLASSNAME} border-border bg-card/40`}
      >
        <IconPreview
          icon={props.icon}
          iconColorMode={props.iconColorMode}
          resolvedIconColor={props.resolvedIconColor}
        />
        <IconButtons
          icon={props.icon}
          setIcon={props.setIcon}
          openIconLibrary={props.openIconLibrary}
        />
      </Card>
      <IconColorControls
        iconColorMode={props.iconColorMode}
        setIconColorMode={props.setIconColorMode}
        iconColor={props.iconColor}
        setIconColor={props.setIconColor}
        resolvedIconColor={props.resolvedIconColor}
      />
    </FormField>
  );
}
