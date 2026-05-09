/**
 * Social Post Formatters
 * 
 * Utility functions for formatting social media posts and content.
 * Provides:
 * - Date formatting for social posts
 * - Bilingual title extraction
 * - Content formatting and display
 * - Social media platform integration
 * - Post metadata processing
 */

import { SOCIAL_PUBLISHING_BILINGUAL_SEPARATOR, type SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

/** Formats a date string for display in social posts */
export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/** Extracts the best available title from a bilingual social post */
export const getPostTitle = (post: SocialPublishingPost): string =>
  post.titlePl.trim() || post.titleEn.trim() || 'New social publishing update';

export const resolvePostSections = (post: SocialPublishingPost): Array<{ label?: string; body: string }> => {
  const pl = post.bodyPl.trim();
  const en = post.bodyEn.trim();
  if (pl || en) {
    return [
      ...(pl ? [{ label: 'PL', body: pl }] : []),
      ...(en ? [{ label: 'EN', body: en }] : []),
    ];
  }

  const combined = post.combinedBody.trim();
  if (!combined) return [];
  const split = combined
    .split(SOCIAL_PUBLISHING_BILINGUAL_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);
  if (split.length <= 1) return [{ body: combined }];
  return split.map((body, index) => ({
    label: split.length === 2 ? (index === 0 ? 'PL' : 'EN') : `Part ${index + 1}`,
    body,
  }));
};

export const getPostExcerpt = (post: SocialPublishingPost): string => {
  const sections = resolvePostSections(post);
  const combined = sections.map((section) => section.body.trim()).filter(Boolean).join(' ');
  if (!combined) return 'Latest product updates from Social Publishing.';
  return combined.length > 180 ? `${combined.slice(0, 177).trimEnd()}...` : combined;
};
