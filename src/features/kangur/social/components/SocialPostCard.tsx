import React from 'react';
import { View, Text } from 'react-native';
import { Card, KangurMobileLinkButton as LinkButton } from '@/features/kangur/ui/components';
import { formatDate, getPostTitle, getPostExcerpt } from '../utils/social-post-formatters';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';

interface SocialPostCardProps {
  post: KangurSocialPost;
  copy: (v: Record<string, string>) => string;
}

export function SocialPostCard({ post, copy }: SocialPostCardProps): React.JSX.Element {
  return (
    <Card>
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
        <LinkButton
          href={post.linkedinUrl}
          label={copy({ de: 'Auf LinkedIn ansehen', en: 'View on LinkedIn', pl: 'Zobacz na LinkedIn' })}
        />
      ) : null}
    </Card>
  );
}
