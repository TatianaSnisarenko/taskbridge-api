import { jest } from '@jest/globals';

const prismaMock = {
  task: {
    findUnique: jest.fn(),
  },
};

const queriesMock = {
  findTaskForCandidates: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/db/queries/tasks.queries.js', () => queriesMock);

const { toNumber, calculateCandidateScore, sortCandidates } =
  await import('../../../src/services/tasks/helpers.js');

describe('tasks.helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toNumber', () => {
    test('returns null for null input', () => {
      expect(toNumber(null)).toBeNull();
    });

    test('returns null for undefined input', () => {
      expect(toNumber(undefined)).toBeNull();
    });

    test('returns number as-is', () => {
      expect(toNumber(42)).toBe(42);
      expect(toNumber(3.14)).toBe(3.14);
      expect(toNumber(0)).toBe(0);
    });

    test('converts Decimal-like object with toNumber method', () => {
      const decimal = { toNumber: () => 123.45 };
      expect(toNumber(decimal)).toBe(123.45);
    });

    test('converts string to number', () => {
      expect(toNumber('456')).toBe(456);
      expect(toNumber('78.9')).toBe(78.9);
    });

    test('converts boolean to number', () => {
      expect(toNumber(true)).toBe(1);
      expect(toNumber(false)).toBe(0);
    });
  });

  describe('calculateCandidateScore', () => {
    test('calculates score with all positive values', () => {
      const result = calculateCandidateScore({
        matchCount: 5,
        avgRating: 4.5,
        reviewsCount: 25,
      });
      expect(result).toBe(63);
    });

    test('handles zero matchCount', () => {
      const result = calculateCandidateScore({
        matchCount: 0,
        avgRating: 5.0,
        reviewsCount: 10,
      });
      expect(result).toBe(12);
    });

    test('handles null avgRating', () => {
      const result = calculateCandidateScore({
        matchCount: 3,
        avgRating: null,
        reviewsCount: 5,
      });
      expect(result).toBe(31);
    });

    test('handles undefined avgRating', () => {
      const result = calculateCandidateScore({
        matchCount: 2,
        avgRating: undefined,
        reviewsCount: 15,
      });
      expect(result).toBe(23);
    });

    test('caps reviewsCount at 20', () => {
      const result = calculateCandidateScore({
        matchCount: 1,
        avgRating: 3.0,
        reviewsCount: 100,
      });
      expect(result).toBe(20);
    });

    test('handles null reviewsCount', () => {
      const result = calculateCandidateScore({
        matchCount: 4,
        avgRating: 4.0,
        reviewsCount: null,
      });
      expect(result).toBe(48);
    });

    test('handles all nulls', () => {
      const result = calculateCandidateScore({
        matchCount: 0,
        avgRating: null,
        reviewsCount: null,
      });
      expect(result).toBe(0);
    });
  });

  describe('sortCandidates', () => {
    test('sorts by score descending (primary)', () => {
      const a = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Alice' };
      const b = { score: 60, avg_rating: 4.0, reviews_count: 10, display_name: 'Bob' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0);
      expect(sortCandidates(b, a)).toBeLessThan(0);
    });

    test('sorts by avgRating descending when scores equal', () => {
      const a = { score: 50, avg_rating: 3.5, reviews_count: 10, display_name: 'Alice' };
      const b = { score: 50, avg_rating: 4.5, reviews_count: 10, display_name: 'Bob' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0);
    });

    test('sorts by reviewsCount descending when score and rating equal', () => {
      const a = { score: 50, avg_rating: 4.0, reviews_count: 5, display_name: 'Alice' };
      const b = { score: 50, avg_rating: 4.0, reviews_count: 15, display_name: 'Bob' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0);
    });

    test('sorts by display_name alphabetically when all else equal', () => {
      const a = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Zoe' };
      const b = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Alice' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0);
    });

    test('handles null avg_rating', () => {
      const a = { score: 50, avg_rating: null, reviews_count: 10, display_name: 'Alice' };
      const b = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Bob' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0);
    });

    test('handles null reviews_count', () => {
      const a = { score: 50, avg_rating: 4.0, reviews_count: null, display_name: 'Alice' };
      const b = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Bob' };

      expect(sortCandidates(a, b)).toBeGreaterThan(0);
    });

    test('handles empty display_name', () => {
      const a = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: null };
      const b = { score: 50, avg_rating: 4.0, reviews_count: 10, display_name: 'Bob' };

      const result = sortCandidates(a, b);
      expect(typeof result).toBe('number');
    });
  });
});
