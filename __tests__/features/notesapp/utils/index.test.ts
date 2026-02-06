import { describe, it, expect } from 'vitest';

import {
  getCategoryIdsWithDescendants,
  buildBreadcrumbPath,
  renderMarkdownToHtml,
} from '@/features/notesapp/utils';

describe('notesapp utils', () => {
  const mockCategories: any[] = [
    {
      id: 'root',
      name: 'Root',
      children: [
        {
          id: 'child-1',
          name: 'Child 1',
          children: [{ id: 'grandchild-1', name: 'Grandchild 1' }],
        },
        { id: 'child-2', name: 'Child 2' },
      ],
    },
  ];

  describe('getCategoryIdsWithDescendants', () => {
    it('should return all descendant IDs including self', () => {
      const ids = getCategoryIdsWithDescendants('child-1', mockCategories);
      expect(ids).toEqual(['child-1', 'grandchild-1']);
    });

    it('should return empty array if category not found', () => {
      const ids = getCategoryIdsWithDescendants('non-existent', mockCategories);
      expect(ids).toEqual([]);
    });
  });

  describe('buildBreadcrumbPath', () => {
    it('should build path for a category', () => {
      const path = buildBreadcrumbPath('grandchild-1', null, mockCategories);
      expect(path).toHaveLength(3);
      expect(path[0]!.name).toBe('Root');
      expect(path[1]!.name).toBe('Child 1');
      expect(path[2]!.name).toBe('Grandchild 1');
    });

    it('should include note title at the end', () => {
      const path = buildBreadcrumbPath('child-2', 'My Note', mockCategories);
      expect(path).toHaveLength(3);
      expect(path[2]!.name).toBe('My Note');
      expect(path[2]!.isNote).toBe(true);
    });
  });

  describe('renderMarkdownToHtml', () => {
    it('should render headings', () => {
      const html = renderMarkdownToHtml('# Heading 1\n## Heading 2');
      expect(html).toContain('<h1>Heading 1</h1>');
      expect(html).toContain('<h2>Heading 2</h2>');
    });

    it('should render strong and emphasis', () => {
      const html = renderMarkdownToHtml('**bold** and *italic*');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
    });

    it('should render lists', () => {
      const html = renderMarkdownToHtml('- Item 1\n- Item 2');
      expect(html).toContain('<ul><li>Item 1</li><li>Item 2</li></ul>');
    });

    it('should render checkboxes', () => {
      const html = renderMarkdownToHtml('- (x) Done\n- ( ) Todo');
      expect(html).toContain('<input type="checkbox" disabled checked />');
      expect(html).toContain('<input type="checkbox" disabled  />');
    });

    it('should render code blocks', () => {
      const html = renderMarkdownToHtml('```js\nconst x = 1;\n```');
      expect(html).toContain('<pre');
      expect(html).toContain('const');
      expect(html).toContain('1');
    });
  });
});
