import type { AppEmbedIdDto } from '@/shared/contracts/app-embeds';
import { APP_EMBED_SETTING_KEY as SETTING_KEY } from '@/shared/contracts/app-embeds';

export type AppEmbedId = AppEmbedIdDto;

export const APP_EMBED_SETTING_KEY = SETTING_KEY;

export const APP_EMBED_OPTIONS: Array<{
  id: AppEmbedId;
  label: string;
  description: string;
  settingsRoute: string;
}> = [
  {
    id: 'chatbot',
    label: 'Chatbot',
    description: 'Embed the admin chatbot experience on CMS pages.',
    settingsRoute: '/admin/chatbot',
  },
  {
    id: 'ai-paths',
    label: 'AI Paths',
    description: 'Surface AI Path runs and outputs inside CMS layouts.',
    settingsRoute: '/admin/ai-paths',
  },
  {
    id: 'notes',
    label: 'Notes',
    description: 'Show notes lists or pinned notes in a page section.',
    settingsRoute: '/admin/notes',
  },
  {
    id: 'products',
    label: 'Products',
    description: 'Embed product listings or featured product widgets.',
    settingsRoute: '/admin/products',
  },
];
