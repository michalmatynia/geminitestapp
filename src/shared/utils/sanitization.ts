/**
 * Basic HTML sanitization to prevent XSS while allowing specific safe tags and attributes.
 * This implementation uses browser-native DOMParser for robustness on the client side.
 */

const SAFE_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
  'P', 'BR', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR',
  'STRONG', 'EM', 'B', 'I', 'CODE', 'PRE', 
  'A', 'IMG', 'SPAN', 'DIV',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD'
]);

const SAFE_ATTRIBUTES = new Set([
  'HREF', 'SRC', 'ALT', 'TITLE', 'STYLE', 'TARGET', 'REL',
  'DATA-CODE', 'DATA-COPY-CODE'
]);

/**
 * Sanitizes an HTML string by removing unsafe tags and attributes.
 * Falls back to basic escaping if DOMParser is unavailable (SSR).
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    // Basic SSR fallback: remove <script> tags at minimum
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const sanitizeNode = (node: Node): void => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toUpperCase();
        
        if (!SAFE_TAGS.has(tagName)) {
          // Remove unsafe element but keep its text content
          while (el.firstChild) {
            el.parentNode?.insertBefore(el.firstChild, el);
          }
          el.parentNode?.removeChild(el);
          return;
        }
        
        // Remove unsafe attributes
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toUpperCase();
          if (!SAFE_ATTRIBUTES.has(attrName)) {
            el.removeAttribute(attr.name);
          }
          
          // Prevent javascript: URLs in href/src
          if ((attrName === 'HREF' || attrName === 'SRC') && 
              attr.value.trim().toLowerCase().startsWith('javascript:')) {
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
    console.error('HTML Sanitization failed:', error);
    return ''; // Return empty on failure for safety
  }
}
