import { getBlockTypographyStyles } from '../frontend/theme-styles';

export function HeadingBlock({ settings }: { settings: Record<string, unknown> }) {
  const text = (settings['headingText'] as string) || 'Heading';
  const typoStyles = getBlockTypographyStyles(settings);
  
  return (
    <h2 className='text-2xl font-bold leading-tight tracking-tight md:text-3xl text-gray-200' style={typoStyles}>
      {text}
    </h2>
  );
}
