import { jest } from '@jest/globals';

const prismaMock = {
  project: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(async (queries) => Promise.all(queries)),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const {
  findProjectForOwnership,
  findProjectWithDetails,
  findProjectForReport,
  findProjectsCatalog,
} = await import('../../src/db/queries/projects.queries.js');

describe('projects.queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findProjectForOwnership returns project for owner', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u1',
      deletedAt: null,
      status: 'ACTIVE',
    });

    const result = await findProjectForOwnership('p1', 'u1', {
      select: { status: true },
    });

    expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'p1' },
      select: {
        id: true,
        ownerUserId: true,
        deletedAt: true,
        status: true,
      },
    });
    expect(result).toEqual({ id: 'p1', ownerUserId: 'u1', deletedAt: null, status: 'ACTIVE' });
  });

  test('findProjectForOwnership throws when not owner', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u2',
      deletedAt: null,
    });

    await expect(findProjectForOwnership('p1', 'u1')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('findProjectForReport throws when project missing', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(findProjectForReport('p1')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('findProjectWithDetails includes owner and technologies', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'p1' });

    await findProjectWithDetails('p1');

    expect(prismaMock.project.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        include: expect.objectContaining({
          owner: expect.any(Object),
          technologies: expect.any(Object),
        }),
      })
    );
  });

  test('findProjectsCatalog builds public catalog query', async () => {
    prismaMock.project.findMany.mockResolvedValue([{ id: 'p1' }]);
    prismaMock.project.count.mockResolvedValue(1);

    const result = await findProjectsCatalog(
      {
        userId: 'u1',
        search: 'teamup',
        includeDeleted: false,
        owner: false,
        status: 'ACTIVE',
      },
      { skip: 0, take: 20 }
    );

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          visibility: 'PUBLIC',
          status: 'ACTIVE',
          OR: expect.any(Array),
        }),
        skip: 0,
        take: 20,
      })
    );
    expect(result).toEqual({ projects: [{ id: 'p1' }], total: 1 });
  });
});
