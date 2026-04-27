import os

def fix_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    if "vi.mock('@/features/kangur/observability/client'" not in content:
        return False
        
    if "isRecoverableKangurClientFetchError" in content:
        return False
        
    start_str = "vi.mock('@/features/kangur/observability/client'"
    start_idx = content.find(start_str)
    
    # Find the start of the object literal or block
    # We look for the first { after the start_idx
    obj_start_idx = content.find('{', start_idx)
    if obj_start_idx == -1:
        return False
        
    # Find the closing } of this object
    # We need to handle nested braces, but for simple mocks it's usually the one matching obj_start_idx
    
    depth = 0
    obj_end_idx = -1
    for i in range(obj_start_idx, len(content)):
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
            if depth == 0:
                obj_end_idx = i
                break
                
    if obj_end_idx == -1:
        return False
        
    print(f"Fixing {file_path}")
    
    body = content[obj_start_idx + 1:obj_end_idx]
    
    new_body = body
    if body.strip() and not body.strip().endswith(','):
        new_body += ","
    new_body += "\n  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),"
    
    new_content = content[:obj_start_idx + 1] + new_body + content[obj_end_idx:]
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    return True

files_to_check = []
for root, dirs, files in os.walk('src/features/kangur'):
    for file in files:
        if '.test.' in file or '.test-support.' in file:
            files_to_check.append(os.path.join(root, file))

for root, dirs, files in os.walk('__tests__'):
    for file in files:
        if '.test.' in file or '.test-support.' in file:
            files_to_check.append(os.path.join(root, file))

fixed_count = 0
for file_path in files_to_check:
    if fix_file(file_path):
        fixed_count += 1

print(f"Fixed {fixed_count} files.")
