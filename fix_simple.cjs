const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
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

  // Fix GET_handler(req: NextRequest, ctx: Ctx) pattern
  content = content.replace(/async function (\w+)_handler\(req: NextRequest, ctx: Ctx\): Promise<Response | NextResponse> \{/g, 
    'async function $1_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {');
  
  content = content.replace(/async function (\w+)_handler\(req: NextRequest, ctx: Ctx\): Promise<NextResponse | Response> \{/g, 
    'async function $1_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {');

  // Fix exports
  content = content.replace(/export const (\w+) = apiHandlerWithParams<\{ id: string \}>\(\s*async \([^)]*\) => (\w+)_handler\(req, \{ params: Promise\.resolve\(params\) \}\),\s*\{ source: "([^"]+)" \}\s*\);/g,
    'export const $1 = apiHandlerWithParams<{ id: string }>($2_handler, { source: "$3" });');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

const apiDir = path.join(process.cwd(), 'src/app/api');
walk(apiDir, fixFile);
