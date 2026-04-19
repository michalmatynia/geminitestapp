const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const preserveSpans = (value: string): { withTokens: string; tokens: string[] } => {
  const tokens: string[] = [];
  const withTokens = value.replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, (match: string) => {
    const token = `__SPAN_${tokens.length}__`;
    tokens.push(match);
    return token;
  });
  return { withTokens, tokens };
};

const restoreSpans = (value: string, tokens: string[]): string => {
  let restored = value;
  tokens.forEach((token: string, index: number) => {
    restored = restored.replace(`__SPAN_${index}__`, token);
  });
  return restored;
};

const renderInlineMarkdown = (value: string): string => {
  const { withTokens, tokens } = preserveSpans(value);
  const escaped = escapeHtml(withTokens);
  
  const withCode = escaped.replace(
    /`([^`]+)`/g,
    '<code style=\"background-color: var(--note-inline-code-bg, rgba(15, 23, 42, 0.12)); color: var(--note-code-text, #e2e8f0); padding: 0.1rem 0.25rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace; font-size: 0.85em;\">$1</code>'
  );

  const withImages = withCode.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src=\"$2\" alt=\"$1\" style=\"max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.5rem 0;\" />'
  );

  const withLinks = withImages.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href=\"$2\" style=\"color: var(--note-link-color, #38bdf8); text-decoration: underline; cursor: pointer;\" target=\"_blank\" rel=\"noreferrer\">$1</a>'
  );

  const withStrong = withLinks.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const withEm = withStrong.replace(/\*(.+?)\*/g, '<em>$1</em>');

  return restoreSpans(withEm, tokens);
};

const highlightCode = (value: string): string => {
  let escaped = escapeHtml(value);
  escaped = escaped.replace(/\b(\d+(\.\d+)?)\b/g, '<span style=\"color: #fbbf24;\">$1</span>');
  escaped = escaped.replace(
    /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|finally|class|new|import|from|export|default|async|await|type|interface|extends)\b/g,
    '<span style=\"color: #38bdf8;\">$1</span>'
  );
  return escaped;
};

const renderCodeBlock = (codeLines: string[]): string => {
  const rawCode = codeLines.join('\n');
  const encoded = encodeURIComponent(rawCode);
  const highlighted = codeLines.map(highlightCode).join('\n');
  return `<div data-code=\"${encoded}\" style=\"position: relative; margin: 0.75rem 0; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 0.5rem; overflow: hidden;\"><button type=\"button\" data-copy-code=\"true\" style=\"position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(148, 163, 184, 0.15); border: 1px solid rgba(148, 163, 184, 0.35); color: var(--note-code-text, #e2e8f0); font-size: 0.7rem; padding: 0.2rem 0.45rem; border-radius: 0.4rem; cursor: pointer; opacity: 0; transition: opacity 0.15s ease; z-index: 10;\">Copy</button><pre style=\"background-color: var(--note-code-bg, #0f172a); color: var(--note-code-text, #e2e8f0); padding: 0.75rem; margin: 0; overflow-x: auto;\"><code style=\"font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace; font-size: 0.85em; white-space: pre;\">${highlighted}</code></pre></div>`;
};

const renderTable = (headerCells: string[], rows: string[][]): string => {
  const header = headerCells.map((cell) => `<th>${renderInlineMarkdown(cell.trim())}</th>`).join('');
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell.trim())}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
};

export const renderMarkdownToHtml = (value: string): string => {
  const { withTokens, tokens } = preserveSpans(value);
  const lines = withTokens.split(/\r?\n/);
  let html = '';
  const state = { inList: false, inCodeBlock: false, inTable: false };
  const buffers = { codeLines: [] as string[], tableHeaderCells: [] as string[], tableRows: [] as string[][] };

  const flushTable = (): void => {
    if (!state.inTable) return;
    html += renderTable(buffers.tableHeaderCells, buffers.tableRows);
    state.inTable = false;
    buffers.tableHeaderCells = [];
    buffers.tableRows = [];
  };

  const closeList = (): void => {
    if (!state.inList) return;
    html += '</ul>';
    state.inList = false;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushTable();
      closeList();
      if (state.inCodeBlock) {
        html += renderCodeBlock(buffers.codeLines);
        buffers.codeLines = [];
        state.inCodeBlock = false;
      } else {
        state.inCodeBlock = true;
      }
      continue;
    }

    if (state.inCodeBlock) {
      buffers.codeLines.push(line);
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch !== null) {
      flushTable();
      closeList();
      const level = (headingMatch[1] ?? '').length;
      html += `<h${level}>${renderInlineMarkdown(headingMatch[2] ?? '')}</h${level}>`;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushTable();
      closeList();
      html += '<hr />';
      continue;
    }

    if (trimmed.startsWith('>')) {
      flushTable();
      closeList();
      html += `<blockquote>${renderInlineMarkdown(trimmed.replace(/^>\s?/, ''))}</blockquote>`;
      continue;
    }

    if (/\|/.test(trimmed)) {
      const nextLine = lines[i + 1] ?? '';
      const isSep = /^\s*\|?\s*-[-\s|]*\|?\s*$/.test(trimmed);
      const isNextSep = /^\s*\|?\s*-[-\s|]*\|?\s*$/.test(nextLine.trim());

      if (state.inTable && isSep) continue;
      if (!state.inTable && isNextSep) {
        flushTable();
        closeList();
        state.inTable = true;
        buffers.tableHeaderCells = trimmed.split('|').filter((c) => c.trim().length > 0);
        continue;
      }
      if (state.inTable) {
        buffers.tableRows.push(trimmed.split('|').filter((c) => c.trim().length > 0));
        continue;
      }
    }

    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listMatch !== null) {
      flushTable();
      if (!state.inList) {
        html += '<ul>';
        state.inList = true;
      }
      const taskMatch = /^\((\s|x|X)\)\s+(.+)$/.exec(listMatch[1] ?? '');
      if (taskMatch !== null) {
        const checked = (taskMatch[1] ?? '').toLowerCase() === 'x';
        html += `<li><input type="checkbox" disabled ${checked ? 'checked' : ''} /> ${renderInlineMarkdown(taskMatch[2] ?? '')}</li>`;
      } else {
        html += `<li>${renderInlineMarkdown(listMatch[1] ?? '')}</li>`;
      }
      continue;
    }

    closeList();
    if (state.inTable) flushTable();
    if (trimmed === '') {
      html += '<br />';
      continue;
    }
    html += `<p>${renderInlineMarkdown(line)}</p>`;
  }

  closeList();
  flushTable();
  if (state.inCodeBlock) html += renderCodeBlock(buffers.codeLines);

  return restoreSpans(html, tokens);
};
