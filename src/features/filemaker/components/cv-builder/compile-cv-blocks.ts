/* eslint-disable complexity, consistent-return, max-lines, max-lines-per-function, @typescript-eslint/strict-boolean-expressions */

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
  CvTechStackBlock,
  CvTechStackItem,
} from './cv-block-model';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type CvRenderContext = {
  technologyMentionRegex: RegExp | null;
};

type CompileCvBlocksToHtmlOptions = {
  highlightedTechnologyTerms?: CvTechStackItem[] | null;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values));

const technologyMentionVariants = (value: string): string[] => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return [];
  const variants = [normalized];
  if (/\.js$/i.test(normalized)) variants.push(normalized.replace(/\.js$/i, ''));
  if (/\bapi$/i.test(normalized)) variants.push(`${normalized}s`);
  if (/\bapis$/i.test(normalized)) variants.push(normalized.replace(/apis$/i, 'API'));
  return uniqueStrings(variants.filter((entry: string): boolean => entry.length >= 2));
};

const appendTechnologyMentionTerms = (terms: string[], item: CvTechStackItem): void => {
  terms.push(...technologyMentionVariants(item.label));
  if (typeof item.normalizedLabel === 'string') {
    terms.push(...technologyMentionVariants(item.normalizedLabel));
  }
  if (Array.isArray(item.aliases)) {
    item.aliases.forEach((alias: string): void => {
      terms.push(...technologyMentionVariants(alias));
    });
  }
};

const collectTechnologyMentionTerms = (
  blocks: CvBlock[],
  extraTerms: CvTechStackItem[] = []
): string[] => {
  const terms: string[] = [];
  extraTerms.forEach((term: CvTechStackItem): void => {
    appendTechnologyMentionTerms(terms, term);
  });
  const visit = (block: CvBlock): void => {
    if (block.kind === 'techStack') {
      block.items.forEach((item): void => {
        appendTechnologyMentionTerms(terms, item);
      });
      return;
    }
    if ('children' in block) {
      block.children.forEach(visit);
    }
  };
  blocks.forEach(visit);
  return uniqueStrings(terms).sort((left: string, right: string): number => right.length - left.length);
};

const buildCvRenderContext = (
  blocks: CvBlock[],
  options: CompileCvBlocksToHtmlOptions = {}
): CvRenderContext => {
  const terms = collectTechnologyMentionTerms(blocks, options.highlightedTechnologyTerms ?? [])
    .map((term: string): string => escapeRegex(escapeHtml(term)))
    .filter((term: string): boolean => term.length > 0);
  if (terms.length === 0) return { technologyMentionRegex: null };
  return {
    technologyMentionRegex: new RegExp(`(^|[^A-Za-z0-9+#.])(${terms.join('|')})(?=$|[^A-Za-z0-9+#.])`, 'gi'),
  };
};

const highlightEscapedHtmlText = (value: string, context: CvRenderContext): string => {
  if (context.technologyMentionRegex === null) return value;
  return value.replace(
    context.technologyMentionRegex,
    (_match: string, prefix: string, mention: string): string =>
      `${prefix}<mark class="cv-tech-mention">${mention}</mark>`
  );
};

const highlightText = (value: string, context: CvRenderContext): string =>
  highlightEscapedHtmlText(escapeHtml(value), context);

const highlightHtmlText = (html: string, context: CvRenderContext): string =>
  html
    .split(/(<[^>]+>)/g)
    .map((part: string): string =>
      part.startsWith('<') && part.endsWith('>') ? part : highlightEscapedHtmlText(part, context)
    )
    .join('');

const stripTags = (html: string): string => html.replace(/<[^>]*>/g, '');

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'');

const paragraphize = (value: string, context: CvRenderContext): string =>
  value
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0)
    .map((line: string): string => `<p>${highlightText(line, context)}</p>`)
    .join('');

const LINKEDIN_ICON = [
  '<svg viewBox="0 0 24 24" aria-hidden="true">',
  '<path d="M5.3 8.9h3.1v9.8H5.3V8.9Zm1.6-4.8a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Zm3.6 4.8h3v1.3h.1c.4-.8 1.5-1.6 3-1.6 3.2 0 3.8 2.1 3.8 4.9v5.2h-3.1v-4.6c0-1.1 0-2.5-1.6-2.5-1.5 0-1.8 1.2-1.8 2.4v4.7h-3.1V8.9Z"/>',
  '</svg>',
].join('');

const GITHUB_ICON = [
  '<svg viewBox="0 0 24 24" aria-hidden="true">',
  '<path d="M12 3.5a8.5 8.5 0 0 0-2.7 16.6c.4.1.6-.2.6-.4v-1.5c-2.4.5-2.9-1-2.9-1-.4-.9-.9-1.1-.9-1.1-.8-.5.1-.5.1-.5.8.1 1.3.9 1.3.9.8 1.3 2 1 2.5.8.1-.6.3-1 .5-1.2-1.9-.2-3.9-1-3.9-4.2 0-.9.3-1.7.9-2.3-.1-.2-.4-1.1.1-2.3 0 0 .7-.2 2.4.9a8.2 8.2 0 0 1 4.4 0c1.6-1.1 2.4-.9 2.4-.9.5 1.2.2 2.1.1 2.3.6.6.9 1.4.9 2.3 0 3.3-2 4-3.9 4.2.3.3.6.8.6 1.6v2.3c0 .2.2.5.6.4A8.5 8.5 0 0 0 12 3.5Z"/>',
  '</svg>',
].join('');

const normalizeSocialHref = (value: string, label: string): string => {
  const raw = value.trim();
  if (raw.length === 0) return '';
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
  const withoutAt = raw.replace(/^@+/, '').trim();
  const lower = withoutAt.toLowerCase();
  if (lower === 'linkedin' || lower === 'github') return '';
  if (raw.includes('.') || raw.includes('/')) return `https://${raw.replace(/^\/+/, '')}`;
  if (label === 'LinkedIn') return `https://www.linkedin.com/in/${withoutAt}`;
  if (label === 'GitHub') return `https://github.com/${withoutAt}`;
  return '';
};

const compileIconLink = (url: string, label: string, icon: string): string => {
  const href = normalizeSocialHref(url, label);
  if (href.length === 0) return '';
  return `<a class="cv-icon-link" href="${escapeHtml(href)}" aria-label="${escapeHtml(label)}">${icon}<span class="cv-sr-only">${escapeHtml(label)}</span></a>`;
};

const initialsForName = (value: string): string => {
  const parts = value
    .split(/\s+/)
    .map((part: string): string => part.trim())
    .filter((part: string): boolean => part.length > 0);
  if (parts.length === 0) return 'CV';
  const firstPart = parts[0] ?? '';
  if (parts.length === 1) return firstPart.slice(0, 2).toUpperCase();
  const lastPart = parts[parts.length - 1] ?? '';
  return `${firstPart[0] ?? ''}${lastPart[0] ?? ''}`.toUpperCase();
};

const compileProfileHeader = (block: CvProfileHeaderBlock, context: CvRenderContext): string => {
  const contact = [
    escapeHtml(block.location),
    escapeHtml(block.phone),
    escapeHtml(block.email),
    escapeHtml(block.website),
  ]
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry.length > 0);
  const iconLinks = [
    compileIconLink(block.linkedinUrl, 'LinkedIn', LINKEDIN_ICON),
    compileIconLink(block.githubUrl, 'GitHub', GITHUB_ICON),
  ].filter((entry: string): boolean => entry.length > 0);
  return [
    '<header class="cv-header">',
    '<div class="cv-header-content">',
    '<div class="cv-header-main">',
    '<div class="cv-header-text">',
    `<h1>${escapeHtml(block.name)}</h1>`,
    block.headline.trim().length > 0 ? `<div class="cv-headline">${highlightText(block.headline, context)}</div>` : '',
    contact.length > 0 || iconLinks.length > 0
      ? `<div class="cv-contact">${contact.map((entry: string): string => `<span>${entry}</span>`).join('')}${iconLinks.length > 0 ? `<span class="cv-contact-icons">${iconLinks.join('')}</span>` : ''}</div>`
      : '',
    '</div>',
    `<div class="cv-monogram">${escapeHtml(initialsForName(block.name))}</div>`,
    '</div>',
    '</div>',
    '</header>',
  ].join('');
};

const compileSummary = (block: CvSummaryBlock, context: CvRenderContext): string =>
  `<div class="cv-summary"><div class="cv-summary-mark"></div><div class="cv-summary-copy">${paragraphize(block.text, context)}</div></div>`;

const compileExperience = (block: CvExperienceBlock, context: CvRenderContext): string => [
  '<article class="cv-entry">',
  '<div class="cv-entry-heading">',
  `<div><h3>${highlightText(block.title, context)}</h3>${block.organization ? `<div class="cv-entry-subtitle">${highlightText(block.organization, context)}</div>` : ''}</div>`,
  block.period ? `<div class="cv-entry-period">${escapeHtml(block.period)}</div>` : '',
  '</div>',
  block.location ? `<div class="cv-entry-location">${escapeHtml(block.location)}</div>` : '',
  block.description ? `<div class="cv-entry-description">${paragraphize(block.description, context)}</div>` : '',
  block.highlights.length > 0
    ? `<ul class="cv-entry-highlights">${block.highlights
        .map((highlight: string): string => `<li>${highlightText(highlight, context)}</li>`)
        .join('')}</ul>`
    : '',
  '</article>',
].join('');

const compileEducationSubtitle = (
  block: CvEducationBlock,
  context: CvRenderContext
): string => {
  if (block.degree && block.institution) {
    const subtitle = [block.institution, block.country].filter(Boolean).join(' · ');
    return `<div class="cv-entry-subtitle">${highlightText(subtitle, context)}</div>`;
  }
  if (block.country) {
    return `<div class="cv-entry-subtitle">${highlightText(block.country, context)}</div>`;
  }
  return '';
};

const compileEducation = (block: CvEducationBlock, context: CvRenderContext): string => [
  '<article class="cv-entry">',
  '<div class="cv-entry-heading">',
  `<div><h3>${highlightText(block.degree || block.institution, context)}</h3>${compileEducationSubtitle(block, context)}</div>`,
  block.period ? `<div class="cv-entry-period">${escapeHtml(block.period)}</div>` : '',
  '</div>',
  block.description ? `<div class="cv-entry-description">${paragraphize(block.description, context)}</div>` : '',
  '</article>',
].join('');

const compileListBlock = (block: CvSkillsBlock, context: CvRenderContext): string => {
  const items = block.items
    .map((item: string): string => item.trim())
    .filter((item: string): boolean => item.length > 0);
  if (items.length === 0) return '';
  return [
    '<div class="cv-list-block">',
    `<h3>${escapeHtml(block.label)}</h3>`,
    `<ul>${items.map((item: string): string => `<li>${highlightText(item, context)}</li>`).join('')}</ul>`,
    '</div>',
  ].join('');
};

const parseLanguageLabel = (value: string): { language: string; level: number | null } => {
  const match = /^(.*?)\s*[-–—:]\s*(\d{1,2})\s*\/\s*10\s*$/i.exec(value.trim());
  if (!match) return { language: value.trim(), level: null };
  const language = match[1]?.trim() ?? value.trim();
  const level = Math.min(10, Math.max(1, Number(match[2] ?? 0)));
  return { language, level: Number.isFinite(level) ? level : null };
};

const compileLanguageItem = (item: CvLanguagesBlock['items'][number]): string => {
  const parsed =
    typeof item === 'string' ? parseLanguageLabel(item) : { language: item.language, level: item.level };
  const language = parsed.language.trim();
  if (language.length === 0) return '';
  const level = parsed.level === null ? null : Math.min(10, Math.max(1, Math.round(parsed.level)));
  const percentage = level === null ? 0 : level * 10;
  return [
    '<li class="cv-language-item">',
    '<div class="cv-language-row">',
    `<span class="cv-language-name">${escapeHtml(language)}</span>`,
    level === null ? '' : `<span class="cv-language-level">${level}/10</span>`,
    '</div>',
    level === null
      ? ''
      : `<div class="cv-language-meter"><span style="width:${percentage}%;"></span></div>`,
    '</li>',
  ].join('');
};

const compileLanguages = (block: CvLanguagesBlock): string => {
  const items = block.items.map(compileLanguageItem).filter((entry: string): boolean => entry.length > 0);
  if (items.length === 0) return '';
  return [
    '<div class="cv-languages">',
    block.label ? `<h3>${escapeHtml(block.label)}</h3>` : '',
    `<ul>${items.join('')}</ul>`,
    '</div>',
  ].join('');
};

const compileTechStack = (block: CvTechStackBlock): string => {
  const items = block.items.filter((item): boolean => item.label.trim().length > 0);
  if (items.length === 0) return '';
  return [
    '<div class="cv-tech-stack">',
    block.label ? `<h3>${escapeHtml(block.label)}</h3>` : '',
    '<ul>',
    ...items.map((item): string => {
      const icon =
        item.iconUrl.trim().length > 0
          ? `<img src="${escapeHtml(item.iconUrl)}" alt="" loading="eager">`
          : `<span class="cv-tech-fallback">${escapeHtml(item.label.slice(0, 2).toUpperCase())}</span>`;
      return `<li>${icon}<span>${escapeHtml(item.label)}</span></li>`;
    }),
    '</ul>',
    '</div>',
  ].join('');
};

const compileCustomText = (block: CvCustomTextBlock, context: CvRenderContext): string => [
  '<div class="cv-custom-text">',
  block.label ? `<h3>${escapeHtml(block.label)}</h3>` : '',
  `<div>${highlightHtmlText(block.html, context)}</div>`,
  '</div>',
].join('');

const compileDivider = (block: CvDividerBlock): string =>
  `<div class="cv-divider" style="border-color:${block.color};"></div>`;

const compileSpacer = (block: CvSpacerBlock): string =>
  `<div style="height:${block.height}px;"></div>`;

const compileStack = (block: CvStackBlock, context: CvRenderContext): string =>
  `<div class="cv-stack" style="gap:${block.gap}px;">${block.children.map((child: CvBlock): string => compileBlock(child, context)).join('')}</div>`;

const compileRow = (block: CvRowBlock, context: CvRenderContext): string =>
  `<div class="cv-row" style="background:${block.background};padding:${block.paddingY}px ${block.paddingX}px;">${block.children
    .map((child: CvBlock): string => compileBlock(child, context))
    .join('')}</div>`;

const compileColumns = (block: CvColumnsBlock, context: CvRenderContext): string => {
  if (block.children.length === 0) return '';
  return `<div class="cv-columns" style="gap:${block.gap}px;">${block.children
    .map((row: CvRowBlock): string => `<div class="cv-column">${compileRow(row, context)}</div>`)
    .join('')}</div>`;
};

const compileSection = (block: CvSectionBlock, context: CvRenderContext): string => [
  `<section class="cv-section" style="background:${block.background};padding:${block.paddingY}px ${block.paddingX}px;">`,
  block.label ? `<h2>${escapeHtml(block.label)}</h2>` : '',
  block.children.map((child: CvBlock): string => compileBlock(child, context)).join(''),
  '</section>',
].join('');

const compileBlock = (block: CvBlock, context: CvRenderContext): string => {
  switch (block.kind) {
    case 'profileHeader': return compileProfileHeader(block, context);
    case 'summary': return compileSummary(block, context);
    case 'experience': return compileExperience(block, context);
    case 'education': return compileEducation(block, context);
    case 'skills': return compileListBlock(block, context);
    case 'techStack': return compileTechStack(block);
    case 'languages': return compileLanguages(block);
    case 'customText': return compileCustomText(block, context);
    case 'divider': return compileDivider(block);
    case 'spacer': return compileSpacer(block);
    case 'section': return compileSection(block, context);
    case 'stack': return compileStack(block, context);
    case 'columns': return compileColumns(block, context);
    case 'row': return compileRow(block, context);
  }
};

export const compileCvBlocksToHtml = (
  blocks: CvBlock[],
  options: CompileCvBlocksToHtmlOptions = {}
): string => {
  const renderContext = buildCvRenderContext(blocks, options);
  const body = blocks.map((block: CvBlock): string => compileBlock(block, renderContext)).join('');
  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<style>',
    '@page{size:A4;margin:0;}',
    '*,*::before,*::after{box-sizing:border-box;}',
    ':root{--ink:#172033;--muted:#667085;--paper:#ffffff;--paper-soft:#f8fafc;--line:#e5e7eb;--line-strong:#cbd5e1;--accent:#2f5f8f;--accent-soft:#eaf2fb;--accent-faint:#f4f8fc;}',
    'body{margin:0;background:linear-gradient(180deg,#f7f9fc 0%,#eef3f8 100%);color:var(--ink);font-family:"Aptos","Avenir Next","Trebuchet MS",sans-serif;font-size:11.4px;line-height:1.5;}',
    '.cv-page{position:relative;width:210mm;min-height:297mm;margin:0 auto;background:linear-gradient(180deg,var(--paper) 0%,#fbfcfe 100%);padding:14mm 16mm 16mm;box-shadow:0 10px 28px rgba(15,23,42,.08);overflow:hidden;}',
    '.cv-page::before{content:"";position:absolute;left:16mm;right:16mm;top:0;height:2mm;background:linear-gradient(90deg,rgba(47,95,143,.72),rgba(47,95,143,.14));}',
    '.cv-page::after{display:none;}',
    '@media print{body{background:#fff}.cv-page{width:auto;min-height:297mm;margin:0;box-shadow:none;}}',
    '.cv-section{position:relative;break-inside:avoid;margin:0;border:0;border-top:1px solid var(--line);border-radius:0;background:transparent!important;padding:12px 0!important;box-shadow:none;}',
    '.cv-section:first-child{border-top:0;padding-top:0!important;}',
    '.cv-section h2{display:flex;align-items:center;gap:8px;margin:0 0 9px;padding:0;color:var(--accent);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:750;}',
    '.cv-section h2::before{content:"";width:18px;height:1px;background:var(--line-strong);}',
    '.cv-header{position:relative;overflow:hidden;margin:0 0 12px;border:1px solid var(--line);border-radius:8px;background:linear-gradient(135deg,#ffffff 0%,#f5f8fc 100%);color:var(--ink);box-shadow:none;}',
    '.cv-header-content{position:relative;z-index:1;padding:17px 18px 16px;}',
    '.cv-header-main{display:grid;grid-template-columns:minmax(0,1fr) 48px;gap:16px;align-items:start;}',
    '.cv-header-text{min-width:0;}',
    '.cv-monogram{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border:1px solid var(--line-strong);border-radius:6px;background:linear-gradient(180deg,#fff,#f8fafc);color:var(--accent);font-size:15px;font-weight:800;letter-spacing:0;}',
    '.cv-header h1{max-width:138mm;margin:0;color:var(--ink);font-size:31px;line-height:1.02;font-weight:780;letter-spacing:0;}',
    '.cv-headline{max-width:145mm;margin-top:6px;color:#344054;font-size:12.8px;font-weight:650;letter-spacing:0;}',
    '.cv-contact{display:flex;flex-wrap:wrap;gap:5px 0;margin-top:11px;color:var(--muted);font-size:10.5px;}',
    '.cv-contact > span{display:inline-flex;align-items:center;min-height:18px;border:0;border-radius:0;background:transparent;padding:0;}',
    '.cv-contact > span:not(:last-child)::after{content:"•";margin:0 7px;color:#cbd5e1;}',
    '.cv-contact a{color:var(--accent);text-decoration:none;}',
    '.cv-contact-icons{display:inline-flex;gap:5px;align-items:center;margin-left:7px;vertical-align:middle;}',
    '.cv-contact-icons::after{content:"" !important;}',
    '.cv-icon-link{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border:1px solid var(--line-strong);border-radius:4px;background:#fff;color:var(--accent);}',
    '.cv-icon-link svg{width:11px;height:11px;fill:currentColor;}',
    '.cv-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}',
    '.cv-summary{display:grid;grid-template-columns:3px minmax(0,1fr);gap:10px;border-radius:6px;background:linear-gradient(135deg,#ffffff 0%,var(--accent-faint) 100%);border:1px solid var(--line);padding:10px 11px;box-shadow:none;}',
    '.cv-summary-mark{width:3px;border-radius:999px;background:var(--accent);}',
    '.cv-summary-copy{color:#253041;font-size:11.9px;line-height:1.55;}',
    '.cv-summary p,.cv-entry-description p{margin:0 0 7px;}',
    '.cv-summary p:last-child,.cv-entry-description p:last-child{margin-bottom:0;}',
    '.cv-stack{display:flex;flex-direction:column;}',
    '.cv-columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));align-items:start;}',
    '.cv-column{min-width:0;}',
    '.cv-row{break-inside:avoid;background:transparent!important;}',
    '.cv-entry{position:relative;break-inside:avoid;margin:0 0 10px;padding:0 0 0 11px;}',
    '.cv-entry::before{content:"";position:absolute;left:0;top:5px;width:4px;height:4px;border-radius:999px;background:var(--accent);}',
    '.cv-entry-heading{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:4px;}',
    '.cv-entry h3,.cv-list-block h3,.cv-custom-text h3{margin:0 0 4px;color:var(--ink);font-size:12.8px;font-weight:760;letter-spacing:0;}',
    '.cv-entry-subtitle{color:#344054;font-size:11.8px;font-weight:650;}',
    '.cv-entry-location{margin:-1px 0 5px;color:var(--muted);font-size:10.6px;font-weight:650;}',
    '.cv-entry-period{white-space:nowrap;color:var(--muted);font-size:10.3px;font-weight:650;background:transparent;border-radius:0;padding:0;}',
    '.cv-entry-highlights{margin:4px 0 0 0;padding-left:16px;}',
    '.cv-entry-highlights li{margin:0 0 4px;}',
    '.cv-entry-highlights li::marker{color:var(--accent);}',
    '.cv-tech-mention{display:inline;border:0;border-radius:3px;background:linear-gradient(180deg,rgba(234,242,251,.9),rgba(234,242,251,.55));box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:0 3px;color:var(--accent);font-weight:650;}',
    '.cv-page,.cv-page *{font-family:"Aptos","Segoe UI","Helvetica Neue",sans-serif;}',
    '.cv-page h1,.cv-page h2,.cv-page h3,.cv-section-title,.cv-name{font-family:"Aptos Display","Aptos","Segoe UI",sans-serif;font-weight:650;letter-spacing:-0.015em;}',
    '.cv-page strong,.cv-page b,.cv-experience-title,.cv-education-title,.cv-card-title{font-weight:650;letter-spacing:-0.005em;}',
    '.cv-tech-stack img,.cv-tech-item img,.cv-tech-chip img,.cv-tech-pill img,.cv-tech-grid img{opacity:0.3;filter:saturate(0.85);}',
    '.cv-list-block ul{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none;}',
    '.cv-list-block li{border:1px solid var(--line);border-radius:5px;padding:3px 7px;background:#fff;color:#344054;font-weight:620;}',
    '.cv-tech-stack h3{margin:0 0 6px;color:var(--ink);font-size:12.8px;font-weight:760;}',
    '.cv-tech-stack ul{display:flex;flex-wrap:wrap;gap:7px;margin:0;padding:0;list-style:none;}',
    '.cv-tech-stack li{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:5px;padding:4px 8px 4px 5px;background:linear-gradient(180deg,#fff,#f9fbfd);color:#1f2937;font-weight:650;box-shadow:none;}',
    '.cv-tech-stack img,.cv-tech-fallback{width:17px;height:17px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;background:#fff;object-fit:contain;}',
    '.cv-tech-fallback{font-size:8px;font-weight:800;color:#0f172a;border:1px solid #e2e8f0;}',
    '.cv-languages h3{margin:0 0 8px;color:var(--ink);font-size:12.8px;font-weight:760;}',
    '.cv-languages ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;margin:0;padding:0;list-style:none;}',
    '.cv-language-item{break-inside:avoid;border:1px solid var(--line);border-radius:6px;background:linear-gradient(180deg,#fff,#f9fbfd);padding:7px 8px;}',
    '.cv-language-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;}',
    '.cv-language-name{font-weight:720;color:var(--ink);}',
    '.cv-language-level{font-size:10px;font-weight:720;color:var(--muted);background:transparent;border-radius:0;padding:0;white-space:nowrap;}',
    '.cv-language-meter{height:4px;overflow:hidden;border-radius:999px;background:#e5e7eb;}',
    '.cv-language-meter span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,rgba(47,95,143,.78),rgba(47,95,143,.38));}',
    '.cv-custom-text p{margin:0 0 7px;}',
    '.cv-custom-text ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 12px;margin:0;padding:0;list-style:none;}',
    '.cv-custom-text li{position:relative;margin:0;padding-left:14px;color:#344054;font-weight:600;}',
    '.cv-custom-text li::before{content:"";position:absolute;left:0;top:.62em;width:4px;height:4px;border-radius:999px;background:var(--accent);}',
    '.cv-divider{border-top:1px solid var(--line);height:1px;margin:8px 0;}',
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
      return [block.label, block.items.join(', '), ''];
    case 'languages':
      return [
        block.label,
        block.items
          .map((item) => typeof item === 'string' ? item : `${item.language} ${item.level}/10`)
          .join(', '),
        '',
      ];
    case 'techStack':
      return [block.label, block.items.map((item) => item.label).join(', '), ''];
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
