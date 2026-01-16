import type { CategoryWithChildren } from "@/types/notes";

export const darkenColor = (hex: string, percent: number): string => {
  const normalized = hex.replace("#", "");
  const num = parseInt(normalized, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, (num >> 16) - amt);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const b = Math.max(0, (num & 0x0000ff) - amt);
  return `#${(0x1000000 + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`;
};

export const getCategoryIdsWithDescendants = (
  targetId: string,
  categories: CategoryWithChildren[]
): string[] => {
  const collectAllDescendantIds = (node: CategoryWithChildren): string[] => {
    const ids = [node.id];
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        ids.push(...collectAllDescendantIds(child));
      }
    }
    return ids;
  };

  const findCategory = (
    cats: CategoryWithChildren[]
  ): CategoryWithChildren | null => {
    for (const cat of cats) {
      if (cat.id === targetId) {
        return cat;
      }
      if (cat.children && cat.children.length > 0) {
        const found = findCategory(cat.children);
        if (found) return found;
      }
    }
    return null;
  };

  const targetCategory = findCategory(categories);
  if (!targetCategory) {
    return [];
  }

  return collectAllDescendantIds(targetCategory);
};

export const buildBreadcrumbPath = (
  categoryId: string | null,
  noteTitle: string | null,
  categories: CategoryWithChildren[]
) => {
  const path: Array<{ id: string | null; name: string; isNote?: boolean }> = [];

  const findPath = (
    cats: CategoryWithChildren[],
    targetId: string
  ): boolean => {
    for (const cat of cats) {
      if (cat.id === targetId) {
        path.unshift({ id: cat.id, name: cat.name });
        return true;
      }
      if (cat.children && cat.children.length > 0) {
        const found = findPath(cat.children, targetId);
        if (found) {
          path.unshift({ id: cat.id, name: cat.name });
          return true;
        }
      }
    }
    return false;
  };

  if (categoryId) {
    findPath(categories, categoryId);
  }

  if (noteTitle) {
    path.push({ id: null, name: noteTitle, isNote: true });
  }

  return path;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const preserveSpans = (value: string) => {
  const tokens: string[] = [];
  const withTokens = value.replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, (match) => {
    const token = `__SPAN_${tokens.length}__`;
    tokens.push(match);
    return token;
  });
  return { withTokens, tokens };
};

const restoreSpans = (value: string, tokens: string[]) => {
  let restored = value;
  tokens.forEach((token, index) => {
    restored = restored.replace(`__SPAN_${index}__`, token);
  });
  return restored;
};

const renderInlineMarkdown = (value: string) => {
  const { withTokens, tokens } = preserveSpans(value);
  const escaped = escapeHtml(withTokens);
  const withStrong = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withEm = withStrong.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return restoreSpans(withEm, tokens);
};

export const renderMarkdownToHtml = (value: string): string => {
  const lines = value.split(/\r?\n/);
  let html = "";
  let inList = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listMatch) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${renderInlineMarkdown(listMatch[1])}</li>`;
      return;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    if (!trimmed) {
      html += "<br />";
      return;
    }

    html += `<p>${renderInlineMarkdown(line)}</p>`;
  });

  if (inList) {
    html += "</ul>";
  }

  return html;
};
