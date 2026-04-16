const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/api/v2/products/[[...path]]/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Map of module names to their import paths
const importMap = new Map();
const importRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"](.+)['"];/g;
let match;
while ((match = importRegex.exec(content)) !== null) {
  importMap.set(match[1], match[2]);
}

// Remove static imports of route modules
content = content.replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]\.\.?\/.+['"];\n/g, '');

// Replace module: X with loader: () => import('PATH').then(m => m as any)
const routeRegex = /module:\s+(\w+)/g;
content = content.replace(routeRegex, (m, moduleName) => {
  const importPath = importMap.get(moduleName);
  if (importPath) {
    return `loader: () => import('${importPath}')`;
  }
  return m;
});

// Add CatchAllRouteModule type import if needed
if (!content.includes('CatchAllRouteModule')) {
    content = content.replace("type CatchAllRoutePathParams as RouteParams,", "type CatchAllRoutePathParams as RouteParams,\n  type CatchAllRouteModule,");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored products catch-all router to use dynamic imports.');
