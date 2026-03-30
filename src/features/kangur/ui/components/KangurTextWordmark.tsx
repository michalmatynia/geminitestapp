import { KangurWordmarkBase } from '@/features/kangur/ui/components/KangurWordmarkBase';
import { KANGUR_WORDMARK_DEFAULT_TEXT_PROPS } from '@/features/kangur/ui/components/kangur-wordmark';

export type KangurTextWordmarkProps = React.SVGProps<SVGSVGElement> & {
  arcPath?: string;
  idPrefix?: string;
  label: string;
  textProps?: React.SVGProps<SVGTextElement>;
};

export function renderKangurTextWordmark({
  arcPath = 'M104 118C208 140 322 140 442 112',
  idPrefix = 'kangur-text-wordmark',
  label,
  textProps,
  ...props
}: KangurTextWordmarkProps): React.JSX.Element {
  return (
    <KangurWordmarkBase
      arcPath={arcPath}
      idPrefix={idPrefix}
      textLabel={label}
      textProps={{
        ...KANGUR_WORDMARK_DEFAULT_TEXT_PROPS,
        ...textProps,
      }}
      wordTransform='translate(108 111)'
      {...props}
    />
  );
}
