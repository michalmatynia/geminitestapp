import { KangurSectionEyebrow } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

type KangurPanelSectionHeadingProps = React.ComponentProps<typeof KangurSectionEyebrow>;

export function KangurPanelSectionHeading({
  as = 'p',
  className,
  children,
  tone = 'muted',
  ...props
}: KangurPanelSectionHeadingProps): React.JSX.Element {
  return (
    <KangurSectionEyebrow as={as} className={cn('mb-3', className)} tone={tone} {...props}>
      {children}
    </KangurSectionEyebrow>
  );
}

export default KangurPanelSectionHeading;
