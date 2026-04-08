const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Regex to find import statements from 'next/navigation'
  const importRegex = /import\s+{(.*?)}\s+from\s+['"]next\/navigation['"];/g;
  
  content = content.replace(importRegex, (match, imports) => {
    // split by comma and trim
    const names = imports.split(',').map(n => n.trim());
    
    if (names.includes('useRouter')) {
      const otherNames = names.filter(n => n !== 'useRouter' && n !== '');
      let result = `import { useRouter } from 'nextjs-toploader/app';\n`;
      if (otherNames.length > 0) {
        result += `import { ${otherNames.join(', ')} } from 'next/navigation';`;
      }
      return result.trim();
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(process.cwd(), 'src/features'));
walkDir(path.join(process.cwd(), 'src/app'));
