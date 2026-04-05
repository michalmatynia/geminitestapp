import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getValidationPatternRepositoryMock,
  getEnabledByDefaultMock,
  setEnabledByDefaultMock,
  getFormatterEnabledByDefaultMock,
  setFormatterEnabledByDefaultMock,
  getInstanceDenyBehaviorMock,
  setInstanceDenyBehaviorMock,
} = vi.hoisted(() => ({
  getValidationPatternRepositoryMock: vi.fn(),
  getEnabledByDefaultMock: vi.fn(),
  setEnabledByDefaultMock: vi.fn(),
  getFormatterEnabledByDefaultMock: vi.fn(),
  setFormatterEnabledByDefaultMock: vi.fn(),
  getInstanceDenyBehaviorMock: vi.fn(),
  setInstanceDenyBehaviorMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getValidationPatternRepository: (...args: unknown[]) => getValidationPatternRepositoryMock(...args),
}));

import { GET_handler, PUT_handler, updateValidatorSettingsSchema } from './handler';

describe('product validator-settings handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getEnabledByDefaultMock.mockResolvedValue(true);
    setEnabledByDefaultMock.mockImplementation(async (value: boolean) => value);
    getFormatterEnabledByDefaultMock.mockResolvedValue(false);
    setFormatterEnabledByDefaultMock.mockImplementation(async (value: boolean) => value);
    getInstanceDenyBehaviorMock.mockResolvedValue({
      draft_template: 'mute_session',
      product_create: 'mute_session',
      product_edit: 'mute_session',
    });
    setInstanceDenyBehaviorMock.mockImplementation(async (value) => value);
    getValidationPatternRepositoryMock.mockResolvedValue({
      getEnabledByDefault: getEnabledByDefaultMock,
      setEnabledByDefault: setEnabledByDefaultMock,
      getFormatterEnabledByDefault: getFormatterEnabledByDefaultMock,
      setFormatterEnabledByDefault: setFormatterEnabledByDefaultMock,
      getInstanceDenyBehavior: getInstanceDenyBehaviorMock,
      setInstanceDenyBehavior: setInstanceDenyBehaviorMock,
    });
  });

  it('exports the supported handlers and schema', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof PUT_handler).toBe('function');
    expect(typeof updateValidatorSettingsSchema.safeParse).toBe('function');
  });

  it('returns the current validator settings', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/products/validator-settings'),
      {} as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      enabledByDefault: true,
      formatterEnabledByDefault: false,
      instanceDenyBehavior: {
        draft_template: 'mute_session',
        product_create: 'mute_session',
        product_edit: 'mute_session',
      },
    });
  });

  it('reads current values for omitted PUT fields', async () => {
    const response = await PUT_handler(
      new NextRequest('http://localhost/api/v2/products/validator-settings', { method: 'PUT' }),
      { body: {} } as never
    );

    expect(response.status).toBe(200);
    expect(setEnabledByDefaultMock).not.toHaveBeenCalled();
    expect(setFormatterEnabledByDefaultMock).not.toHaveBeenCalled();
    expect(setInstanceDenyBehaviorMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      enabledByDefault: true,
      formatterEnabledByDefault: false,
      instanceDenyBehavior: {
        draft_template: 'mute_session',
        product_create: 'mute_session',
        product_edit: 'mute_session',
      },
    });
  });

  it('applies normalized PUT updates when fields are provided', async () => {
    const response = await PUT_handler(
      new NextRequest('http://localhost/api/v2/products/validator-settings', { method: 'PUT' }),
      {
        body: {
          enabledByDefault: false,
          formatterEnabledByDefault: true,
          instanceDenyBehavior: {
            draft_template: 'ask_again',
            product_create: 'invalid',
            product_edit: 'ask_again',
          },
        },
      } as never
    );

    expect(setEnabledByDefaultMock).toHaveBeenCalledWith(false);
    expect(setFormatterEnabledByDefaultMock).toHaveBeenCalledWith(true);
    expect(setInstanceDenyBehaviorMock).toHaveBeenCalledWith({
      draft_template: 'ask_again',
      product_create: 'mute_session',
      product_edit: 'ask_again',
    });
    await expect(response.json()).resolves.toEqual({
      enabledByDefault: false,
      formatterEnabledByDefault: true,
      instanceDenyBehavior: {
        draft_template: 'ask_again',
        product_create: 'mute_session',
        product_edit: 'ask_again',
      },
    });
  });
});
