import { getBlockTypographyStyles } from '../theme-styles';
import { useSectionBlockData } from './SectionBlockContext';

import type { BlockInstance } from '../../../types/page-builder';

export function FrontendTextAtomSection(): React.ReactNode {
  const { settings, blocks } = useSectionBlockData();
  const text = (settings['text'] as string) || '';
  const alignment = (settings['alignment'] as string) || 'left';
  const letterGap = (settings['letterGap'] as number) || 0;
  const lineGap = (settings['lineGap'] as number) || 0;
  const wrap = (settings['wrap'] as string) || 'wrap';
  const letters = blocks.length
    ? blocks
    : Array.from(text).map(
        (char: string, index: number): BlockInstance => ({
          id: `text-atom-section-${index}`,
          type: 'TextAtomLetter',
          settings: { textContent: char },
        })
      );

  if (!letters.length) return null;

  const justifyContent =
    alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: wrap === 'nowrap' ? 'nowrap' : 'wrap',
    justifyContent,
    alignItems: 'baseline',
    columnGap: letterGap,
    rowGap: lineGap,
    whiteSpace: wrap === 'nowrap' ? 'pre' : 'pre-wrap',
  };

  return (
    <section className='m-0 w-full p-0'>
      <div style={containerStyle}>
        {letters.map((letter: BlockInstance) => {
          const textContent = (letter.settings['textContent'] as string) ?? '';
          const typoStyles = getBlockTypographyStyles(letter.settings);
          return (
            <span
              key={letter.id}
              className='inline-block'
              style={{ ...typoStyles, whiteSpace: 'pre' }}
            >
              {textContent}
            </span>
          );
        })}
      </div>
    </section>
  );
}
