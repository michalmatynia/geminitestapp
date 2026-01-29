import fs from 'fs';
import path from 'path';

const filesToFix = [
  "src/app/api/auth/users/[id]/route.ts",
  "src/app/api/currencies/[id]/route.ts",
  "src/app/api/chatbot/sessions/[sessionId]/messages/route.ts",
  "src/app/api/auth/users/[id]/security/route.ts",
  "src/app/api/drafts/[id]/route.ts",
  "src/app/api/cms/blocks/[id]/route.ts",
  "src/app/api/cms/slugs/[id]/route.ts",
  "src/app/api/cms/pages/[id]/route.ts",
  "src/app/api/catalogs/[id]/route.ts",
  "src/app/api/countries/[id]/route.ts"
];

filesToFix.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Fix duplicate/messy imports in auth/users/[id]/route.ts
  if (file === "src/app/api/auth/users/[id]/route.ts") {
      content = content.replace(/import \{  apiHandlerWithParams, type ApiHandlerContext , type ApiHandlerContext \} from "@\/shared\/lib\/api\/api-handler";/, 'import { apiHandlerWithParams, type ApiHandlerContext } from "@/shared/lib/api/api-handler";');
      changed = true;
  }

  // 2. Generic fix for apiHandlerWithParams broken pattern
  // We match the whole export line up to the handler call and replace it.
  const brokenWithParamsRegex = /export const (GET|POST|PUT|DELETE|PATCH) = apiHandlerWithParams<([^>]+)>(\s*async\s*\([^)]*\)\s*:\s*Promise<Response>\s*=>\s*async\s*\([^)]*\)\s*=>\s*([^(\s]+)\(req,\s*\{\s*params:\s*Promise\.resolve\(params\)\s*\}\,\s*\{\/g;
  
  if (content.match(brokenWithParamsRegex)) {
      content = content.replace(brokenWithParamsRegex, 'export const $1 = apiHandlerWithParams<$2>(\n  async (req: NextRequest, _ctx: ApiHandlerContext, params: $2): Promise<Response> => $3(req, { params: Promise.resolve(params) }),\n  {');
      changed = true;
  }

  // 3. Generic fix for apiHandler broken pattern
  const brokenRegex = /export const (GET|POST|PUT|DELETE|PATCH) = apiHandler\(\s*async\s*\([^)]*\)\s*:\s*Promise<Response>\s*=>\s*async\s*\([^)]*\)\s*=>\s*([^(\s]+)\(req,\s*ctx\),\s*\{/g;
  if (content.match(brokenRegex)) {
      content = content.replace(brokenRegex, 'export const $1 = apiHandler(\n  async (req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> => $2(req, _ctx),\n  {');
      changed = true;
  }

  // 4. Ensure NextRequest and ApiHandlerContext are imported
  if (content.includes('ApiHandlerContext') || content.includes('NextRequest')) {
      if (!content.includes('import { NextRequest') && !content.includes('import { ..., NextRequest')) {
          if (content.includes('import { NextResponse } from "next/server"')) {
              content = content.replace('import { NextResponse }', 'import { NextRequest, NextResponse }');
              changed = true;
          }
      }
      
      if (!content.includes('ApiHandlerContext') || !content.includes('import')) {
          const handlerImport = content.match(/import \{([^}]*)\} from "@\/shared\/lib\/api\/api-handler";/);
          if (handlerImport && !handlerImport[0].includes('ApiHandlerContext')) {
              content = content.replace(handlerImport[0], `import {${handlerImport[1]}, type ApiHandlerContext} from "@/shared/lib/api/api-handler";`);
              changed = true;
          }
      }
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});
