# Architecture rules for AI agents

## `'use client'` directive

**Never remove `'use client'` from a file without first verifying it uses none of the following:**

- React hooks: `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, `useReducer`, `useContext`, `useLayoutEffect`, `useImperativeHandle`, `useId`, `useTransition`, `useDeferredValue`
- Next.js client hooks: `usePathname`, `useRouter`, `useSearchParams`
- Internationalisation hooks: `useTranslations`, `useLocale`
- Browser globals: `window`, `document`, `localStorage`, `sessionStorage`, `navigator`
- Interactive event props on DOM elements: `onClick`, `onChange`, `onSubmit`, `onFocus`, `onBlur`, `onKeyDown`, `forwardRef`

Files that use any of the above **must** have `'use client'` as their first line. Removing it will break the Next.js build with a runtime error.

### Guardrail enforcement

The architecture scanner enforces two constraints to prevent looping behaviour:

| Guardrail | Constraint | Meaning |
|-----------|-----------|---------|
| `source.hooksWithoutUseClient` | hard limit = **0** | Every file using hooks must have `'use client'` — violations fail CI immediately |
| `source.useClientFiles` (max) | ≤ 1733 | Ceiling to prevent unnecessary client-side drift upward |
| `source.useClientFiles` (min) | ≥ 1400 | **Floor** — going below this means hook-using files have been incorrectly stripped. This will fail CI. |

The `useClientFiles` metric intentionally has **both a ceiling and a floor**. Do not attempt to drive the count below 1400; the floor exists because a large portion of the codebase legitimately requires client-side rendering.

### Correct way to reduce `'use client'` files

If you want to reduce the client-side footprint:

1. Run `node scripts/architecture/collect-metrics.mjs` after any change.
2. Confirm `hooksWithoutUseClient` remains **0** before committing.
3. Only remove `'use client'` from a file when it is provably free of all hook/browser-API usage listed above.
4. Update `scripts/architecture/guardrails-baseline.json` `max` and `min` values together whenever you legitimately reduce the count (both must move down in lockstep).
