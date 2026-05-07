'use client';

import React from 'react';
import { Text } from '@/shared/ui/react-native-web-shim';
import { KangurInfoCard } from '@/features/kangur/ui/design/primitives';
import { formatDate, getPostTitle, getPostExcerpt } from '../utils/social-post-formatters';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

interface SocialPostCardProps {
  post: SocialPublishingPost;
}

export function SocialPostCard({ post }: SocialPostCardProps): React.JSX.Element {
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
      {post.publishedUrl ? (
        <a
          href={post.publishedUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='text-sm font-semibold [color:var(--kangur-page-text)] hover:underline'
        >
          View published post
        </a>
      ) : null}
    </KangurInfoCard>
  );
}
