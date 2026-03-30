import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';

import {
  isObjectIdString,
  normalizeId,
  toDate,
  toJsonValue,
  toObjectIdMaybe,
} from '@/shared/lib/db/services/sync-utils';

describe('db sync utils', () => {
  it('recognizes valid ObjectId strings and converts them when possible', () => {
    const objectIdString = '507f1f77bcf86cd799439011';

    expect(isObjectIdString(objectIdString)).toBe(true);
    expect(isObjectIdString('not-an-object-id')).toBe(false);

    const converted = toObjectIdMaybe(objectIdString);
    expect(converted).toBeInstanceOf(ObjectId);
    expect((converted as ObjectId).toString()).toBe(objectIdString);
    expect(toObjectIdMaybe('external-id')).toBe('external-id');
    expect(toObjectIdMaybe(undefined)).toBeNull();
  });

  it('normalizes dates and json-safe values', () => {
    const objectId = new ObjectId('507f1f77bcf86cd799439011');
    const date = new Date('2026-03-25T12:00:00.000Z');

    expect(toDate(date)).toEqual(date);
    expect(toDate('2026-03-25T12:00:00.000Z')?.toISOString()).toBe('2026-03-25T12:00:00.000Z');
    expect(toDate(Date.parse('2025-03-25T00:00:00.000Z'))?.toISOString()).toBe(
      '2025-03-25T00:00:00.000Z'
    );
    expect(toDate('not-a-date')).toBeNull();
    expect(toDate(null)).toBeNull();

    expect(
      toJsonValue({
        createdAt: date,
        id: objectId,
        nested: [{ when: date }, undefined],
      })
    ).toEqual({
      createdAt: '2026-03-25T12:00:00.000Z',
      id: '507f1f77bcf86cd799439011',
      nested: [{ when: '2026-03-25T12:00:00.000Z' }, null],
    });
  });

  it('normalizes ids from id strings, _id strings, and ObjectId-like values', () => {
    expect(normalizeId({ id: 'direct-id', _id: 'ignored-id' })).toBe('direct-id');
    expect(normalizeId({ _id: 'mongo-id' })).toBe('mongo-id');
    expect(normalizeId({ _id: new ObjectId('507f1f77bcf86cd799439011') })).toBe(
      '507f1f77bcf86cd799439011'
    );
    expect(normalizeId({})).toBe('');
  });
});
