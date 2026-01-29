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

  // Fix apiHandlerWithParams
  // We look for the pattern: export const METHOD = apiHandlerWithParams<TYPE>( async ... => async ... => HANDLER(req, { params: Promise.resolve(params) }), { source: "..." });
  
  const withParamsMatch = content.matchAll(/export const (GET|POST|PUT|DELETE|PATCH) = apiHandlerWithParams<([^>]+)>([\s\S]*?=>\s*[^(\s]+)\(req,\s*{\s*params:\s*Promise.resolve(params)\s*\}\),\s*{/g);
  
  for (const match of withParamsMatch) {
      const fullMatch = match[0];
      const method = match[1];
      const type = match[2];
      const handler = match[3];
      
      const replacement = `export const ${method} = apiHandlerWithParams<${type.trim()}>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: ${type.trim()}): Promise<Response> => ${handler.trim()}(req, { params: Promise.resolve(params) }),
  {`;
      
      if (fullMatch !== replacement && fullMatch.includes('=> async')) {
          content = content.replace(fullMatch, replacement);
          changed = true;
      }
  }

  // Fix apiHandler
  const handlerMatch = content.matchAll(/export const (GET|POST|PUT|DELETE|PATCH) = apiHandler([\s\S]*?=>\s*[^(\s]+)\(req,\s*ctx\),\s*{/g);
  for (const match of handlerMatch) {
      const fullMatch = match[0];
      const method = match[1];
      const handler = match[2];
      
      const replacement = `export const ${method} = apiHandler(
  async (req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> => ${handler.trim()}(req, _ctx),
  {`;
      
      if (fullMatch !== replacement && fullMatch.includes('=> async')) {
          content = content.replace(fullMatch, replacement);
          changed = true;
      }
  }

  // Ensure imports
  if (content.includes('ApiHandlerContext')) {
      if (!content.includes('import { NextRequest') && !content.includes('import { ..., NextRequest')) {
          if (content.includes('import { NextResponse } from "next/server"')) {
              content = content.replace('import { NextResponse }', 'import { NextRequest, NextResponse }');
              changed = true;
          } else if (content.includes('import { NextResponse } from \'next/server\'')) {
              content = content.replace('import { NextResponse }', 'import { NextRequest, NextResponse }');
              changed = true;
          }
      }
      
      if (!content.includes('ApiHandlerContext') || (!content.includes('import type { ApiHandlerContext') && !content.includes('import { ApiHandlerContext') && !content.includes('type { ..., ApiHandlerContext'))) {
          if (content.includes('from "@/shared/lib/api/api-handler"')) {
              if (content.includes('import { apiHandler')) {
                  content = content.replace(/import \{([^}]*)\} from "@\/shared\/lib\/api\/api-handler";/g, 'import { $1, type ApiHandlerContext } from "@/shared/lib/api/api-handler";');
                  changed = true;
              }
          }
      }
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});
