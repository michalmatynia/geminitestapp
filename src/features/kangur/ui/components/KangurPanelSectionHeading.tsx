import { KangurSectionEyebrow } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

type KangurPanelSectionHeadingProps = React.ComponentProps<typeof KangurSectionEyebrow>;

export function KangurPanelSectionHeading(
  props: KangurPanelSectionHeadingProps
): React.JSX.Element {
  const { as = 'p', className, children, tone = 'muted', ...restProps } = props;

  return (
    <KangurSectionEyebrow
      as={as}
      className={cn('mb-3', className)}
      tone={tone}
      {...restProps}
    >
      {children}
    </KangurSectionEyebrow>
  );
}

export default KangurPanelSectionHeading;
