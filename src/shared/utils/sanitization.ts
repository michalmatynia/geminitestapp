export function sanitizeHtml(html: string): string {
  if (!html) return '';

  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof DOMParser === 'undefined') {
    // Basic SSR/test fallback: remove <script> tags at minimum
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    if (!doc || !doc.body) {
      return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    }
    
    const sanitizeNode = (node: Node): void => {
      if (node.nodeType === 1) { // Element
        const el = node as HTMLElement;
        const tagName = el.tagName.toUpperCase();
        
        // Remove dangerous tags
        if (tagName === 'SCRIPT' || tagName === 'OBJECT' || tagName === 'EMBED' || tagName === 'IFRAME') {
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
    void (async (): Promise<void> => {
      try {
        const { logClientError } = await import('@/shared/utils/observability/client-error-logger');
        logClientError(error instanceof Error ? error : new Error('HTML Sanitization failed'), {
          context: { source: 'sanitization', htmlLength: html.length },
        });
      } catch { /* ignore */ }
    })();
    // Return partially sanitized HTML as ultimate fallback instead of empty string
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  }
}