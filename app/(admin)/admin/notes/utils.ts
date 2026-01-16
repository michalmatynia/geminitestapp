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
  const withCode = escaped.replace(
    /`([^`]+)`/g,
    '<code style="background-color: rgba(15, 23, 42, 0.12); padding: 0.1rem 0.25rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \\"Liberation Mono\\", \\"Courier New\\", monospace; font-size: 0.85em;">$1</code>'
  );
  const withLinks = withCode.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="underline text-blue-300 hover:text-blue-200" target="_blank" rel="noreferrer">$1</a>'
  );
  const withStrong = withLinks.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withEm = withStrong.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return restoreSpans(withEm, tokens);
};

const highlightCode = (value: string) => {
  let escaped = escapeHtml(value);
  escaped = escaped.replace(
    /\b(\d+(\.\d+)?)\b/g,
    '<span style="color: #fbbf24;">$1</span>'
  );
  escaped = escaped.replace(
    /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|finally|class|new|import|from|export|default|async|await|type|interface|extends)\b/g,
    '<span style="color: #38bdf8;">$1</span>'
  );
  return escaped;
};

export const renderMarkdownToHtml = (value: string): string => {
  const lines = value.split(/\r?\n/);
  let html = "";
  let inList = false;
  let inCodeBlock = false;
  let inTable = false;
  let tableHeaderCells: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable) return;
    const header = tableHeaderCells
      .map((cell) => `<th>${renderInlineMarkdown(cell.trim())}</th>`)
      .join("");
    const body = tableRows
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${renderInlineMarkdown(cell.trim())}</td>`)
            .join("")}</tr>`
      )
      .join("");
    html += `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
    inTable = false;
    tableHeaderCells = [];
    tableRows = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().startsWith("```")) {
      flushTable();
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        html += '<pre style="background-color: #0f172a; color: #e2e8f0; padding: 0.75rem; border-radius: 0.5rem; overflow-x: auto;"><code style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \\"Liberation Mono\\", \\"Courier New\\", monospace; font-size: 0.85em;">';
      } else {
        html += "</code></pre>";
      }
      continue;
    }

    if (inCodeBlock) {
      html += `${highlightCode(line)}\n`;
      continue;
    }

    const trimmed = line.trim();
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushTable();
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      const level = headingMatch[1].length;
      html += `<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushTable();
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += "<hr />";
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushTable();
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      const quoteText = trimmed.replace(/^>\s?/, "");
      html += `<blockquote>${renderInlineMarkdown(quoteText)}</blockquote>`;
      continue;
    }

    if (/\|/.test(trimmed)) {
      const nextLine = lines[index + 1] ?? "";
      const isSeparatorLine = /^\s*\|?\s*-[-\s|]*\|?\s*$/.test(trimmed);
      const isSeparatorNext = /^\s*\|?\s*-[-\s|]*\|?\s*$/.test(nextLine.trim());
      if (inTable && isSeparatorLine) {
        continue;
      }
      if (!inTable && isSeparatorNext) {
        flushTable();
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        inTable = true;
        tableHeaderCells = trimmed
          .split("|")
          .filter((cell) => cell.trim().length > 0);
        continue;
      }
      if (inTable) {
        const cells = trimmed
          .split("|")
          .filter((cell) => cell.trim().length > 0);
        tableRows.push(cells);
        continue;
      }
    }

    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listMatch) {
      flushTable();
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      const taskMatch = /^\[(\s|x|X)\]\s+(.+)$/.exec(listMatch[1]);
      if (taskMatch) {
        const checked = taskMatch[1].toLowerCase() === "x";
        html += `<li><input type="checkbox" disabled ${checked ? "checked" : ""} /> ${renderInlineMarkdown(taskMatch[2])}</li>`;
      } else {
        html += `<li>${renderInlineMarkdown(listMatch[1])}</li>`;
      }
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      html += "<br />";
      continue;
    }

    html += `<p>${renderInlineMarkdown(line)}</p>`;
  }

  if (inList) {
    html += "</ul>";
  }
  if (inTable) {
    flushTable();
  }
  if (inCodeBlock) {
    html += "</code></pre>";
  }

  return html;
};
