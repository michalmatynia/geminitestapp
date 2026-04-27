export const parseExtractionRequest = (
  prompt?: string
): { type: 'product_names' | 'emails' | 'batch_image'; count: number | null } | null => {
  if (!prompt) return null;
  
  if (/generate\s+images/i.test(prompt)) {
    const countMatch = prompt.match(/(\d+)\s*images/i);
    return { type: 'batch_image', count: countMatch ? Number(countMatch[1]) : 1 };
  }

  const taskTypeHint = /task type:\s*extract_info/i.test(prompt);
  const wantsExtraction = taskTypeHint || /(extract|collect|find|list|get)\b/i.test(prompt);
  if (/task type:\s*web_task/i.test(prompt) && !wantsExtraction) return null;
  if (!wantsExtraction) return null;
  const isProduct = /product/i.test(prompt);
  const isEmail = /email/i.test(prompt);
  const countMatch = prompt.match(/(\d+)\s*(?:products?|product names?|emails?)/i);
  const count = countMatch ? Number(countMatch[1]) : null;
  if (isEmail) {
    return { type: 'emails', count };
  }
  if (isProduct) {
    return { type: 'product_names', count };
  }
  if (taskTypeHint) {
    return { type: 'emails', count };
  }
  return null;
};
