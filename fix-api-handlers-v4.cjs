const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

function fixExports(filePath) {
  if (!filePath.endsWith('route.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Working regex for apiHandlerWithParams exports
  const exportRegex = /export\s+const\s+(\w+)\s*=\s*apiHandlerWithParams<([^>]+)>\s*\(\s*(?:async\s*)?\(.*?\)\s*(?::\s*.*?)?=>\s*(\w+)\s*\(.*?\)\s*,\s*{\s*source:\s*"([^"]+)"\s*}\s*\)\s*;?/gs;
  
  content = content.replace(exportRegex, (match, method, paramsType, handlerName, source) => {
    console.log(`Found export ${method} in ${filePath}`);
    return `export const ${method} = apiHandlerWithParams<${paramsType}>(${handlerName}, { source: "${source}" });`;
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

const apiDir = path.join(process.cwd(), 'src/app/api');
let fixedCount = 0;
walk(apiDir, (filePath) => {
  if (fixExports(filePath)) fixedCount++;
});

console.log(`Fixed exports in ${fixedCount} files`);