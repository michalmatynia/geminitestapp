export function sanitizeHtml(html: string): string {
  if (!html) return '';

  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof DOMParser === 'undefined'
  ) {
    // Basic SSR/test fallback: remove <script> tags at minimum
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc?.body) {
      return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    }

    const sanitizeNode = (node: Node): void => {
      if (node.nodeType === 1) {
        // Element
        const el = node as HTMLElement;
        const tagName = el.tagName.toUpperCase();

        // Remove dangerous tags
        if (
          tagName === 'SCRIPT' ||
          tagName === 'OBJECT' ||
          tagName === 'EMBED' ||
          tagName === 'IFRAME'
        ) {
          el.remove();
          return;
        }

        // Remove on* attributes
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toUpperCase();
          if (attrName.startsWith('ON')) {
            el.removeAttribute(attr.name);
          }

          // Prevent javascript: URLs in href/src
          if (
            (attrName === 'HREF' || attrName === 'SRC') &&
            attr.value.trim().toLowerCase().startsWith('javascript:')
          ) {
            el.removeAttribute(attr.name);
          }
        }
      }

      // Recurse through children
      const children = Array.from(node.childNodes);
      children.forEach(sanitizeNode);
    };

    sanitizeNode(doc.body);
    return doc.body.innerHTML;
  } catch (error) {
    void (async (): Promise<void> => {
      try {
        const { logClientError } = await import('@/shared/utils/observability/client-error-logger');
        logClientError(error instanceof Error ? error : new Error('HTML Sanitization failed'), {
          context: { source: 'sanitization', htmlLength: html.length },
        });
      } catch {
        /* ignore */
      }
    })();
    // Return partially sanitized HTML as ultimate fallback instead of empty string
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
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
  if (!normalized) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"></svg>`;
  }
  if (/<svg[\s>]/i.test(normalized)) {
    return normalized;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${normalized}</svg>`;
};

export function sanitizeSvg(svg: string, options?: { viewBox?: string }): string {
  const wrappedSvg = ensureSvgRoot(svg, options?.viewBox ?? '0 0 100 100');

  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof DOMParser === 'undefined' ||
    typeof XMLSerializer === 'undefined'
  ) {
    return sanitizeSvgFallback(wrappedSvg);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(wrappedSvg, 'image/svg+xml');
    const root = doc.documentElement;

    if (!root || root.nodeName.toLowerCase() === 'parsererror') {
      return sanitizeSvgFallback(wrappedSvg);
    }

    const sanitizeElement = (element: Element): void => {
      const tagName = element.tagName.toUpperCase();
      if (DANGEROUS_SVG_TAG_NAMES.has(tagName)) {
        element.remove();
        return;
      }

      for (const attribute of Array.from(element.attributes)) {
        const attributeName = attribute.name.toLowerCase();
        const attributeValue = attribute.value.trim();

        if (attributeName.startsWith('on')) {
          element.removeAttribute(attribute.name);
          continue;
        }

        if (attributeName === 'href' || attributeName === 'xlink:href' || attributeName === 'src') {
          if (!SVG_LOCAL_REFERENCE_PATTERN.test(attributeValue)) {
            element.removeAttribute(attribute.name);
          }
          continue;
        }

        if (
          attributeName === 'style' &&
          /(javascript:|expression\(|url\(\s*https?:|url\(\s*\/\/)/i.test(attributeValue)
        ) {
          element.removeAttribute(attribute.name);
          continue;
        }

        if (/javascript:/i.test(attributeValue)) {
          element.removeAttribute(attribute.name);
        }
      }

      Array.from(element.children).forEach(sanitizeElement);
    };

    sanitizeElement(root);

    if (!root.getAttribute('xmlns')) {
      root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    if (!root.getAttribute('viewBox')) {
      root.setAttribute('viewBox', options?.viewBox ?? '0 0 100 100');
    }

    return new XMLSerializer().serializeToString(root);
  } catch (error) {
    void (async (): Promise<void> => {
      try {
        const { logClientError } = await import('@/shared/utils/observability/client-error-logger');
        logClientError(error instanceof Error ? error : new Error('SVG Sanitization failed'), {
          context: { source: 'sanitization', svgLength: svg.length },
        });
      } catch {
        /* ignore */
      }
    })();

    return sanitizeSvgFallback(wrappedSvg);
  }
}
