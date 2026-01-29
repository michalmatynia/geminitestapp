import os
import re

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 1. Detect if it's a dynamic route file
    is_dynamic = 'apiHandlerWithParams' in content
    
    # 2. Fix imports and remove redundant type definitions
    if 'import type { ApiHandlerContext } from "@/shared/types/api";' not in content:
        if 'import { apiHandler' in content:
            content = re.sub(r'import\s+\{[^}]*apiHandler[^}]*\}\s+from\s+\