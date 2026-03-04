import { SectionHeader } from '../section-header';

import type { ReactNode } from 'react';

export type TreeHeaderProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  actionsClassName?: string;
  children?: ReactNode;
};

export function TreeHeader(props: TreeHeaderProps): React.JSX.Element {
  const { title, subtitle, actions, className, titleClassName, actionsClassName, children } = props;

  return (
    <SectionHeader
      title={title ?? ''}
      subtitle={subtitle}
      size='xxs'
      actions={actions}
      className={className}
      titleClassName={titleClassName}
      actionsClassName={actionsClassName}
    >
      {children}
    </SectionHeader>
  );
}
