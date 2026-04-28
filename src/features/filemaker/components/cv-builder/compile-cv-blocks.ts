/* eslint-disable complexity, consistent-return, @typescript-eslint/strict-boolean-expressions */

import type {
  CvBlock,
  CvColumnsBlock,
  CvCustomTextBlock,
  CvDividerBlock,
  CvEducationBlock,
  CvExperienceBlock,
  CvLanguagesBlock,
  CvProfileHeaderBlock,
  CvRowBlock,
  CvSectionBlock,
  CvSkillsBlock,
  CvSpacerBlock,
  CvStackBlock,
  CvSummaryBlock,
} from './cv-block-model';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const stripTags = (html: string): string => html.replace(/<[^>]*>/g, '');

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'');

const paragraphize = (value: string): string =>
  value
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0)
    .map((line: string): string => `<p>${escapeHtml(line)}</p>`)
    .join('');

const compileLink = (url: string, label: string): string => {
  const href = url.trim();
  if (href.length === 0) return '';
  return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
};

const compileProfileHeader = (block: CvProfileHeaderBlock): string => {
  const contact = [
    escapeHtml(block.location),
    escapeHtml(block.phone),
    escapeHtml(block.email),
    escapeHtml(block.website),
    compileLink(block.linkedinUrl, 'LinkedIn'),
    compileLink(block.githubUrl, 'GitHub'),
  ]
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry.length > 0);
  return [
    '<header class="cv-header">',
    `<h1>${escapeHtml(block.name)}</h1>`,
    block.headline.trim().length > 0 ? `<div class="cv-headline">${escapeHtml(block.headline)}</div>` : '',
    contact.length > 0
      ? `<div class="cv-contact">${contact.map((entry: string): string => `<span>${entry}</span>`).join('')}</div>`
      : '',
    '</header>',
  ].join('');
};

const compileSummary = (block: CvSummaryBlock): string =>
  `<div class="cv-summary">${paragraphize(block.text)}</div>`;

const compileExperience = (block: CvExperienceBlock): string => [
  '<article class="cv-entry">',
  '<div class="cv-entry-heading">',
  `<div><h3>${escapeHtml(block.title)}</h3>${block.organization ? `<div class="cv-entry-subtitle">${escapeHtml(block.organization)}</div>` : ''}</div>`,
  block.period ? `<div class="cv-entry-period">${escapeHtml(block.period)}</div>` : '',
  '</div>',
  block.location ? `<div class="cv-entry-location">${escapeHtml(block.location)}</div>` : '',
  block.description ? `<div class="cv-entry-description">${paragraphize(block.description)}</div>` : '',
  block.highlights.length > 0
    ? `<ul class="cv-entry-highlights">${block.highlights
        .map((highlight: string): string => `<li>${escapeHtml(highlight)}</li>`)
        .join('')}</ul>`
    : '',
  '</article>',
].join('');

const compileEducation = (block: CvEducationBlock): string => [
  '<article class="cv-entry">',
  '<div class="cv-entry-heading">',
  `<div><h3>${escapeHtml(block.degree || block.institution)}</h3>${block.degree && block.institution ? `<div class="cv-entry-subtitle">${escapeHtml(block.institution)}</div>` : ''}</div>`,
  block.period ? `<div class="cv-entry-period">${escapeHtml(block.period)}</div>` : '',
  '</div>',
  block.description ? `<div class="cv-entry-description">${paragraphize(block.description)}</div>` : '',
  '</article>',
].join('');

const compileListBlock = (block: CvSkillsBlock | CvLanguagesBlock): string => {
  const items = block.items
    .map((item: string): string => item.trim())
    .filter((item: string): boolean => item.length > 0);
  if (items.length === 0) return '';
  return [
    '<div class="cv-list-block">',
    `<h3>${escapeHtml(block.label)}</h3>`,
    `<ul>${items.map((item: string): string => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`,
    '</div>',
  ].join('');
};

const compileCustomText = (block: CvCustomTextBlock): string => [
  '<div class="cv-custom-text">',
  block.label ? `<h3>${escapeHtml(block.label)}</h3>` : '',
  `<div>${block.html}</div>`,
  '</div>',
].join('');

const compileDivider = (block: CvDividerBlock): string =>
  `<div class="cv-divider" style="border-color:${block.color};"></div>`;

const compileSpacer = (block: CvSpacerBlock): string =>
  `<div style="height:${block.height}px;"></div>`;

const compileStack = (block: CvStackBlock): string =>
  `<div class="cv-stack" style="gap:${block.gap}px;">${block.children.map(compileBlock).join('')}</div>`;

const compileRow = (block: CvRowBlock): string =>
  `<div class="cv-row" style="background:${block.background};padding:${block.paddingY}px ${block.paddingX}px;">${block.children
    .map(compileBlock)
    .join('')}</div>`;

const compileColumns = (block: CvColumnsBlock): string => {
  if (block.children.length === 0) return '';
  return `<div class="cv-columns" style="gap:${block.gap}px;">${block.children
    .map((row: CvRowBlock): string => `<div class="cv-column">${compileRow(row)}</div>`)
    .join('')}</div>`;
};

const compileSection = (block: CvSectionBlock): string => [
  `<section class="cv-section" style="background:${block.background};padding:${block.paddingY}px ${block.paddingX}px;">`,
  block.label ? `<h2>${escapeHtml(block.label)}</h2>` : '',
  block.children.map(compileBlock).join(''),
  '</section>',
].join('');

const compileBlock = (block: CvBlock): string => {
  switch (block.kind) {
    case 'profileHeader': return compileProfileHeader(block);
    case 'summary': return compileSummary(block);
    case 'experience': return compileExperience(block);
    case 'education': return compileEducation(block);
    case 'skills': return compileListBlock(block);
    case 'languages': return compileListBlock(block);
    case 'customText': return compileCustomText(block);
    case 'divider': return compileDivider(block);
    case 'spacer': return compileSpacer(block);
    case 'section': return compileSection(block);
    case 'stack': return compileStack(block);
    case 'columns': return compileColumns(block);
    case 'row': return compileRow(block);
  }
};

export const compileCvBlocksToHtml = (blocks: CvBlock[]): string => {
  const body = blocks.map(compileBlock).join('');
  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<style>',
    '@page{size:A4;margin:14mm;}',
    '*,*::before,*::after{box-sizing:border-box;}',
    'body{margin:0;background:#eef2f7;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;}',
    '.cv-page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:16mm 16mm 18mm;box-shadow:0 16px 60px rgba(15,23,42,.18);}',
    '@media print{body{background:#fff}.cv-page{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none;}}',
    '.cv-section{break-inside:avoid;margin:0 0 16px;border-radius:0;}',
    '.cv-section h2{margin:0 0 10px;padding-bottom:5px;border-bottom:1px solid #d1d5db;color:#0f172a;font-size:13px;letter-spacing:.08em;text-transform:uppercase;}',
    '.cv-header{padding-bottom:16px;border-bottom:2px solid #111827;margin-bottom:16px;}',
    '.cv-header h1{margin:0;color:#0f172a;font-size:32px;line-height:1.05;font-weight:800;}',
    '.cv-headline{margin-top:6px;color:#334155;font-size:14px;font-weight:600;}',
    '.cv-contact{display:flex;flex-wrap:wrap;gap:0;margin-top:10px;color:#475569;font-size:11px;}',
    '.cv-contact span:not(:last-child)::after{content:" | ";white-space:pre;color:#64748b;}',
    '.cv-contact a{color:#475569;text-decoration:none;}',
    '.cv-summary p,.cv-entry-description p{margin:0 0 7px;}',
    '.cv-stack{display:flex;flex-direction:column;}',
    '.cv-columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));align-items:start;}',
    '.cv-column{min-width:0;}',
    '.cv-row{break-inside:avoid;}',
    '.cv-entry{break-inside:avoid;margin:0 0 12px;}',
    '.cv-entry-heading{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:4px;}',
    '.cv-entry h3,.cv-list-block h3,.cv-custom-text h3{margin:0 0 4px;color:#111827;font-size:13px;font-weight:700;}',
    '.cv-entry-subtitle{color:#475569;font-size:12px;font-weight:600;}',
    '.cv-entry-location{margin:-1px 0 5px;color:#475569;font-size:11px;font-weight:600;}',
    '.cv-entry-period{white-space:nowrap;color:#64748b;font-size:11px;}',
    '.cv-entry-highlights{margin:4px 0 0 0;padding-left:16px;}',
    '.cv-entry-highlights li{margin:0 0 4px;}',
    '.cv-list-block ul{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none;}',
    '.cv-list-block li{border:1px solid #cbd5e1;border-radius:4px;padding:3px 7px;background:#f8fafc;color:#334155;}',
    '.cv-custom-text p{margin:0 0 7px;}',
    '.cv-custom-text ul{margin:0;padding-left:16px;}',
    '.cv-custom-text li{margin:0 0 4px;}',
    '.cv-divider{border-top:1px solid #e5e7eb;height:1px;margin:8px 0;}',
    '</style></head>',
    '<body><main class="cv-page">',
    body || '<section class="cv-section"><h2>CV</h2><p>No CV content yet.</p></section>',
    '</main></body></html>',
  ].join('');
};

const plainLinesForBlock = (block: CvBlock): string[] => {
  switch (block.kind) {
    case 'profileHeader':
      return [
        block.name,
        block.headline,
        [block.location, block.phone, block.email, block.website, block.linkedinUrl, block.githubUrl]
          .filter((entry: string): boolean => entry.trim().length > 0)
          .join(' | '),
        '',
      ];
    case 'summary':
      return ['Summary', block.text, ''];
    case 'experience':
      return [
        block.title,
        [block.organization, block.period].filter(Boolean).join(' | '),
        block.location,
        block.description,
        ...block.highlights,
        '',
      ];
    case 'education':
      return [
        block.institution,
        [block.degree, block.period].filter(Boolean).join(' | '),
        block.description,
        '',
      ];
    case 'skills':
    case 'languages':
      return [block.label, block.items.join(', '), ''];
    case 'customText':
      return [block.label, decodeEntities(stripTags(block.html)).trim(), ''];
    case 'divider':
      return ['---'];
    case 'spacer':
      return [''];
    case 'section':
      return [block.label, ...block.children.flatMap(plainLinesForBlock)];
    case 'stack':
      return block.children.flatMap(plainLinesForBlock);
    case 'columns':
      return block.children.flatMap((row: CvRowBlock): string[] => row.children.flatMap(plainLinesForBlock));
    case 'row':
      return block.children.flatMap(plainLinesForBlock);
  }
};

export const compileCvBlocksToPlainText = (blocks: CvBlock[]): string =>
  blocks
    .flatMap(plainLinesForBlock)
    .map((line: string): string => line.trim())
    .filter((line: string, index: number, all: string[]): boolean => !(line === '' && all[index - 1] === ''))
    .join('\n')
    .trim();
