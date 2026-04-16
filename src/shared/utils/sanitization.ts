import { dispatchClientCatch } from '@/shared/utils/observability/client-error-dispatch';

const HTML_SCRIPT_FALLBACK_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const DANGEROUS_HTML_TAG_NAMES = new Set(['SCRIPT', 'OBJECT', 'EMBED', 'IFRAME']);

const sanitizeHtmlFallback = (html: string): string =>
  html.replace(HTML_SCRIPT_FALLBACK_PATTERN, '');

const canUseDomHtmlSanitizer = (): boolean =>
  !(
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof DOMParser === 'undefined'
  );

const canUseDomSvgSanitizer = (): boolean =>
  !(
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof DOMParser === 'undefined' ||
    typeof XMLSerializer === 'undefined'
  );

const shouldRemoveHtmlAttribute = (attribute: Attr): boolean => {
  const attrName = attribute.name.toUpperCase();
  if (attrName.startsWith('ON')) {
    return true;
  }
  return (
    (attrName === 'HREF' || attrName === 'SRC') &&
    attribute.value.trim().toLowerCase().startsWith('javascript:')
  );
};

const sanitizeHtmlNode = (node: Node): void => {
  if (node.nodeType === 1) {
    const element = node as HTMLElement;
    if (DANGEROUS_HTML_TAG_NAMES.has(element.tagName.toUpperCase())) {
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      if (shouldRemoveHtmlAttribute(attribute)) {
        element.removeAttribute(attribute.name);
      }
    });
  }

  Array.from(node.childNodes).forEach(sanitizeHtmlNode);
};

export function sanitizeHtml(html: string): string {
  if (html.length === 0) return '';

  if (!canUseDomHtmlSanitizer()) {
    return sanitizeHtmlFallback(html);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (doc.body.nodeName === '') {
      // Dummy check to satisfy some logic if needed, but doc.body is not null in HTML mode
    }

    sanitizeHtmlNode(doc.body);
    return doc.body.innerHTML;
  } catch (error) {
    dispatchClientCatch(error instanceof Error ? error : new Error('HTML Sanitization failed'), {
      source: 'sanitization',
      action: 'sanitizeHtml',
      htmlLength: html.length,
      level: 'warn',
    });
    return sanitizeHtmlFallback(html);
  }
}

const DANGEROUS_SVG_TAG_NAMES = new Set(['SCRIPT', 'FOREIGNOBJECT', 'IFRAME', 'OBJECT', 'EMBED']);
const SVG_LOCAL_REFERENCE_PATTERN = /^#/;

const sanitizeSvgFallback = (svg: string): string =>
  svg
    .replace(/<\s*(script|foreignObject|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\s+on[a-z-]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s+on[a-z-]+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s+(href|xlink:href|src)\s*=\s*(['"])(?!#).*?\2/gi, '')
    .replace(/\s+(href|xlink:href|src)\s*=\s*(?!#)[^\s>]+/gi, '')
    .replace(/\s+style\s*=\s*(['"])[\s\S]*?(javascript:|expression\(|url\(\s*https?:).*?\1/gi, '')
    .replace(/javascript:/gi, '');

const ensureSvgRoot = (markup: string, viewBox: string): string => {
  const normalized = markup.trim();
  if (normalized.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"></svg>`;
  }
  if (/<svg[\s>]/i.test(normalized)) {
    return normalized;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${normalized}</svg>`;
};

const sanitizeSvgAttribute = (attribute: Attr): boolean => {
  const attributeName = attribute.name.toLowerCase();
  const attributeValue = attribute.value.trim();

  if (attributeName.startsWith('on')) {
    return true;
  }

  if (attributeName === 'href' || attributeName === 'xlink:href' || attributeName === 'src') {
    return !SVG_LOCAL_REFERENCE_PATTERN.test(attributeValue);
  }

  if (
    attributeName === 'style' &&
    /(javascript:|expression\(|url\(\s*https?:|url\(\s*\/\/)/i.test(attributeValue)
  ) {
    return true;
  }

  return /javascript:/i.test(attributeValue);
};

const sanitizeSvgElement = (element: Element): void => {
  const tagName = element.tagName.toUpperCase();
  if (DANGEROUS_SVG_TAG_NAMES.has(tagName)) {
    element.remove();
    return;
  }

  for (const attribute of Array.from(element.attributes)) {
    if (sanitizeSvgAttribute(attribute)) {
      element.removeAttribute(attribute.name);
    }
  }

  Array.from(element.children).forEach(sanitizeSvgElement);
};

const ensureSvgAttributes = (root: Element, viewBox: string): void => {
  if (root.getAttribute('xmlns') === null) {
    root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (root.getAttribute('viewBox') === null) {
    root.setAttribute('viewBox', viewBox);
  }
};

export function sanitizeSvg(svg: string, options?: { viewBox?: string }): string {
  const defaultViewBox = options?.viewBox ?? '0 0 100 100';
  const wrappedSvg = ensureSvgRoot(svg, defaultViewBox);

  if (!canUseDomSvgSanitizer()) {
    return sanitizeSvgFallback(wrappedSvg);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(wrappedSvg, 'image/svg+xml');
    const root = doc.documentElement;

    if (root.nodeName.toLowerCase() === 'parsererror') {
      return sanitizeSvgFallback(wrappedSvg);
    }

    sanitizeSvgElement(root);
    ensureSvgAttributes(root, defaultViewBox);

    return new XMLSerializer().serializeToString(root);
  } catch (error) {
    dispatchClientCatch(error instanceof Error ? error : new Error('SVG Sanitization failed'), {
      source: 'sanitization',
      action: 'sanitizeSvg',
      svgLength: svg.length,
      level: 'warn',
    });

    return sanitizeSvgFallback(wrappedSvg);
  }
}
