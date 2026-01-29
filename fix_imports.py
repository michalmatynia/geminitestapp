import os
import re

def fix_imports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # Clean up imports from api-handler
    # Pattern: import { ... ApiHandlerContext ... } from "@/shared/lib/api/api-handler";
    pattern = r'import\s+\{\s*([^}]*ApiHandlerContext[^}]*)\s*\}\s*from\s*"@/shared/lib/api/api-handler";'
    
    def replace_import(match):
        nonlocal modified
        items = match.group(1).split(',')
        new_items = []
        for item in items:
            item = item.strip()
            if not item: continue
            if 'ApiHandlerContext' in item: continue # Skip it here
            new_items.append(item)
        
        res = ""
        if new_items:
            res += f'import {{ {", ".join(new_items)} }} from "@/shared/lib/api/api-handler";\n'
        
        if 'import type { ApiHandlerContext } from "@/shared/types/api";' not in content:
            res += 'import type { ApiHandlerContext } from "@/shared/types/api";'
        
        modified = True
        return res

    new_content = re.sub(pattern, replace_import, content)
    
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

# Walk through src/app/api
fixed_count = 0
for root, dirs, files in os.walk('src/app/api'):
    for file in files:
        if file == 'route.ts':
            if fix_imports(os.path.join(root, file)):
                fixed_count += 1

print(f"Fixed imports in {fixed_count} files")
