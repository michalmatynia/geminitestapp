
import { getBlockTypographyStyles } from '../theme-styles';
import { useSectionBlockData } from './SectionBlockContext';

export function FrontendTextElementSection(): React.ReactNode {
  const { settings } = useSectionBlockData();
  const text = (settings['textContent'] as string) || '';
  if (!text) return null;
  const typoStyles = getBlockTypographyStyles(settings);
  return (
    <section className='m-0 w-full p-0'>
      <p className='m-0 p-0 text-base leading-relaxed text-gray-200' style={typoStyles}>
        {text}
      </p>
    </section>
  );
}
