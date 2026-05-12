import { STORIES as STORIES_DATA } from './stories-data';

export type Story = {
  id: string;
  slug: string;
  category: string;
  title: string;
  subtitle: string;
  excerpt: string;
  readTime: string;
  date: string;
  gradient: string;
  accentColor: string;
  textColor: string;
  tags: string[];
  body: { type: 'paragraph' | 'pull-quote' | 'heading' | 'caption'; text: string }[];
  relatedSlugs: string[];
};

export const STORIES = STORIES_DATA;

export function getStory(slug: string): Story | undefined {
  return STORIES.find((s) => s.slug === slug);
}
