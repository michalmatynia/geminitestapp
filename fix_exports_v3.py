import os
import re

def fix_exports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # Pattern to match the lambda export with multiline support
    pattern = r'export\s+const\s+(\w+)\s*=\s*apiHandlerWithParams<([^>]+)>\s*\(\s*(?:async\s*)?\([^)]*\)\s*=>\s*(\w+)_handler\s*\([^)]*\)\s*,\s*{\s*source:\s*"([^"]+)"\s*}\s*\)\s*;'
    
    def replace_export(match):
        nonlocal modified
        method = match.group(1)
        params_type = match.group(2)
        handler_method = match.group(3)
        source = match.group(4)
        modified = True
        return f'export const {method} = apiHandlerWithParams<{params_type}>({handler_method}_handler, {{ source: "{source}" }});'

    new_content = re.sub(pattern, replace_export, content, flags=re.DOTALL)
    
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
            if fix_exports(os.path.join(root, file)):
                fixed_count += 1

print(f"Fixed exports in {fixed_count} files")
