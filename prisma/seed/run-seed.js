import 'dotenv/config';
import { prisma } from '../../src/db/prisma.js';
import { createAdminIfNeeded } from './lib/users.js';
import {
  ensureCompanies,
  ensureDevelopers,
  ensureOnboardingStates,
  ensureProjects,
  ensureTasks,
  ensureTechnologies,
  linkDevelopersToTechnologies,
  linkTasksAndProjectsToTechnologies,
} from './steps/core.js';
import { createApplicationsChatsAndReviews } from './steps/workflow.js';
import {
  ensureArchivedProjectDemo,
  ensureDemoSignals,
  ensurePlatformReviews,
  reconcileProjectCounters,
  updateProfileStats,
} from './steps/post-process.js';

export async function runSeed() {
  console.log('Starting database seed...');

  try {
    await createAdminIfNeeded(prisma);

    const technologies = await ensureTechnologies(prisma);
    const companies = await ensureCompanies(prisma);
    const developers = await ensureDevelopers(prisma);

    await ensureOnboardingStates(prisma, companies, developers);
    await linkDevelopersToTechnologies(prisma, developers, technologies);

    const projects = await ensureProjects(prisma, companies);
    const { tasks, newlyCreatedTasks } = await ensureTasks(prisma, projects);

    await linkTasksAndProjectsToTechnologies(prisma, projects, newlyCreatedTasks, technologies);
    await createApplicationsChatsAndReviews(prisma, newlyCreatedTasks, developers);

    const demoProject = await ensureArchivedProjectDemo(prisma, companies);
    if (demoProject) {
      projects.push(demoProject);
      const demoTasks = await prisma.task.findMany({
        where: { projectId: demoProject.id, deletedAt: null },
      });
      tasks.push(...demoTasks);
    }

    await reconcileProjectCounters(prisma, projects);
    await ensureDemoSignals(prisma, projects, tasks, companies, developers);
    await ensurePlatformReviews(prisma, companies, developers);
    await updateProfileStats(prisma, developers, companies);

    console.log('Database seeding completed successfully');
    console.log(
      `Summary: companies=${companies.length}, developers=${developers.length}, projects=${projects.length}, tasks=${tasks.length}`
    );
  } finally {
    await prisma.$disconnect();
  }
}
