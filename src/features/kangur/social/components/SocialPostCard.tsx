'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Text } from '@/shared/ui/react-native-web-shim';
import { KangurInfoCard } from '@/features/kangur/ui/design/primitives';
import { formatDate, getPostTitle, getPostExcerpt } from '../utils/social-post-formatters';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';

interface SocialPostCardProps {
  post: KangurSocialPost;
}

export function SocialPostCard({ post }: SocialPostCardProps): React.JSX.Element {
  const t = useTranslations('KangurSocial');

  return (
    <KangurInfoCard padding='md' className='flex flex-col gap-2'>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {formatDate(post.createdAt)}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {getPostTitle(post)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {getPostExcerpt(post)}
      </Text>
      {post.linkedinUrl ? (
        <a
          href={post.linkedinUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='text-sm font-semibold [color:var(--kangur-page-text)] hover:underline'
        >
          {t('viewOnLinkedIn')}
        </a>
      ) : null}
    </KangurInfoCard>
  );
}
