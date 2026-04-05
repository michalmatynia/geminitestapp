import fs from 'node:fs';
import path from 'node:path';

function extractExports(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const exports: string[] = [];
  
  const exportTypeRegex = /export\s+(?:type\s+)?\{\s*([^}]+)\s*\}/g;
  let match;
  while ((match = exportTypeRegex.exec(content)) !== null) {
    const symbols = match[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const sym of symbols) {
      if (sym.includes('from')) continue; 
      const name = sym.split(/\s+as\s+/)[0].trim();
      if (name) exports.push(name);
    }
  }

  const exportFromRegex = /export\s+(?:type\s+)?\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"]/g;
  while ((match = exportFromRegex.exec(content)) !== null) {
      const symbols = match[1].split(',').map(s => s.trim()).filter(Boolean);
      for (const sym of symbols) {
        const name = sym.split(/\s+as\s+/)[0].trim();
        if (name && name !== 'default') exports.push(name);
      }
  }

  const declRegex = /export\s+(?:interface|type|class|const|function|enum)\s+([A-Za-z0-9_]+)/g;
  while ((match = declRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  return exports;
}

function processBarrel(barrelPath: string, barrelName: string, map: Map<string, string>) {
  if (!fs.existsSync(barrelPath)) return;

  const barrelDir = fs.statSync(barrelPath).isDirectory() ? barrelPath : path.dirname(barrelPath);
  const content = fs.readFileSync(barrelPath, 'utf8');
  
  const regex = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    let subPath = match[1];
    if (!subPath.startsWith('.')) continue;

    const fullFilePath = path.join(barrelDir, subPath + (subPath.endsWith('.ts') ? '' : '.ts'));
    let actualFilePath = fullFilePath;
    if (!fs.existsSync(fullFilePath)) {
      actualFilePath = path.join(barrelDir, subPath, 'index.ts');
    }

    if (fs.existsSync(actualFilePath)) {
      const exports = extractExports(actualFilePath);
      let importPath = `${barrelName}/${subPath.replace(/^\.\//, '').replace(/\.ts$/, '')}`;
      for (const e of exports) {
        if (!map.has(e)) map.set(e, importPath);
      }
    }
  }

  const exportFromRegex = /export\s+(?:type\s+)?\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"]/g;
  exportFromRegex.lastIndex = 0;
  while ((match = exportFromRegex.exec(content)) !== null) {
    const symbolsRaw = match[1].split(',').map(s => s.trim()).filter(Boolean);
    const targetPath = match[2];
    if (targetPath.startsWith('.')) {
      let importPath = `${barrelName}/${targetPath.replace(/^\.\//, '').replace(/\.ts$/, '')}`;
      for (const raw of symbolsRaw) {
        const name = raw.split(/\s+as\s+/)[0].trim();
        if (!map.has(name)) map.set(name, importPath);
      }
    }
  }
}

const symbolsMap = new Map<string, string>();

processBarrel(path.resolve('src/shared/contracts/ui.ts'), '@/shared/contracts/ui', symbolsMap);
processBarrel(path.resolve('src/shared/contracts/products/index.ts'), '@/shared/contracts/products', symbolsMap);
processBarrel(path.resolve('src/shared/contracts/case-resolver/index.ts'), '@/shared/contracts/case-resolver', symbolsMap);
processBarrel(path.resolve('src/shared/contracts/image-studio.ts'), '@/shared/contracts/image-studio', symbolsMap);
processBarrel(path.resolve('src/shared/contracts/integrations/index.ts'), '@/shared/contracts/integrations', symbolsMap);

function processFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const replaceImport = (barrelPath: string) => {
    const regex = new RegExp(`import\\s+(type\\s+)?\\{([^}]+)\\}\\s+from\\s+['"]${barrelPath}['"];?`, 'g');
    let match;
    const replacements: { start: number, end: number, newCode: string }[] = [];

    while ((match = regex.exec(content)) !== null) {
      const isType = match[1] ? 'type ' : '';
      const symbolsStr = match[2];
      const symbols = symbolsStr.split(',').map(s => s.trim()).filter(Boolean);
      
      const newImports = new Map<string, string[]>(); 
      let unmapped: string[] = [];

      for (const symRaw of symbols) {
        const symLabel = symRaw.split(/\s+as\s+/)[0].trim();
        const mappedPath = symbolsMap.get(symLabel);
        if (mappedPath) {
          if (!newImports.has(mappedPath)) newImports.set(mappedPath, []);
          newImports.get(mappedPath)!.push(symRaw);
        } else {
          unmapped.push(symRaw);
        }
      }

      let replacementCode = '';
      for (const [subPath, syms] of Array.from(newImports.entries())) {
        replacementCode += `import ${isType}{ ${syms.join(', ')} } from '${subPath}';\n`;
      }
      
      if (unmapped.length > 0) {
        replacementCode += `import ${isType}{ ${unmapped.join(', ')} } from '${barrelPath}';\n`;
      }

      if (replacementCode) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          newCode: replacementCode.trim()
        });
      }
    }

    for (let i = replacements.length - 1; i >= 0; i--) {
      const repl = replacements[i];
      content = content.slice(0, repl.start) + repl.newCode + content.slice(repl.end);
      modified = true;
    }
  };

  replaceImport('@/shared/contracts/ui');
  replaceImport('@/shared/contracts/products');
  replaceImport('@/shared/contracts/case-resolver');
  replaceImport('@/shared/contracts/image-studio');
  replaceImport('@/shared/contracts/integrations');

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function walk(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(fullPath);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

walk(path.resolve('src'));
walk(path.resolve('packages'));

console.log('Done mapping phase3 barrels.');
