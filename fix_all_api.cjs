const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

function fixFile(filePath) {
  if (!filePath.endsWith('route.ts')) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // 1. Fix imports
  if (!content.includes('import type { ApiHandlerContext } from "@/shared/types/api";')) {
    if (content.includes('import { apiHandler')) {
      content = content.replace(/import\s+\{[^}]*apiHandler[^}]*\}\s+from\s+\"@\/shared\/lib\/api\/api-handler\";/, 
        (match) => match + '\nimport type { ApiHandlerContext } from "@/shared/types/api";');
    }
  }

  // 2. Remove redundant types and helpers
  content = content.replace(/type\s+Params\s*=\s*\{[^}]+\};?\n/g, '');
  content = content.replace(/type\s+Ctx\s*=\s*[^;]+;?\n/g, '');
  content = content.replace(/async\s+function\s+(?:getParams|getId)\s*\(ctx:\s*Ctx\)\s*:\s*Promise<[^>]+>\s*\{[\s\S]*?\}\n/g, '');

  // 3. Fix handler signatures
  const isDynamic = content.includes('apiHandlerWithParams');
  
  if (isDynamic) {
    // Dynamic handlers
    const dynamicRegex = /async\s+function\s+(\w+)_handler\s*\(\s*(_?req):\s*NextRequest\s*,\s*(?:ctx|props):\s*Ctx\s*\)\s*:\s*Promise\s*<[^>]+>\s*\{/g;
    content = content.replace(dynamicRegex, (match, method, reqName) => {
      return `async function ${method}_handler(${reqName}: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {`;
    });
  } else {
    // Simple handlers
    const simpleRegex = /async\s+function\s+(\w+)_handler\s*\(\s*(_?req):\s*NextRequest\s*\)\s*:\s*Promise\s*<[^>]+>\s*\{/g;
    content = content.replace(simpleRegex, (match, method, reqName) => {
      return `async function ${method}_handler(${reqName}: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {`;
    });
  }

  // 4. Fix body usage
  content = content.replace(/const\s+\{?\s*id\s*\}?\s*=\s*await\s+(?:getId|getParams)\(ctx\);/g, 'const id = params.id;');
  content = content.replace(/const\s+\{?\s*id\s*\}?\s*=\s*await\s+params\.id;/g, 'const id = params.id;');

  // 5. Fix exports
  if (isDynamic) {
    const exportLambdaRegex = /export\s+const\s+(\w+)\s*=\s*apiHandlerWithParams<\{ id: string \}\>\(\s*(?:async\s*)?\([^)]*\)\s*=>\s*(\w+)_handler\s*\([^)]*\)\s*,\s*{\s*source:\s*\