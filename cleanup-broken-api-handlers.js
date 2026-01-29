import fs from 'fs';
import path from 'path';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

const apiFiles = getAllFiles('src/app/api', []).concat(getAllFiles('src/features', [])).filter(f => f.endsWith('route.ts'));

apiFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Pattern found in user prompt:
  // => async (req: NextRequest(req, { params: Promise.resolve(params) }), _ctx: ApiHandlerContext, params: { id: string }) => PATCH_handler(req, { params: Promise.resolve(params) })
  const brokenWithParamsRegex2 = /apiHandlerWithParams<([^>]+)>(\s*async\s*\([^)]*\)\s*:\s*Promise<Response>\s*=>\s*async\s*\(req:\s*NextRequest\(req,\s*{\s*params:\s*Promise\.resolve\(params\)\s*}\),\s*[^)]*\)\s*=>\s*([^(\s]+)\(req,\s*{\s*params:\s*Promise\.resolve\(params\)\s*}\),\s*{/g;
  if (content.match(brokenWithParamsRegex2)) {
      content = content.replace(brokenWithParamsRegex2, 'apiHandlerWithParams<$1>(\n  async (req: NextRequest, _ctx: ApiHandlerContext, params: $1): Promise<Response> => $2(req, { params: Promise.resolve(params) }),\n  {');
      changed = true;
  }

  // Other nested async pattern for apiHandlerWithParams
  const brokenWithParamsRegex = /apiHandlerWithParams<([^>]+)>(\s*async\s*\([^)]*\)\s*:\s*Promise<Response>\s*=>\s*async\s*\([^)]*\)\s*=>\s*([^(\s]+)\(req,\s*{\s*params:\s*Promise\.resolve\(params\)\s*}\),\s*{/g;
  if (content.match(brokenWithParamsRegex)) {
      content = content.replace(brokenWithParamsRegex, 'apiHandlerWithParams<$1>(\n  async (req: NextRequest, _ctx: ApiHandlerContext, params: $1): Promise<Response> => $2(req, { params: Promise.resolve(params) }),\n  {');
      changed = true;
  }

  // Broken nested async patterns for apiHandler
  const brokenRegex = /apiHandler\(\s*async\s*\([^)]*\)\s*:\s*Promise<Response>\s*=>\s*async\s*\([^)]*\)\s*=>\s*([^(\s]+)\(req,\s*ctx\),\s*{\/g;
  if (content.match(brokenRegex)) {
      content = content.replace(brokenRegex, 'apiHandler(\n  async (req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> => $1(req, _ctx),\n  {');
      changed = true;
  }

  // Ensure NextRequest and ApiHandlerContext are imported if used
  if (content.includes('ApiHandlerContext') && !content.includes('import { NextRequest') && !content.includes('import { ..., NextRequest')) {
     if (content.includes('import { NextResponse } from "next/server"')) {
        content = content.replace('import { NextResponse }', 'import { NextRequest, NextResponse }');
        changed = true;
     } else if (content.includes('import { NextResponse } from \'next/server\'')) {
        content = content.replace('import { NextResponse }', 'import { NextRequest, NextResponse }');
        changed = true;
     }
  }

  if (content.includes('ApiHandlerContext') && !content.includes('import type { ApiHandlerContext') && !content.includes('import { ApiHandlerContext') && !content.includes('type { ..., ApiHandlerContext')) {
     const apiHandlerImportMatch = content.match(/import \{[^}]*\} from ["\]@\/shared\/lib\/api\/api-handler["\'];/);
     if (apiHandlerImportMatch) {
       content = content.replace(apiHandlerImportMatch[0], apiHandlerImportMatch[0] + '\nimport type { ApiHandlerContext } from "@/shared/types/api";');
       changed = true;
     } else if (content.includes('from "@/shared/lib/api/api-handler"')) {
        content = content.replace(/import \{([^}]*)\} from "@\/shared\/lib\/api\/api-handler";/g, 'import { $1, type ApiHandlerContext } from "@/shared/lib/api/api-handler";');
        changed = true;
     }
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});