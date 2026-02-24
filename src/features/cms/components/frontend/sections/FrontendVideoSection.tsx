'use client';


import { useCmsPageContext } from '../CmsPageContext';
import { useMediaStyles } from '../media-styles-context';
import { useSectionBlockData } from './SectionBlockContext';
import { getSectionContainerClass, getSectionStyles } from '../theme-styles';

function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  // Already an embed URL or other
  if (url.includes('embed') || url.includes('player')) return url;

  return null;
}

function getAspectPadding(ratio: string): string {
  switch (ratio) {
    case '4:3':
      return '75%';
    case '1:1':
      return '100%';
    default:
      return '56.25%'; // 16:9
  }
}

export function FrontendVideoSection(): React.ReactNode {
  const { settings } = useSectionBlockData();
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const videoUrl = (settings['videoUrl'] as string) || '';
  const aspectRatio = (settings['aspectRatio'] as string) || '16:9';
  const autoplay = (settings['autoplay'] as string) === 'yes';
  const mediaStyles = useMediaStyles();

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <section style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: 'max-w-4xl' })}>
        {embedUrl ? (
          <div
            className='cms-media relative w-full'
            style={{ paddingBottom: getAspectPadding(aspectRatio), ...(mediaStyles ?? {}) }}
          >
            <iframe
              className='absolute inset-0 h-full w-full'
              src={`${embedUrl}${autoplay ? '?autoplay=1&mute=1' : ''}`}
              title='Embedded video'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
              allowFullScreen
            />
          </div>
        ) : (
          <div
            className='cms-media flex items-center justify-center bg-gray-800/50'
            style={{ paddingBottom: getAspectPadding(aspectRatio), position: 'relative', ...(mediaStyles ?? {}) }}
          >
            <p className='absolute inset-0 flex items-center justify-center text-gray-500'>
              Enter a video URL in section settings
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
