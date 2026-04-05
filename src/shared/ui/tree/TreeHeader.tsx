import { cn } from '@/shared/utils/ui-utils';

import { SectionHeader } from '../section-header';
import { UI_STACK_RELAXED_CLASSNAME } from '../layout';

import type { TreeHeaderProps } from '@/shared/contracts/ui/menus';

export type { TreeHeaderProps };

export function TreeHeader(props: TreeHeaderProps): React.JSX.Element {
  const { title, subtitle, actions, className, titleClassName, actionsClassName, children } = props;
  const hasTitle =
    typeof title === 'string' ? title.trim().length > 0 : title !== undefined && title !== null;

  if (!hasTitle && !subtitle) {
    return (
      <div
        className={cn(
          UI_STACK_RELAXED_CLASSNAME,
          'lg:flex-row lg:items-center lg:justify-between',
          className
        )}
      >
        {actions ? (
          <div className={cn('flex flex-wrap items-center gap-2 shrink-0', actionsClassName)}>
            {actions}
          </div>
        ) : null}
        {children ? <div className='w-full pt-4'>{children}</div> : null}
      </div>
    );
  }

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
