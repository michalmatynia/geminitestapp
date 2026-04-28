import type {
  EmailBlock,
  EmailButtonBlock,
  EmailColumnsBlock,
  EmailDividerBlock,
  EmailHeadingBlock,
  EmailImageBlock,
  EmailRowBlock,
  EmailSectionBlock,
  EmailSpacerBlock,
  EmailTextBlock,
} from './block-model';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttr = (value: string): string => escapeHtml(value);

const wrapRow = (innerHtml: string): string =>
  `<tr><td style="padding:8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.5;">${innerHtml}</td></tr>`;

const compileText = (block: EmailTextBlock): string => wrapRow(block.html);

const compileHeading = (block: EmailHeadingBlock): string => {
  const tag = `h${block.level}`;
  const size = block.level === 1 ? '28px' : block.level === 2 ? '22px' : '18px';
  const inner = `<${tag} style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:${size};line-height:1.3;color:#111827;text-align:${block.align};">${escapeHtml(block.text)}</${tag}>`;
  return wrapRow(inner);
};

const compileImage = (block: EmailImageBlock): string => {
  if (!block.src) {
    return wrapRow(
      `<div style="padding:24px;border:1px dashed #d1d5db;text-align:${block.align};color:#6b7280;font-size:12px;">[Image: no source]</div>`
    );
  }
  const widthAttr = block.width ? ` width="${block.width}"` : '';
  const widthStyle = block.width ? `max-width:${block.width}px;width:100%;` : 'max-width:100%;';
  const img = `<img src="${escapeAttr(block.src)}" alt="${escapeAttr(block.alt)}"${widthAttr} style="${widthStyle}height:auto;display:inline-block;border:0;" />`;
  const wrapped = block.href
    ? `<a href="${escapeAttr(block.href)}" target="_blank" rel="noopener">${img}</a>`
    : img;
  return wrapRow(`<div style="text-align:${block.align};">${wrapped}</div>`);
};

const compileButton = (block: EmailButtonBlock): string => {
  const button = `<a href="${escapeAttr(block.href)}" target="_blank" rel="noopener" style="background-color:${block.background};color:${block.color};display:inline-block;padding:12px 24px;text-decoration:none;font-weight:600;font-family:Arial,Helvetica,sans-serif;font-size:14px;border-radius:6px;">${escapeHtml(block.label)}</a>`;
  return wrapRow(`<div style="text-align:${block.align};">${button}</div>`);
};

const compileDivider = (block: EmailDividerBlock): string =>
  wrapRow(
    `<div style="border-top:1px solid ${block.color};line-height:0;font-size:0;">&nbsp;</div>`
  );

const compileSpacer = (block: EmailSpacerBlock): string =>
  `<tr><td style="height:${block.height}px;line-height:${block.height}px;font-size:0;">&nbsp;</td></tr>`;

const compileBlocksAsRows = (children: EmailBlock[]): string =>
  children.map(compileBlock).join('');

const compileSection = (block: EmailSectionBlock): string => {
  const inner = compileBlocksAsRows(block.children);
  return `<tr><td style="background-color:${block.background};padding:${block.paddingY}px ${block.paddingX}px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${inner}</table></td></tr>`;
};

const compileRow = (block: EmailRowBlock): string => {
  const inner = compileBlocksAsRows(block.children as EmailBlock[]);
  return `<tr><td style="background-color:${block.background};padding:${block.paddingY}px ${block.paddingX}px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${inner}</table></td></tr>`;
};

const compileRowAsColumnCellContent = (row: EmailRowBlock): string => {
  const inner = compileBlocksAsRows(row.children as EmailBlock[]);
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${row.background};"><tbody><tr><td style="padding:${row.paddingY}px ${row.paddingX}px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${inner}</table></td></tr></tbody></table>`;
};

const compileColumns = (block: EmailColumnsBlock): string => {
  if (block.children.length === 0) return '';
  const cellWidth = Math.floor(100 / block.children.length);
  const halfGap = Math.round(block.gap / 2);
  const cells = block.children
    .map(
      (row: EmailRowBlock): string =>
        `<td valign="top" width="${cellWidth}%" style="padding:0 ${halfGap}px;">${compileRowAsColumnCellContent(row)}</td>`
    )
    .join('');
  return `<tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tbody><tr>${cells}</tr></tbody></table></td></tr>`;
};

const compileBlock = (block: EmailBlock): string => {
  switch (block.kind) {
    case 'text': return compileText(block);
    case 'heading': return compileHeading(block);
    case 'image': return compileImage(block);
    case 'button': return compileButton(block);
    case 'divider': return compileDivider(block);
    case 'spacer': return compileSpacer(block);
    case 'section': return compileSection(block);
    case 'columns': return compileColumns(block);
    case 'row': return compileRow(block);
  }
};

export const compileBlocksToHtml = (blocks: EmailBlock[]): string => {
  if (blocks.length === 0) return '';
  const rows = blocks.map(compileBlock).join('');
  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background:#f3f4f6;">',
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="background:#f3f4f6;padding:24px 0;">',
    '<tr><td align="center">',
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">',
    rows,
    '</table>',
    '</td></tr>',
    '</table>',
    '</body></html>',
  ].join('');
};

const stripTags = (html: string): string => html.replace(/<[^>]*>/g, '');

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'');

export const compileBlocksToPlainText = (blocks: EmailBlock[]): string => {
  const lines: string[] = [];
  blocks.forEach((block: EmailBlock) => {
    switch (block.kind) {
      case 'text':
        lines.push(decodeEntities(stripTags(block.html)).trim());
        break;
      case 'heading':
        lines.push(block.text);
        lines.push('');
        break;
      case 'image':
        if (block.alt) lines.push(`[Image: ${block.alt}]`);
        if (block.href) lines.push(block.href);
        break;
      case 'button':
        lines.push(`${block.label}: ${block.href}`);
        break;
      case 'divider':
        lines.push('---');
        break;
      case 'spacer':
        lines.push('');
        break;
      case 'section':
      case 'row':
        lines.push(compileBlocksToPlainText(block.children));
        break;
      case 'columns':
        block.children.forEach((row: EmailRowBlock) => {
          lines.push(compileBlocksToPlainText(row.children));
        });
        break;
    }
  });
  return lines.filter((line: string, index: number, all: string[]) => !(line === '' && all[index - 1] === '')).join('\n').trim();
};
