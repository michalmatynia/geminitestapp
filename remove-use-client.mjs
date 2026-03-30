import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function removeUseClientDirective(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Match "use client"; anywhere in the file with multiline flag for flexibility
  // This captures: optional leading blank lines/comments + the directive + following blank lines
  const match = content.match(/^[\s\S]*?['"]use client['"];?\s*\n*/m);
  
  if (!match || !match[0].includes('use client')) {
    return false;
  }
  
  // Only remove if "use client" is actually in the match
  let modified = content.replace(match[0], '');
  
  // Clean up any excessive leading blank lines that resulted
  modified = modified.replace(/^\n+/, '\n');
  
  // Only write if changed
  if (modified !== content) {
    fs.writeFileSync(filePath, modified, 'utf8');
    return true;
  }
  
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next')) {
        count += walkDir(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (removeUseClientDirective(filePath)) {
        count++;
      }
    }
  });
  
  return count;
}

const srcDir = path.join(__dirname, 'src');
const removed = walkDir(srcDir);
console.log(`Total files modified: ${removed}`);
