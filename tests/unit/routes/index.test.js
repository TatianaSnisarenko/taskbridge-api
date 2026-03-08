describe('routes module smoke', () => {
  test('exports all route routers', async () => {
    const authRoutes = await import('../../../src/routes/auth.routes.js');
    const meRoutes = await import('../../../src/routes/me.routes.js');
    const profilesRoutes = await import('../../../src/routes/profiles.routes.js');
    const projectsRoutes = await import('../../../src/routes/projects.routes.js');
    const tasksRoutes = await import('../../../src/routes/tasks.routes.js');
    const applicationsRoutes = await import('../../../src/routes/applications.routes.js');
    const invitesRoutes = await import('../../../src/routes/invites.routes.js');
    const usersRoutes = await import('../../../src/routes/users.routes.js');
    const technologiesRoutes = await import('../../../src/routes/technologies.routes.js');
    const rootRoutes = await import('../../../src/routes/index.js');

    expect(authRoutes.authRouter).toBeDefined();
    expect(meRoutes.meRouter).toBeDefined();
    expect(profilesRoutes.profilesRouter).toBeDefined();
    expect(projectsRoutes.projectsRouter).toBeDefined();
    expect(tasksRoutes.tasksRouter).toBeDefined();
    expect(applicationsRoutes.applicationsRouter).toBeDefined();
    expect(invitesRoutes.invitesRouter).toBeDefined();
    expect(usersRoutes.usersRouter).toBeDefined();
    expect(technologiesRoutes.default).toBeDefined();
    expect(rootRoutes.apiRouter).toBeDefined();
  });
});
