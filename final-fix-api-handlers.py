import os
import re

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # 1. Simple handlers (no params)
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    for method in methods:
        pattern = rf'async\s+function\s+{method}_handler\s*\(\s*(_?req):\s*NextRequest\s*\)\s*:\s*Promise\s*<[^>]+>\s*\{{'
        replacement = r'async function \1_handler(\1: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {'
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            modified = True

    # 2. Handlers with params
    # Matches: async function METHOD_handler(req: NextRequest, context: { params: Promise<P> }): Promise<...>
    pattern_params_def = r'async\s+function\s+(\w+)_handler\s*\(\s*(_?req):\s*NextRequest\s*,\s*(?:props|context|\{\s*params\s*\})\s*:\s*{\s*params:\s*Promise<([^>]+)>\s*}\s*\)\s*:\s*Promise<[^>]+>\s*\{'
    
    def replace_params_def(match):
        nonlocal modified
        method_name = match.group(1)
        req_name = match.group(2)
        params_type = match.group(3)
        modified = True
        return f'async function {method_name}_handler({req_name}: NextRequest, _ctx: ApiHandlerContext, params: {params_type}): Promise<Response> {{'

    content = re.sub(pattern_params_def, replace_params_def, content)
    
    if modified:
        # Fix usage of params inside handler
        content = re.sub(r'const\s+(\{[^}]+\})\s*=\s*await\s+(?:params|props\.params|context\.params)\s*;', r'const \1 = params;', content)
        content = re.sub(r'const\s+(\w+)\s*=\s*await\s+(?:params|props\.params|context\.params)\s*;', r'const \1 = params;', content)
        content = re.sub(r'const\s+(\{[^}]+\})\s*=\s*await\s+context\.params;', r'const \1 = params;', content)
        
        # Fix exports
        pattern_export_lambda = r'export\s+const\s+(\w+)\s*=\s*apiHandlerWithParams<([^>]+)>\s*\(\s*(?:async\s*)?\([^)]*\)\s*=>\s*\w+_handler\s*\([^)]*(?:Promise\.resolve\(params\)|params)[^)]*\)\s*,\s*{\s*source:\s*"([^"]+)"\s*}\s*\)\s*(?:;|)'
        
        def replace_export(match):
            method = match.group(1)
            params_type = match.group(2)
            source = match.group(3)
            return f'export const {method} = apiHandlerWithParams<{params_type}>({method}_handler, {{ source: "{source}" }});'

        content = re.sub(pattern_export_lambda, replace_export, content)

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Walk through src/app/api
fixed_count = 0
for root, dirs, files in os.walk('src/app/api'):
    for file in files:
        if file == 'route.ts':
            if fix_file(os.path.join(root, file)):
                fixed_count += 1

print(f"Fixed {fixed_count} files total")