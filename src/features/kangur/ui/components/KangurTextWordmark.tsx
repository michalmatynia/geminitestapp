import { KangurWordmarkBase } from '@/features/kangur/ui/components/KangurWordmarkBase';

export type KangurTextWordmarkProps = React.SVGProps<SVGSVGElement> & {
  arcPath?: string;
  idPrefix?: string;
  label: string;
  textProps?: React.SVGProps<SVGTextElement>;
};

const KANGUR_TEXT_WORDMARK_TEXT_PROPS = {
  fontFamily:
    'var(--kangur-wordmark-font, "Baloo 2", "Averia Sans Libre", "Trebuchet MS", sans-serif)',
  fontSize: 68,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  textAnchor: 'middle',
  x: 281,
  y: 103,
} satisfies React.SVGProps<SVGTextElement>;

export function KangurTextWordmark({
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
        ...KANGUR_TEXT_WORDMARK_TEXT_PROPS,
        ...textProps,
      }}
      wordTransform='translate(108 111)'
      {...props}
    />
  );
}
