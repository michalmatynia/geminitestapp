'use client';

import React, { useMemo } from 'react';
import { Star, Heart, Check, ArrowRight, Circle, type LucideIcon } from 'lucide-react';

import { getBlockTypographyStyles } from '../theme-styles';
import { useRequiredBlockSettings } from './BlockContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { UI_CENTER_ROW_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

export function AnnouncementBlock(): React.JSX.Element | null {
  const settings = useRequiredBlockSettings();
  const text = typeof settings['text'] === 'string' ? settings['text'].trim() : '';
  const link = typeof settings['link'] === 'string' ? settings['link'].trim() : '';
  
  if (text === '') return null;
  
  const typoStyles = useMemo(() => getBlockTypographyStyles(settings), [settings]);

  if (link !== '') {
    return (
      <a
        href={link}
        className='text-sm font-medium text-blue-200 underline decoration-blue-400/50 hover:text-blue-100'
        style={typoStyles}
        aria-label={text}
        title={text}
      >
        {text}
      </a>
    );
  }

  return (
    <span className='text-sm text-[var(--cms-appearance-page-text)]' style={typoStyles}>
      {text}
    </span>
  );
}

export function DividerBlock(): React.JSX.Element {
  const settings = useRequiredBlockSettings();
  const style = typeof settings['dividerStyle'] === 'string' ? settings['dividerStyle'] : 'solid';
  const thickness = typeof settings['thickness'] === 'number' ? settings['thickness'] : 1;
  const color = typeof settings['dividerColor'] === 'string' ? settings['dividerColor'] : '#4b5563';

  const validStyle = (style === 'solid' || style === 'dashed' || style === 'dotted') ? style : 'solid';

  return (
    <hr
      className='my-2 border-0'
      style={{
        borderTopStyle: validStyle,
        borderTopWidth: `${thickness}px`,
        borderTopColor: color,
      }}
    />
  );
}

export function SocialLinksBlock(): React.JSX.Element {
  const settings = useRequiredBlockSettings();
  const platforms = typeof settings['platforms'] === 'string' ? settings['platforms'] : '';
  const links = useMemo(() => platforms.split(',').map((l) => l.trim()).filter((l) => l !== ''), [platforms]);

  if (links.length === 0) {
    return <p className='cms-appearance-muted-text text-sm'>Add social media URLs in settings</p>;
  }

  return (
    <div className={UI_CENTER_ROW_RELAXED_CLASSNAME}>
      {links.map((link, idx) => {
        let label = 'Link';
        try {
          label = new URL(link).hostname.replace('www.', '').split('.')[0] ?? 'Link';
        } catch (error) {
          logClientError(error);
        }
        return (
          <a
            key={idx}
            href={link}
            target='_blank'
            rel='noopener noreferrer'
            className='cms-appearance-subtle-surface cms-appearance-muted-text rounded-full border p-2 transition hover:text-[var(--cms-appearance-page-text)]'
            aria-label={`Visit ${label}`}
            title={`Visit ${label}`}
          >
            <span className='text-xs font-medium uppercase'>{label.slice(0, 2)}</span>
          </a>
        );
      })}
    </div>
  );
}

const ICON_MAP: Record<string, LucideIcon> = {
  Star,
  Heart,
  Check,
  Arrow: ArrowRight,
  Circle,
};

export function IconBlock(): React.JSX.Element {
  const settings = useRequiredBlockSettings();
  const iconName = typeof settings['iconName'] === 'string' ? settings['iconName'] : 'Star';
  const iconSize = typeof settings['iconSize'] === 'number' ? settings['iconSize'] : 24;
  const iconColor = typeof settings['iconColor'] === 'string' ? settings['iconColor'] : '#ffffff';

  const IconComponent = ICON_MAP[iconName] ?? Circle;

  return (
    <div className='flex items-center justify-center'>
      <IconComponent size={iconSize} color={iconColor} strokeWidth={2} />
    </div>
  );
}

export function VideoEmbedBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const url = (settings['url'] as string) || '';
  const aspectRatio = (settings['aspectRatio'] as string) || '16:9';
  const autoplay = (settings['autoplay'] as string) === 'yes';

  let embedUrl: string | null = null;
  if (url) {
    const ytMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/
    );
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    else {
      const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      else if (url.includes('embed') || url.includes('player')) embedUrl = url;
    }
  }

  const paddingBottom = aspectRatio === '4:3' ? '75%' : aspectRatio === '1:1' ? '100%' : '56.25%';

  const containerStyle: React.CSSProperties = {
    paddingBottom,
  };

  if (!embedUrl) {
    return (
      <div
        className='cms-media cms-appearance-subtle-surface cms-appearance-muted-text flex items-center justify-center py-8 text-sm'
        style={containerStyle}
      >
        Enter a video URL
      </div>
    );
  }

  return (
    <div className='cms-media relative w-full' style={containerStyle}>
      <iframe
        className='absolute inset-0 h-full w-full'
        src={`${embedUrl}${autoplay ? '?autoplay=1&mute=1' : ''}`}
        title='Embedded video'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
      />
    </div>
  );
}
