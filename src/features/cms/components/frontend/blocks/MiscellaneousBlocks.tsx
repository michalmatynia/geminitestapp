'use client';

import React, { useMemo } from 'react';
import { Star, Heart, Check, ArrowRight, Circle, type LucideIcon } from 'lucide-react';

import { getBlockTypographyStyles } from '../theme-styles';
import { useRequiredBlockSettings } from './BlockContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { UI_CENTER_ROW_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

export function AnnouncementBlock(): React.JSX.Element | null {
  const settings = useRequiredBlockSettings();
  const text = (settings['text'] as string) || '';
  const link = (settings['link'] as string) || '';
  
  if (text.trim() === '') return null;
  
  const typoStyles = useMemo(() => getBlockTypographyStyles(settings), [settings]);

  if (link.trim() !== '') {
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
  const style = (settings['dividerStyle'] as string) || 'solid';
  const thickness = (settings['thickness'] as number) || 1;
  const color = (settings['dividerColor'] as string) || '#4b5563';

  return (
    <hr
      className='my-2 border-0'
      style={{
        borderTopStyle: (style === 'solid' || style === 'dashed' || style === 'dotted') ? style : 'solid',
        borderTopWidth: `${thickness}px`,
        borderTopColor: color,
      }}
    />
  );
}

export function SocialLinksBlock(): React.JSX.Element {
  const settings = useRequiredBlockSettings();
  const platforms = (settings['platforms'] as string) || '';
  const links = useMemo(() => platforms.split(',').map((l) => l.trim()).filter(Boolean), [platforms]);

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
  const iconName = (settings['iconName'] as string) || 'Star';
  const iconSize = (settings['iconSize'] as number) || 24;
  const iconColor = (settings['iconColor'] as string) || '#ffffff';

  const IconComponent = ICON_MAP[iconName] ?? Circle;

  return (
    <div className='flex items-center justify-center'>
      <IconComponent size={iconSize} color={iconColor} strokeWidth={2} />
    </div>
  );
}
