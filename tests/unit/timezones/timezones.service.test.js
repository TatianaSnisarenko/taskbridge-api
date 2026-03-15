import { getTimezones } from '../../../src/services/timezones.service.js';
import { TIMEZONES, TIMEZONE_VALUES } from '../../../src/data/timezones.js';

describe('timezones.service', () => {
  describe('getTimezones', () => {
    test('returns an object with items array', () => {
      const result = getTimezones();
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });

    test('returns the full TIMEZONES list', () => {
      const result = getTimezones();
      expect(result.items).toHaveLength(TIMEZONES.length);
      expect(result.items).toEqual(expect.any(Array));
    });

    test('every item has value and label fields', () => {
      const result = getTimezones();
      for (const item of result.items) {
        expect(item).toHaveProperty('value');
        expect(item).toHaveProperty('label');
        expect(typeof item.value).toBe('string');
        expect(typeof item.label).toBe('string');
      }
    });

    test('every label follows (UTC±HH:MM) Region/City format', () => {
      const result = getTimezones();
      const labelPattern = /^\(UTC[+-]\d{2}:\d{2}\) .+$/;
      for (const item of result.items) {
        expect(item.label).toMatch(labelPattern);
      }
    });

    test('contains UTC as a top-level entry', () => {
      const result = getTimezones();
      const utc = result.items.find((tz) => tz.value === 'UTC');
      expect(utc).toBeDefined();
      expect(utc.label).toBe('(UTC+00:00) UTC');
    });

    test('contains Europe/Kyiv', () => {
      const result = getTimezones();
      const kyiv = result.items.find((tz) => tz.value === 'Europe/Kyiv');
      expect(kyiv).toBeDefined();
      expect(kyiv.label).toBe('(UTC+02:00) Europe/Kyiv');
    });

    test('contains America/New_York', () => {
      const result = getTimezones();
      const ny = result.items.find((tz) => tz.value === 'America/New_York');
      expect(ny).toBeDefined();
    });

    test('returns a non-empty list', () => {
      const result = getTimezones();
      expect(result.items.length).toBeGreaterThan(0);
    });

    test('all values are present in TIMEZONE_VALUES', () => {
      const result = getTimezones();
      for (const item of result.items) {
        expect(TIMEZONE_VALUES).toContain(item.value);
      }
    });

    test('TIMEZONE_VALUES matches items count', () => {
      const result = getTimezones();
      expect(TIMEZONE_VALUES).toHaveLength(result.items.length);
    });

    test('sorts timezones by UTC offset ascending', () => {
      const result = getTimezones();
      const offsets = result.items.map((item) => {
        const match = item.label.match(/^\(UTC([+-])(\d{2}):(\d{2})\)/);
        if (!match) {
          return 0;
        }
        const sign = match[1] === '+' ? 1 : -1;
        const hours = Number.parseInt(match[2], 10);
        const minutes = Number.parseInt(match[3], 10);
        return sign * (hours * 60 + minutes);
      });

      for (let index = 1; index < offsets.length; index += 1) {
        expect(offsets[index]).toBeGreaterThanOrEqual(offsets[index - 1]);
      }
    });

    test('filters by timezone name query', () => {
      const result = getTimezones({ q: 'kyiv' });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some((item) => item.value === 'Europe/Kyiv')).toBe(true);
      expect(result.items.every((item) => item.value.toLowerCase().includes('kyiv'))).toBe(true);
    });

    test('filters by numeric UTC offset query', () => {
      const result = getTimezones({ q: '+2' });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every((item) => item.label.startsWith('(UTC+02:'))).toBe(true);
    });

    test('filters by UTC offset with prefix format', () => {
      const result = getTimezones({ q: 'utc-05:00' });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every((item) => item.label.startsWith('(UTC-05:00)'))).toBe(true);
    });

    test('applies limit to autocomplete results', () => {
      const result = getTimezones({ q: 'asia', limit: 3 });
      expect(result.items).toHaveLength(3);
    });

    test('groups by offset when groupByOffset is true', () => {
      const result = getTimezones({ groupByOffset: true });
      const offsets = result.items.map((item) => item.label.match(/^\(UTC[+-]\d{2}:\d{2}\)/)?.[0]);
      const uniqueOffsets = new Set(offsets);

      expect(result.items.length).toBe(uniqueOffsets.size);
      expect(result.items.length).toBeLessThan(TIMEZONES.length);
    });
  });
});
