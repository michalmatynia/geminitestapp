import { describe, expect, it, vi } from 'vitest';

import {
  buildValidatorSettingsResponse,
  resolveValidatorEnabledByDefault,
  resolveValidatorFormatterEnabledByDefault,
  resolveValidatorInstanceDenyBehavior,
} from './handler.helpers';

describe('product validator-settings handler helpers', () => {
  it('builds the validator settings response shape', () => {
    expect(
      buildValidatorSettingsResponse({
        enabledByDefault: true,
        formatterEnabledByDefault: false,
        instanceDenyBehavior: {
          draft_template: 'mute_session',
          product_create: 'mute_session',
          product_edit: 'ask_again',
        },
      })
    ).toEqual({
      enabledByDefault: true,
      formatterEnabledByDefault: false,
      instanceDenyBehavior: {
        draft_template: 'mute_session',
        product_create: 'mute_session',
        product_edit: 'ask_again',
      },
    });
  });

  it('resolves enabled and formatter defaults via set-or-read logic', async () => {
    const repository = {
      getEnabledByDefault: vi.fn(async () => true),
      setEnabledByDefault: vi.fn(async (value: boolean) => value),
      getFormatterEnabledByDefault: vi.fn(async () => false),
      setFormatterEnabledByDefault: vi.fn(async (value: boolean) => value),
    } as never;

    await expect(resolveValidatorEnabledByDefault(repository, {} as never)).resolves.toBe(true);
    await expect(
      resolveValidatorFormatterEnabledByDefault(repository, {
        formatterEnabledByDefault: true,
      } as never)
    ).resolves.toBe(true);

    expect(repository.getEnabledByDefault).toHaveBeenCalledTimes(1);
    expect(repository.setEnabledByDefault).not.toHaveBeenCalled();
    expect(repository.setFormatterEnabledByDefault).toHaveBeenCalledWith(true);
  });

  it('normalizes instance deny behavior when updating and reads current values otherwise', async () => {
    const repository = {
      getInstanceDenyBehavior: vi.fn(async () => ({
        draft_template: 'mute_session',
        product_create: 'mute_session',
        product_edit: 'mute_session',
      })),
      setInstanceDenyBehavior: vi.fn(async (value) => value),
    } as never;

    await expect(resolveValidatorInstanceDenyBehavior(repository, {} as never)).resolves.toEqual({
      draft_template: 'mute_session',
      product_create: 'mute_session',
      product_edit: 'mute_session',
    });

    await expect(
      resolveValidatorInstanceDenyBehavior(repository, {
        instanceDenyBehavior: {
          draft_template: 'ask_again',
          product_create: 'invalid',
          product_edit: 'ask_again',
        },
      } as never)
    ).resolves.toEqual({
      draft_template: 'ask_again',
      product_create: 'mute_session',
      product_edit: 'ask_again',
    });

    expect(repository.setInstanceDenyBehavior).toHaveBeenCalledWith({
      draft_template: 'ask_again',
      product_create: 'mute_session',
      product_edit: 'ask_again',
    });
  });
});
