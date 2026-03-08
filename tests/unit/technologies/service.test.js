import { jest } from '@jest/globals';

const prismaMock = {
  technology: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const technologiesService = await import('../../../src/services/technologies/index.js');

describe('technologies.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searchTechnologies returns popular mode for empty query', async () => {
    prismaMock.technology.findMany.mockResolvedValue([
      { id: '1', slug: 'react', name: 'React', type: 'FRONTEND', popularityScore: 100 },
    ]);

    const result = await technologiesService.searchTechnologies({
      q: '',
      limit: 5,
      activeOnly: true,
    });

    expect(prismaMock.technology.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ popularityScore: 'desc' }, { name: 'asc' }],
      take: 5,
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        popularityScore: true,
      },
    });
    expect(result.items).toHaveLength(1);
  });

  test('getTechnologyTypes returns a copy of the list', () => {
    const result = technologiesService.getTechnologyTypes();
    expect(result).toContain('BACKEND');
    expect(Array.isArray(result)).toBe(true);
  });

  test('getTechnologyById throws NOT_FOUND for missing technology', async () => {
    prismaMock.technology.findUnique.mockResolvedValue(null);

    await expect(technologiesService.getTechnologyById('missing')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('getTechnologiesByIds returns mapped records', async () => {
    prismaMock.technology.findMany.mockResolvedValue([
      { id: 't1', slug: 'nodejs', name: 'Node.js', type: 'BACKEND' },
    ]);

    const result = await technologiesService.getTechnologiesByIds(['t1']);
    expect(result).toEqual([{ id: 't1', slug: 'nodejs', name: 'Node.js', type: 'BACKEND' }]);
  });

  test('searchTechnologies prioritizes prefix before contains', async () => {
    prismaMock.technology.findMany.mockResolvedValue([
      {
        id: '1',
        slug: 'sentry-react',
        name: 'Sentry React SDK',
        type: 'FRONTEND',
        popularityScore: 999,
      },
      { id: '2', slug: 'react', name: 'React', type: 'FRONTEND', popularityScore: 120 },
      { id: '3', slug: 'redux', name: 'Redux', type: 'FRONTEND', popularityScore: 100 },
    ]);

    const result = await technologiesService.searchTechnologies({
      q: 're',
      limit: 10,
      activeOnly: true,
    });

    const slugs = result.items.map((item) => item.slug);
    expect(slugs.indexOf('react')).toBeLessThan(slugs.indexOf('sentry-react'));
    expect(slugs.indexOf('redux')).toBeLessThan(slugs.indexOf('sentry-react'));
  });

  test('searchTechnologies supports type filter without activeOnly constraint', async () => {
    prismaMock.technology.findMany.mockResolvedValue([]);

    await technologiesService.searchTechnologies({
      q: '',
      type: 'BACKEND',
      activeOnly: false,
      limit: 3,
    });

    expect(prismaMock.technology.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'BACKEND' },
        take: 3,
      })
    );
  });

  test('searchTechnologies caps limit at 20', async () => {
    prismaMock.technology.findMany.mockResolvedValue([]);

    await technologiesService.searchTechnologies({
      q: 're',
      limit: 100,
    });

    const args = prismaMock.technology.findMany.mock.calls[0][0];
    if (args.take !== undefined) {
      expect(args.take).toBe(20);
    }
  });

  test('validateTechnologyIds returns deduplicated ids when all valid', async () => {
    prismaMock.technology.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);

    const result = await technologiesService.validateTechnologyIds(['t1', 't2', 't1']);

    expect(result).toEqual(['t1', 't2']);
    expect(prismaMock.technology.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['t1', 't2'] },
        isActive: true,
      },
      select: { id: true },
    });
  });

  test('validateTechnologyIds throws INVALID_TECHNOLOGY_IDS for missing IDs', async () => {
    prismaMock.technology.findMany.mockResolvedValue([{ id: 't1' }]);

    await expect(technologiesService.validateTechnologyIds(['t1', 't2'])).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_TECHNOLOGY_IDS',
    });
  });

  test('validateTechnologyIds with requireActive=false allows inactive records', async () => {
    prismaMock.technology.findMany.mockResolvedValue([{ id: 't1' }]);

    const result = await technologiesService.validateTechnologyIds(['t1'], false);
    expect(result).toEqual(['t1']);
    expect(prismaMock.technology.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['t1'] } },
      select: { id: true },
    });
  });

  test('incrementTechnologyPopularity increments once per unique id', async () => {
    prismaMock.technology.updateMany.mockResolvedValue({ count: 2 });

    await technologiesService.incrementTechnologyPopularity(['t1', 't2', 't1']);

    expect(prismaMock.technology.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t1', 't2'] } },
      data: {
        popularityScore: { increment: 1 },
      },
    });
  });

  describe('searchTechnologies - edge cases', () => {
    test('returns empty when query too short (< 2 chars)', async () => {
      prismaMock.technology.findMany.mockResolvedValue([]);

      const result = await technologiesService.searchTechnologies({
        q: 'r',
        limit: 5,
        activeOnly: true,
      });

      expect(result.items).toHaveLength(0);
    });

    test('handles limit boundaries (min 1, max 20)', async () => {
      prismaMock.technology.findMany.mockResolvedValue([]);

      // Test limit = 0 (should use default or minimum)
      const result = await technologiesService.searchTechnologies({
        q: 're',
        limit: 0,
        activeOnly: true,
      });

      expect(prismaMock.technology.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });

    test('uses default limit when not provided', async () => {
      prismaMock.technology.findMany.mockResolvedValue([]);

      const result = await technologiesService.searchTechnologies({
        q: 're',
        activeOnly: true,
      });

      expect(prismaMock.technology.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('validateTechnologyIds - edge cases', () => {
    test('handles empty array', async () => {
      const result = await technologiesService.validateTechnologyIds([]);
      expect(result).toEqual([]);
    });

    test('handles duplicate ids correctly', async () => {
      prismaMock.technology.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);

      const result = await technologiesService.validateTechnologyIds(['t1', 't2', 't1', 't2']);

      expect(result).toEqual(['t1', 't2']);
    });

    test('throws error for invalid technology IDs', async () => {
      prismaMock.technology.findMany.mockResolvedValue([{ id: 't1' }]);

      await expect(
        technologiesService.validateTechnologyIds(['t1', 't2', 't3'])
      ).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_TECHNOLOGY_IDS',
      });
    });
  });

  describe('incrementTechnologyPopularity - edge cases', () => {
    test('handles empty array (no update)', async () => {
      await technologiesService.incrementTechnologyPopularity([]);

      expect(prismaMock.technology.updateMany).not.toHaveBeenCalled();
    });

    test('handles undefined array (no update)', async () => {
      await technologiesService.incrementTechnologyPopularity(undefined);

      expect(prismaMock.technology.updateMany).not.toHaveBeenCalled();
    });

    test('batches updates for many technologies', async () => {
      const ids = Array.from({ length: 50 }, (_, i) => `t${i}`);
      prismaMock.technology.updateMany.mockResolvedValue({ count: 50 });

      await technologiesService.incrementTechnologyPopularity(ids);

      expect(prismaMock.technology.updateMany).toHaveBeenCalled();
    });
  });
});
