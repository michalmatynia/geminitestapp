export type KangurLocalizedWordmarkProps = React.SVGProps<SVGSVGElement> & {
  idPrefix?: string;
  label?: string;
  locale?: string | null;
};

export const KANGUR_WORDMARK_DEFAULT_TEXT_PROPS = {
  fontFamily:
    'var(--kangur-wordmark-font, "Baloo 2", "Averia Sans Libre", "Trebuchet MS", sans-serif)',
  fontSize: 68,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  textAnchor: 'middle',
  x: 281,
  y: 103,
} satisfies React.SVGProps<SVGTextElement>;
