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
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Ensure NextRequest is imported if needed
  if ((content.includes('NextRequest') || content.includes('apiHandler')) && !content.includes('import { NextRequest')) {
    if (content.includes('import { NextResponse } from "next/server"')) {
      content = content.replace('import { NextResponse }', 'import { NextRequest, NextResponse }');
      changed = true;
    } else if (content.includes('import { NextResponse } from \'next/server\'')) {
      content = content.replace('import { NextResponse }', 'import { NextRequest, NextResponse }');
      changed = true;
    } else if (!content.includes('from "next/server"')) {
      content = 'import { NextRequest } from "next/server";\n' + content;
      changed = true;
    }
  }

  // 2. Ensure ApiHandlerContext is imported if needed
  if ((content.includes('apiHandler(') || content.includes('apiHandlerWithParams(')) && !content.includes('ApiHandlerContext')) {
     if (content.includes('from "@/shared/types/api"')) {
       content = content.replace(/import type \{([^}]*)\} from "@\/shared\/types\/api";/g, 'import type { ApiHandlerContext, $1 } from "@/shared/types/api";');
       changed = true;
     } else {
       const apiHandlerImportMatch = content.match(/import \{[^}]*\} from ["']@\/shared\/lib\/api\/api-handler["'];/);
       if (apiHandlerImportMatch) {
         content = content.replace(apiHandlerImportMatch[0], apiHandlerImportMatch[0] + '\nimport type { ApiHandlerContext } from "@/shared/types/api";');
         changed = true;
       }
     }
  }

  // 3. Fix handler signatures (GET_handler etc)
  // async function GET_handler(req: NextRequest) { -> async function GET_handler(req: NextRequest): Promise<Response> {
  content = content.replace(/async function (GET|POST|PUT|DELETE|PATCH)_handler\(([^:)]*:[^)]*)\) \{/g, (match, p1, p2) => {
    if (!match.includes('): Promise<Response>')) {
        changed = true;
        return `async function ${p1}_handler(${p2}): Promise<Response> {`;
    }
    return match;
  });
  // Handle case where req is not typed yet
  content = content.replace(/async function (GET|POST|PUT|DELETE|PATCH)_handler\(\s*req\s*\) \{/g, (match, p1) => {
    changed = true;
    return `async function ${p1}_handler(req: NextRequest): Promise<Response> {`;
  });
  // Handle case where req is typed as Request
  content = content.replace(/async function (GET|POST|PUT|DELETE|PATCH)_handler\(\s*req:\s*Request/g, (match, p1) => {
    changed = true;
    return `async function ${p1}_handler(req: NextRequest`;
  });

  // 4. Fix apiHandler exports
  // export const GET = apiHandler(GET_handler, ...
  content = content.replace(/export const (GET|POST|PUT|DELETE|PATCH) = apiHandler\(([^,]+),/g, (match, p1, p2) => {
      changed = true;
      return `export const ${p1} = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => ${p2}(req, ctx),
`;
  });

  // 5. Fix apiHandlerWithParams exports
  // export const GET = apiHandlerWithParams<T>(GET_handler, ...
  content = content.replace(/export const (GET|POST|PUT|DELETE|PATCH) = apiHandlerWithParams<([^>]+)>\(([^,]+),/g, (match, p1, p2, p3) => {
      changed = true;
      return `export const ${p1} = apiHandlerWithParams<${p2}>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: ${p2}): Promise<Response> => ${p3}(req, { params: Promise.resolve(params) }),
`;
  });

  if (changed) {
    fs.writeFileSync(file, content);
  }
});
