'use client';

import { Star, Heart, Check, ArrowRight, Circle, type LucideIcon } from 'lucide-react';
import React from 'react';

import { getBlockTypographyStyles } from '../theme-styles';
import { useRequiredBlockSettings } from './BlockContext';

export function AnnouncementBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const text = (settings['text'] as string) || '';
  const link = (settings['link'] as string) || '';
  if (!text) return null;
  const typoStyles = getBlockTypographyStyles(settings);

  if (link) {
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

export function DividerBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const style = (settings['dividerStyle'] as string) || 'solid';
  const thickness = (settings['thickness'] as number) || 1;
  const color = (settings['dividerColor'] as string) || '#4b5563';

  return (
    <hr
      className='my-2 border-0'
      style={{
        borderTopStyle: style as 'solid' | 'dashed' | 'dotted',
        borderTopWidth: `${thickness}px`,
        borderTopColor: color,
      }}
    />
  );
}

export function SocialLinksBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const platforms = (settings['platforms'] as string) || '';
  const links = platforms
    .split(',')
    .map((l: string) => l.trim())
    .filter(Boolean);

  if (links.length === 0) {
    return <p className='cms-appearance-muted-text text-sm'>Add social media URLs in settings</p>;
  }

  return (
    <div className='flex items-center gap-4'>
      {links.map((link: string, idx: number) => {
        let label = 'Link';
        try {
          label = new URL(link).hostname.replace('www.', '').split('.')[0] ?? 'Link';
        } catch {
          // keep default
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

export function IconBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const iconName = (settings['iconName'] as string) || 'Star';
  const iconSize = (settings['iconSize'] as number) || 24;
  const iconColor = (settings['iconColor'] as string) || '#ffffff';

  const IconComponent = ICON_MAP[iconName] || Circle;

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
