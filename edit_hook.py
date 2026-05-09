with open('src/features/integrations/context/useProductListingsActionsImpl.ts', 'r') as f:
    lines = f.readlines()

# Add import after other imports.
lines.insert(5, 'import { useTraderaActions } from "../hooks/actions/tradera-actions";\n')

# Find hook start (approx line 49) and insert hook call.
for i, line in enumerate(lines):
    if 'export const useProductListingsActionsImpl' in line:
        lines.insert(i + 2, '  const traderaActions = useTraderaActions();\n')
        break

with open('src/features/integrations/context/useProductListingsActionsImpl.ts', 'w') as f:
    f.writelines(lines)
