import { KANGUR_SOCIAL_BILINGUAL_SEPARATOR, type KangurSocialPost } from '@/shared/contracts/kangur-social-posts';

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

export const getPostTitle = (post: KangurSocialPost): string =>
  post.titlePl.trim() || post.titleEn.trim() || 'New Kangur update';

export const resolvePostSections = (post: KangurSocialPost): Array<{ label?: string; body: string }> => {
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
    .split(KANGUR_SOCIAL_BILINGUAL_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);
  if (split.length <= 1) return [{ body: combined }];
  return split.map((body, index) => ({
    label: split.length === 2 ? (index === 0 ? 'PL' : 'EN') : `Part ${index + 1}`,
    body,
  }));
};

export const getPostExcerpt = (post: KangurSocialPost): string => {
  const sections = resolvePostSections(post);
  const combined = sections.map((section) => section.body.trim()).filter(Boolean).join(' ');
  if (!combined) return 'Latest product updates from Kangur and StudiQ.';
  return combined.length > 180 ? `${combined.slice(0, 177).trimEnd()}...` : combined;
};
