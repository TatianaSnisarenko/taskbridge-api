import { jest } from '@jest/globals';

const prismaMock = {
  project: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const projectsService = await import('../../src/services/projects.service.js');

describe('projects.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createProject creates project', async () => {
    const createdAt = new Date('2026-02-14T10:00:00Z');
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.project.create.mockResolvedValue({ id: 'p1', createdAt });

    const project = {
      title: 'TeamUp MVP',
      short_description: 'Build MVP for marketplace',
      description: 'Longer description for the marketplace project',
      technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      max_talents: 3,
    };

    const result = await projectsService.createProject({ userId: 'u1', project });

    expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
      where: { ownerUserId: 'u1', title: 'TeamUp MVP' },
      select: { id: true },
    });
    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: {
        ownerUserId: 'u1',
        title: 'TeamUp MVP',
        shortDescription: 'Build MVP for marketplace',
        description: 'Longer description for the marketplace project',
        technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        maxTalents: 3,
      },
      select: { id: true, createdAt: true },
    });

    expect(result).toEqual({ projectId: 'p1', createdAt });
  });

  test('createProject rejects duplicate title for owner', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 'p1' });

    await expect(
      projectsService.createProject({
        userId: 'u1',
        project: { title: 'TeamUp MVP' },
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'PROJECT_TITLE_EXISTS',
    });
  });
});
