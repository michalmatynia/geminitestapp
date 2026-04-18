import { type NextRequest, NextResponse } from 'next/server';

import {
  type PlaywrightStepSnippetRequest,
  type PlaywrightStepSnippetResponse,
} from '@/shared/contracts/playwright-steps';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';
import {
  createPlaywrightStepCodeSnapshot,
  getPlaywrightStepInputBindings,
} from '@/shared/lib/playwright/step-code-preview';

export async function POST_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as PlaywrightStepSnippetRequest;
  const inputBindings = getPlaywrightStepInputBindings(body.step);
  const snapshot = createPlaywrightStepCodeSnapshot({
    ...body.step,
    inputBindings,
  });
  const warnings: PlaywrightStepSnippetResponse['warnings'] = [
    ...snapshot.unresolvedBindings.map((field) => ({
      field,
      message: 'Step input binding is unresolved.',
    })),
    ...snapshot.selectorBindings
      .filter((binding) => binding.mode === 'selectorRegistry' && !binding.selectorKey)
      .map((binding) => ({
        field: binding.field,
        message: 'Selector registry binding is missing a selector key.',
        selectorKey: binding.selectorKey,
        selectorProfile: binding.selectorProfile,
      })),
    ...snapshot.selectorBindings
      .filter(
        (binding) => binding.mode === 'selectorRegistry' && binding.roleMatchesExpected === false
      )
      .map((binding) => ({
        field: binding.field,
        message: `Selector role ${
          formatSelectorRegistryRoleLabel(binding.selectorRole ?? undefined) ??
          binding.selectorRole ??
          'Unknown'
        } does not match expected roles: ${
          binding.expectedRoles
            ?.map((role) => formatSelectorRegistryRoleLabel(role) ?? role)
            .join(', ') ?? 'Unknown'
        }.`,
        selectorKey: binding.selectorKey,
        selectorProfile: binding.selectorProfile,
      })),
  ];

  return NextResponse.json({
    inputBindings,
    snapshot,
    warnings,
  } satisfies PlaywrightStepSnippetResponse);
}
