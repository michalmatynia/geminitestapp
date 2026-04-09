import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Find all files that mock next/navigation but not nextjs-toploader/app
// Broaden search to any .ts or .tsx file
const findCmd = "grep -r \"vi.mock('next/navigation'\" src __tests__ | grep -v \"nextjs-toploader/app\" | cut -d: -f1 | sort | uniq";
const files = execSync(findCmd).toString().trim().split('\n').filter(f => f && (f.endsWith('.ts') || f.endsWith('.tsx')));

console.log(`Found ${files.length} files to update.`);

for (const file of files) {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes("vi.mock('nextjs-toploader/app'")) continue;

  const searchStr = "vi.mock('next/navigation'";
  let startIdx = content.indexOf(searchStr);
  
  if (startIdx === -1) {
    const searchStr2 = 'vi.mock("next/navigation"';
    startIdx = content.indexOf(searchStr2);
  }

  if (startIdx === -1) {
    console.log(`Could not find vi.mock('next/navigation' in ${file}`);
    continue;
  }

  let endIdx = -1;
  let openParens = 0;
  
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '(') openParens++;
    else if (content[i] === ')') openParens--;
    
    if (openParens === 0 && content[i] === ')' && content[i+1] === ';') {
      endIdx = i + 2;
      break;
    }
  }

  if (endIdx === -1) {
    console.log(`Could not find end of vi.mock in ${file}`);
    continue;
  }

  const mockStatement = content.substring(startIdx, endIdx);
  const firstComma = mockStatement.indexOf(',');
  
  if (firstComma === -1) {
    const nextJsToploaderMock = `\n\nvi.mock('nextjs-toploader/app');`;
    content = content.slice(0, endIdx) + nextJsToploaderMock + content.slice(endIdx);
  } else {
    const factoryPart = mockStatement.substring(firstComma + 1, mockStatement.length - 2).trim();
    const nextJsToploaderMock = `\n\nvi.mock('nextjs-toploader/app', ${factoryPart});`;
    content = content.slice(0, endIdx) + nextJsToploaderMock + content.slice(endIdx);
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${file}`);
}
