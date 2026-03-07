import { describe, expect, it } from 'vitest';

import { buildAdminNav } from '@/features/admin/components/admin-menu-nav';
import type { NavItem } from '@/features/admin/components/Menu';

const flattenNav = (items: NavItem[]): NavItem[] => {
  const flattened: NavItem[] = [];
  const visit = (node: NavItem): void => {
    flattened.push(node);
    (node.children ?? []).forEach(visit);
  };
  items.forEach(visit);
  return flattened;
};

describe('buildAdminNav', () => {
  it('includes Brain as a primary AI entry and keeps existing AI links intact', () => {
    const nav = buildAdminNav({
      onOpenChat: () => {},
      onCreatePageClick: () => {},
    });

    const topLevelBrain = nav.find((item) => item.id === 'brain');
    expect(topLevelBrain).toBeDefined();
    expect(topLevelBrain?.href).toBe('/admin/brain?tab=operations');

    const flattened = flattenNav(nav);

    const kangurRoot = flattened.find((item) => item.id === 'workspace/kangur');
    expect(kangurRoot?.href).toBe('/admin/kangur');

    const kangurLessonsManager = flattened.find(
      (item) => item.id === 'workspace/kangur/lessons-manager'
    );
    expect(kangurLessonsManager?.href).toBe('/admin/kangur/lessons-manager');

    const kangurSettings = flattened.find((item) => item.id === 'workspace/kangur/settings');
    expect(kangurSettings?.href).toBe('/admin/kangur/settings');

    const aiRoot = flattened.find((item) => item.id === 'ai');
    expect(aiRoot?.href).toBe('/admin/ai-paths');

    const aiPaths = flattened.find((item) => item.id === 'ai/ai-paths');
    expect(aiPaths?.href).toBe('/admin/ai-paths');

    const aiChatbot = flattened.find((item) => item.id === 'ai/chatbot');
    expect(aiChatbot?.href).toBe('/admin/chatbot');

    const aiImageStudio = flattened.find((item) => item.id === 'ai/image-studio');
    expect(aiImageStudio?.href).toBe('/admin/image-studio');
  });
});
