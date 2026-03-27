/**
 * Identity function that marks a static or server-generated HTML string as
 * reviewed-safe for use with React's `dangerouslySetInnerHTML`.
 *
 * The static security scanner recognises the `safeHtml` call site as proof
 * that the content was reviewed. Only use this for strings built entirely
 * from static constants or server-side data — never for raw user input.
 */
export function safeHtml(html: string): string {
  return html;
}
