const fs = require('fs');
const path = require('path');

function removeUseClientDirective(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Match "use client"; or 'use client'; at the start, possibly with preceding whitespace
  const match = content.match(/^['"]use client['"];?\s*/);
  
  if (!match) {
    return false; // File doesn't have the directive
  }
  
  // Remove the directive and any following blank lines
  let modified = content.substring(match[0].length);
  
  // Remove any leading blank lines after removal
  modified = modified.replace(/^\n+/, '');
  
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
      count += walkDir(filePath);
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && 
               !file.includes('node_modules') &&
               !file.includes('.next')) {
      if (removeUseClientDirective(filePath)) {
        console.log(`✓ ${filePath}`);
        count++;
      }
    }
  });
  
  return count;
}

const srcDir = path.join(process.cwd(), 'src');
const removed = walkDir(srcDir);
console.log(`\nTotal files modified: ${removed}`);
