import { companyData, developerData } from '../data/profiles.js';
import {
  DEMO_MAX_TALENTS_PROJECT_TITLE,
  MIN_PROJECT_MAX_TALENTS,
  projectData,
  TARGET_PROJECTS_PER_COMPANY,
  TARGET_TASKS_PER_PROJECT,
  taskTemplates,
} from '../data/projects-tasks.js';
import { TECHNOLOGIES } from '../data/technologies.js';
import { normalizeTechList, pickRandom, generateEmail } from '../lib/utils.js';
import { createUser } from '../lib/users.js';

export async function ensureTechnologies(prisma) {
  const normalizedTechs = normalizeTechList(TECHNOLOGIES);
  const createdTechnologies = [];

  for (const tech of normalizedTechs) {
    const technology = await prisma.technology.upsert({
      where: { slug: tech.slug },
      update: {
        popularityScore: tech.popularityScore,
        isActive: true,
      },
      create: {
        slug: tech.slug,
        name: tech.name,
        type: tech.type,
        popularityScore: tech.popularityScore || 0,
        isActive: true,
      },
    });

    createdTechnologies.push(technology);
  }

  console.log(`Technologies ready: ${createdTechnologies.length}`);
  return createdTechnologies;
}

export async function ensureCompanies(prisma) {
  const companies = [];

  for (const companyInfo of companyData) {
    const email = generateEmail(companyInfo.name);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { companyProfile: true },
    });

    if (existingUser) {
      companies.push({ user: existingUser, ...companyInfo });
      continue;
    }

    const user = await createUser(prisma, {
      email,
      companyProfile: {
        companyName: companyInfo.name,
        companyType: companyInfo.type,
        description: companyInfo.description,
        teamSize: companyInfo.teamSize,
        country: companyInfo.country,
        websiteUrl: companyInfo.websiteUrl,
        contactEmail: `hello@${companyInfo.name.toLowerCase().replace(/\s+/g, '')}.example.com`,
        verified: true,
      },
    });

    companies.push({ user, ...companyInfo });
  }

  console.log(`Companies ready: ${companies.length}`);
  return companies;
}

export async function ensureDevelopers(prisma) {
  const developers = [];

  for (const devInfo of developerData) {
    const { name, ...devProfile } = devInfo;
    const email = generateEmail(name);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { developerProfile: true },
    });

    if (existingUser) {
      developers.push({ user: existingUser, name, ...devProfile });
      continue;
    }

    const user = await createUser(prisma, {
      email,
      developerProfile: {
        displayName: name,
        ...devProfile,
      },
    });

    developers.push({ user, name, ...devProfile });
  }

  console.log(`Developers ready: ${developers.length}`);
  return developers;
}

export async function ensureOnboardingStates(prisma, companies, developers) {
  let created = 0;

  for (const company of companies) {
    await prisma.userOnboardingState.upsert({
      where: {
        userId_role: {
          userId: company.user.id,
          role: 'company',
        },
      },
      update: {
        status: 'completed',
        completedAt: new Date(),
      },
      create: {
        userId: company.user.id,
        role: 'company',
        status: 'completed',
        completedAt: new Date(),
      },
    });

    created++;
  }

  for (const developer of developers) {
    await prisma.userOnboardingState.upsert({
      where: {
        userId_role: {
          userId: developer.user.id,
          role: 'developer',
        },
      },
      update: {
        status: 'completed',
        completedAt: new Date(),
      },
      create: {
        userId: developer.user.id,
        role: 'developer',
        status: 'completed',
        completedAt: new Date(),
      },
    });

    created++;
  }

  console.log(`Onboarding states ensured: ${created}`);
}

function getTechnologyPoolForDeveloper(dev, technologies) {
  const jobTitle = dev.jobTitle?.toLowerCase() || '';
  const preferredCats = dev.preferredTaskCategories || [];

  if (jobTitle.includes('backend') || preferredCats.includes('BACKEND')) {
    return technologies.filter((t) => t.type === 'BACKEND' || t.type === 'DATA');
  }

  if (jobTitle.includes('frontend') || preferredCats.includes('FRONTEND')) {
    return technologies.filter((t) => t.type === 'FRONTEND');
  }

  if (jobTitle.includes('full stack') || jobTitle.includes('fullstack')) {
    return technologies.filter((t) => t.type === 'BACKEND' || t.type === 'FRONTEND');
  }

  if (jobTitle.includes('devops') || preferredCats.includes('DEVOPS')) {
    return technologies.filter((t) => t.type === 'DEVOPS');
  }

  if (jobTitle.includes('qa') || jobTitle.includes('test') || preferredCats.includes('QA')) {
    return technologies.filter((t) => t.type === 'QA');
  }

  if (jobTitle.includes('design') || preferredCats.includes('UI_UX_DESIGN')) {
    return technologies.filter((t) => t.type === 'UI_UX_DESIGN' || t.type === 'FRONTEND');
  }

  if (preferredCats.includes('DATA')) {
    return technologies.filter((t) => t.type === 'DATA' || t.type === 'BACKEND');
  }

  if (preferredCats.includes('AI_ML')) {
    return technologies.filter((t) => t.type === 'AI_ML' || t.name === 'Python');
  }

  return technologies.filter((t) => t.popularityScore >= 40);
}

export async function linkDevelopersToTechnologies(prisma, developers, createdTechnologies) {
  let linksCreated = 0;

  for (const dev of developers) {
    const existingLinks = await prisma.developerTechnology.count({
      where: { developerUserId: dev.user.id },
    });

    if (existingLinks > 0) continue;

    const pool = getTechnologyPoolForDeveloper(dev, createdTechnologies);
    const selectedTechs = pickRandom(pool, Math.floor(Math.random() * 3) + 3);

    const experience = dev.experienceLevel || 'JUNIOR';
    const baseYears = experience === 'STUDENT' ? 0 : 1;

    for (const tech of selectedTechs) {
      const proficiencyYears = Math.min(
        3,
        baseYears + Math.floor(Math.random() * (experience === 'STUDENT' ? 2 : 3))
      );

      await prisma.developerTechnology.create({
        data: {
          developerUserId: dev.user.id,
          technologyId: tech.id,
          proficiencyYears,
        },
      });

      linksCreated++;
    }
  }

  console.log(`Developer technology links created: ${linksCreated}`);
}

export async function ensureProjects(prisma, companies) {
  const projects = [];

  for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
    const company = companies[companyIndex];

    const existingProjects = await prisma.project.findMany({
      where: {
        ownerUserId: company.user.id,
        deletedAt: null,
        title: { not: DEMO_MAX_TALENTS_PROJECT_TITLE },
      },
    });

    projects.push(...existingProjects);

    if (existingProjects.length >= TARGET_PROJECTS_PER_COMPANY) {
      continue;
    }

    const companyProjectTemplates = projectData.slice(
      companyIndex * TARGET_PROJECTS_PER_COMPANY,
      companyIndex * TARGET_PROJECTS_PER_COMPANY + TARGET_PROJECTS_PER_COMPANY
    );

    const existingTitles = new Set(existingProjects.map((p) => p.title));
    const missingCount = TARGET_PROJECTS_PER_COMPANY - existingProjects.length;
    let createdForCompany = 0;

    for (const projectInfo of companyProjectTemplates) {
      if (!projectInfo) continue;
      if (existingTitles.has(projectInfo.title)) continue;
      if (createdForCompany >= missingCount) break;

      const project = await prisma.project.create({
        data: {
          ownerUserId: company.user.id,
          title: projectInfo.title,
          shortDescription: projectInfo.shortDescription,
          description: projectInfo.description,
          maxTalents: MIN_PROJECT_MAX_TALENTS,
          visibility: 'PUBLIC',
          status: 'ACTIVE',
        },
      });

      projects.push(project);
      existingTitles.add(projectInfo.title);
      createdForCompany++;
    }
  }

  console.log(`Projects ready: ${projects.length}`);
  return projects;
}

export async function ensureTasks(prisma, projects) {
  const tasks = [];
  const newlyCreatedTasks = [];

  for (const project of projects) {
    const existingTasks = await prisma.task.findMany({
      where: {
        projectId: project.id,
        deletedAt: null,
      },
    });

    const projectTasks = [...existingTasks];
    const existingTitles = new Set(existingTasks.map((task) => task.title));

    if (projectTasks.length < TARGET_TASKS_PER_PROJECT) {
      const missingCount = TARGET_TASKS_PER_PROJECT - projectTasks.length;
      const availableTemplates = taskTemplates.filter(
        (template) => !existingTitles.has(template.title)
      );

      for (let i = 0; i < missingCount && i < availableTemplates.length; i++) {
        const template = availableTemplates[(i + tasks.length) % availableTemplates.length];

        const task = await prisma.task.create({
          data: {
            ownerUserId: project.ownerUserId,
            projectId: project.id,
            title: template.title,
            description: template.description,
            requirements: template.requirements,
            deliverables: template.deliverables,
            niceToHave: [
              'Readable code with clear naming and minimal surprises during handoff.',
              'Short implementation notes for future maintainers.',
            ],
            category: template.category,
            type: template.type,
            difficulty: template.difficulty,
            estimatedEffortHours: template.estimatedEffortHours,
            expectedDuration: template.duration,
            communicationLanguage: 'English',
            timezonePreference: 'UTC +/- 3h',
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            publishedAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
          },
        });

        existingTitles.add(template.title);
        projectTasks.push(task);
        newlyCreatedTasks.push(task);
      }
    }

    tasks.push(...projectTasks);
  }

  console.log(`Tasks ready: ${tasks.length}`);
  console.log(`Newly created tasks: ${newlyCreatedTasks.length}`);

  return { tasks, newlyCreatedTasks };
}

function getTechnologyPoolForTask(task, technologies) {
  if (task.category === 'BACKEND')
    return technologies.filter((t) => t.type === 'BACKEND' || t.type === 'DATA');
  if (task.category === 'FRONTEND') return technologies.filter((t) => t.type === 'FRONTEND');
  if (task.category === 'FULLSTACK')
    return technologies.filter((t) => t.type === 'BACKEND' || t.type === 'FRONTEND');
  if (task.category === 'DEVOPS') return technologies.filter((t) => t.type === 'DEVOPS');
  if (task.category === 'QA') return technologies.filter((t) => t.type === 'QA');
  if (task.category === 'DATA') return technologies.filter((t) => t.type === 'DATA');
  if (task.category === 'MOBILE') return technologies.filter((t) => t.type === 'MOBILE');
  if (task.category === 'AI_ML')
    return technologies.filter((t) => t.type === 'AI_ML' || t.name === 'Python');
  if (task.category === 'UI_UX_DESIGN')
    return technologies.filter((t) => t.type === 'UI_UX_DESIGN');
  if (task.category === 'TECH_WRITING')
    return technologies.filter((t) => t.type === 'TECH_WRITING' || t.type === 'OTHER');
  return technologies.filter((t) => t.type === 'OTHER');
}

export async function linkTasksAndProjectsToTechnologies(
  prisma,
  projects,
  newlyCreatedTasks,
  createdTechnologies
) {
  let taskLinksCreated = 0;
  let projectLinksCreated = 0;

  for (const task of newlyCreatedTasks) {
    const existingLinks = await prisma.taskTechnology.count({ where: { taskId: task.id } });
    if (existingLinks > 0) continue;

    const selectedTechs = pickRandom(getTechnologyPoolForTask(task, createdTechnologies), 3);

    for (let i = 0; i < selectedTechs.length; i++) {
      await prisma.taskTechnology.create({
        data: {
          taskId: task.id,
          technologyId: selectedTechs[i].id,
          isRequired: i < 2,
        },
      });
      taskLinksCreated++;
    }
  }

  for (const project of projects) {
    const existing = await prisma.projectTechnology.count({ where: { projectId: project.id } });
    if (existing > 0) continue;

    const projectTasks = await prisma.task.findMany({
      where: {
        projectId: project.id,
        deletedAt: null,
      },
      select: { category: true },
    });

    const categories = new Set(projectTasks.map((t) => t.category).filter(Boolean));
    const pool = createdTechnologies.filter((tech) => categories.has(tech.type));
    const selected = pickRandom(pool.length > 0 ? pool : createdTechnologies, 4);

    for (let i = 0; i < selected.length; i++) {
      await prisma.projectTechnology.upsert({
        where: {
          projectId_technologyId: {
            projectId: project.id,
            technologyId: selected[i].id,
          },
        },
        update: {
          isRequired: i < 2,
        },
        create: {
          projectId: project.id,
          technologyId: selected[i].id,
          isRequired: i < 2,
        },
      });
      projectLinksCreated++;
    }
  }

  console.log(`Task technology links created: ${taskLinksCreated}`);
  console.log(`Project technology links created: ${projectLinksCreated}`);
}
