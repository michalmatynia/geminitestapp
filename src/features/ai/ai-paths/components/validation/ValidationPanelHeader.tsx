import React from 'react';

type ValidationPanelHeaderProps = {
  title: string;
  trailing?: React.ReactNode;
};

export function ValidationPanelHeader({
  title,
  trailing,
}: ValidationPanelHeaderProps): React.JSX.Element {
  return (
    <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
      <h3 className='text-sm font-semibold text-white'>{title}</h3>
      {trailing}
    </div>
  );
}
