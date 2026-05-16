/* eslint-disable no-param-reassign */

type RenderState = { inList: boolean; inCodeBlock: boolean; inTable: boolean };
type RenderBuffers = { codeLines: string[]; tableHeaderCells: string[]; tableRows: string[][] };
type RenderContext = { state: RenderState; buffers: RenderBuffers };

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

const renderInlineCode = (value: string): string =>
  value.replace(
    /`([^`]+)`/g,
    '<code style="background-color: var(--note-inline-code-bg, rgba(15, 23, 42, 0.12)); color: var(--note-code-text, #e2e8f0); padding: 0.1rem 0.25rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \'Liberation Mono\', \'Courier New\', monospace; font-size: 0.85em;">$1</code>'
  );

const renderInlineImages = (value: string): string =>
  value.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.5rem 0;" />'
  );

const renderInlineLinks = (value: string): string =>
  value.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" style="color: var(--note-link-color, #38bdf8); text-decoration: underline; cursor: pointer;" target="_blank" rel="noreferrer">$1</a>'
  );

const renderInlineStrong = (value: string): string => value.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const renderInlineEm = (value: string): string => value.replace(/\*(.+?)\*/g, '<em>$1</em>');

const renderInlineMarkdown = (value: string): string => {
  const { withTokens, tokens } = preserveSpans(value);
  const escaped = escapeHtml(withTokens);
  
  let result = renderInlineCode(escaped);
  result = renderInlineImages(result);
  result = renderInlineLinks(result);
  result = renderInlineStrong(result);
  result = renderInlineEm(result);

  return restoreSpans(result, tokens);
};

const highlightCode = (value: string): string => {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color: #fbbf24;">$1</span>')
    .replace(
      /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|finally|class|new|import|from|export|default|async|await|type|interface|extends)\b/g,
      '<span style="color: #38bdf8;">$1</span>'
    );
};

const renderCodeBlock = (codeLines: string[]): string => {
  const rawCode = codeLines.join('\n');
  const encoded = encodeURIComponent(rawCode);
  const highlighted = codeLines.map(highlightCode).join('\n');
  return `<div data-code="${encoded}" style="position: relative; margin: 0.75rem 0; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 0.5rem; overflow: hidden;"><button type="button" data-copy-code="true" style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(148, 163, 184, 0.15); border: 1px solid rgba(148, 163, 184, 0.35); color: var(--note-code-text, #e2e8f0); font-size: 0.7rem; padding: 0.2rem 0.45rem; border-radius: 0.4rem; cursor: pointer; opacity: 0; transition: opacity 0.15s ease; z-index: 10;">Copy</button><pre style="background-color: var(--note-code-bg, #0f172a); color: var(--note-code-text, #e2e8f0); padding: 0.75rem; margin: 0; overflow-x: auto;"><code style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.85em; white-space: pre;">${highlighted}</code></pre></div>`;
};

const renderTable = (headerCells: string[], rows: string[][]): string => {
  const header = headerCells.map((cell) => `<th>${renderInlineMarkdown(cell.trim())}</th>`).join('');
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell.trim())}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
};

const flushTable = (html: string, state: RenderState, buffers: RenderBuffers): string => {
  if (!state.inTable) return html;
  const result = `${html}${renderTable(buffers.tableHeaderCells, buffers.tableRows)}`;
  state.inTable = false;
  buffers.tableHeaderCells = [];
  buffers.tableRows = [];
  return result;
};

const closeList = (html: string, state: RenderState): string => {
  if (!state.inList) return html;
  const result = `${html}</ul>`;
  state.inList = false;
  return result;
};

const handleBlockTransition = (html: string, ctx: RenderContext): string => {
  let result = flushTable(html, ctx.state, ctx.buffers);
  result = closeList(result, ctx.state);
  return result;
};

const renderHeading = (trimmed: string): string | null => {
  const match = /^(#{1,3})\s+(.+)$/.exec(trimmed);
  if (match === null) return null;
  const level = (match[1] ?? '').length;
  return `<h${level}>${renderInlineMarkdown(match[2] ?? '')}</h${level}>`;
};

const renderListItem = (content: string): string => {
  const taskMatch = /^\((\s|x|X)\)\s+(.+)$/.exec(content);
  if (taskMatch !== null) {
    const checked = (taskMatch[1] ?? '').toLowerCase() === 'x';
    return `<li><input type="checkbox" disabled ${checked ? 'checked' : ''} /> ${renderInlineMarkdown(taskMatch[2] ?? '')}</li>`;
  }
  return `<li>${renderInlineMarkdown(content)}</li>`;
};

const handleTableLine = (
  line: string,
  nextLine: string | undefined,
  state: RenderState,
  buffers: RenderBuffers
): { handled: boolean; shouldTransition: boolean } => {
  const trimmed = line.trim();
  if (!/\|/.test(trimmed)) return { handled: false, shouldTransition: false };

  const isSep = /^\s*\|?\s*-[-\s|]*\|?\s*$/.test(trimmed);
  const isNextSep = nextLine !== undefined ? /^\s*\|?\s*-[-\s|]*\|?\s*$/.test(nextLine.trim()) : false;

  if (state.inTable && isSep) return { handled: true, shouldTransition: false };
  if (!state.inTable && isNextSep) {
    buffers.tableHeaderCells = trimmed.split('|').filter((c) => c.trim().length > 0);
    return { handled: true, shouldTransition: true };
  }
  if (state.inTable) {
    buffers.tableRows.push(trimmed.split('|').filter((c) => c.trim().length > 0));
    return { handled: true, shouldTransition: false };
  }
  return { handled: false, shouldTransition: false };
};

const handleCodeBlockToggle = (html: string, ctx: RenderContext): string => {
  let resultHtml = handleBlockTransition(html, ctx);
  if (ctx.state.inCodeBlock) {
    resultHtml += renderCodeBlock(ctx.buffers.codeLines);
    ctx.buffers.codeLines = [];
    ctx.state.inCodeBlock = false;
  } else {
    ctx.state.inCodeBlock = true;
  }
  return resultHtml;
};

const handleOtherLines = (
  line: string,
  nextLine: string | undefined,
  html: string,
  ctx: RenderContext
): string => {
  const trimmed = line.trim();
  const tableResult = handleTableLine(line, nextLine, ctx.state, ctx.buffers);
  if (tableResult.handled) {
    if (tableResult.shouldTransition) {
      const transitioningHtml = handleBlockTransition(html, ctx);
      ctx.state.inTable = true;
      return transitioningHtml;
    }
    return html;
  }

  const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);
  if (listMatch !== null) {
    let resultHtml = flushTable(html, ctx.state, ctx.buffers);
    if (!ctx.state.inList) {
      resultHtml = `${resultHtml}<ul>`;
      ctx.state.inList = true;
    }
    return resultHtml + renderListItem(listMatch[1] ?? '');
  }

  let resultHtml = closeList(html, ctx.state);
  if (ctx.state.inTable) resultHtml = flushTable(resultHtml, ctx.state, ctx.buffers);
  if (trimmed === '') return `${resultHtml}<br />`;
  return `${resultHtml}<p>${renderInlineMarkdown(line)}</p>`;
};

const handleLine = (
  line: string,
  nextLine: string | undefined,
  html: string,
  ctx: RenderContext
): string => {
  const trimmed = line.trim();

  if (ctx.state.inCodeBlock && !trimmed.startsWith('```')) {
    ctx.buffers.codeLines.push(line);
    return html;
  }
  if (trimmed.startsWith('```')) return handleCodeBlockToggle(html, ctx);

  const headingHtml = renderHeading(trimmed);
  if (headingHtml !== null) return handleBlockTransition(html, ctx) + headingHtml;

  if (/^---+$/.test(trimmed)) return `${handleBlockTransition(html, ctx)}<hr />`;

  if (trimmed.startsWith('>')) {
    return `${handleBlockTransition(html, ctx)}<blockquote>${renderInlineMarkdown(trimmed.replace(/^>\s?/, ''))}</blockquote>`;
  }

  return handleOtherLines(line, nextLine, html, ctx);
};

export const renderMarkdownToHtml = (value: string): string => {
  const { withTokens, tokens } = preserveSpans(value);
  const lines = withTokens.split(/\r?\n/);
  let html = '';
  const ctx: RenderContext = {
    state: { inList: false, inCodeBlock: false, inTable: false },
    buffers: { codeLines: [], tableHeaderCells: [], tableRows: [] },
  };

  for (let i = 0; i < lines.length; i += 1) {
    html = handleLine(lines[i] ?? '', lines[i + 1], html, ctx);
  }

  html = closeList(html, ctx.state);
  html = flushTable(html, ctx.state, ctx.buffers);
  if (ctx.state.inCodeBlock) html += renderCodeBlock(ctx.buffers.codeLines);

  return restoreSpans(html, tokens);
};
