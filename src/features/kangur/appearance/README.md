## Kangur Appearance

This subtree owns Kangur storefront appearance and theme customization.

- `admin/workspace/`: admin-facing appearance editor and preview workspace
- `server/`: server bootstrap and storefront appearance state resolution
- `theme-settings.ts`: theme parsing, defaults, and preset exports
- `storefront-appearance-settings.ts`: storefront mode and appearance state types

Keep new appearance-specific code here instead of adding more loose `theme-settings*` or `storefront-appearance*` files back under the Kangur root.
