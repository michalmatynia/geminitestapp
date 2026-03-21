import React, { type ReactNode } from 'react';

import { InsetPanel } from './InsetPanel';

interface DocumentationSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function DocumentationSection({
  title,
  children,
  className,
}: DocumentationSectionProps): React.JSX.Element {
  return (
    <InsetPanel padding='lg' className={className}>
      <h3 className='text-base font-semibold text-white'>{title}</h3>
      <div className='mt-3 text-gray-400'>{children}</div>
    </InsetPanel>
  );
}
