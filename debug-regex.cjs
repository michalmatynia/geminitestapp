const fs = require('fs');
const path = require('path');

const filePath = 'src/app/api/auth/users/[id]/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Content tail:');
console.log(content.slice(-300));

// Simplified regex with nested paren support and flexibility
const exportRegex = /export\s+const\s+(\w+)\s*=\s*apiHandlerWithParams<([^>]+)>\s*\(\s*(?:async\s*)?\(.*?\)\s*(?::\s*.*?)?=>\s*(\w+)\s*\(.*?\)\s*,\s*{\s*source:\s*"([^"]+)"\s*}\s*\)\s*;?/gs;

const matches = content.match(exportRegex);
console.log('Matches:', matches);

if (matches) {
  content = content.replace(exportRegex, (match, method, paramsType, handlerName, source) => {
    console.log(`Matched method: ${method}`);
    return `export const ${method} = apiHandlerWithParams<${paramsType}>(${handlerName}, { source: "${source}" });`;
  });
  console.log('New content:');
  console.log(content.slice(-200));
}
