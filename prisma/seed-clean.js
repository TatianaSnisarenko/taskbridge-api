import 'dotenv/config';
import { prisma } from '../src/db/prisma.js';
import { hashPassword } from '../src/utils/password.js';

// Utility functions
function generateEmail(name) {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
}

function buildNotificationPayload({
  taskId,
  applicationId = null,
  reviewId = null,
  rating = null,
  completedAt = null,
  threadId = null,
}) {
  const payload = {};

  if (taskId) payload.task_id = taskId;
  if (applicationId) payload.application_id = applicationId;
  if (reviewId) payload.review_id = reviewId;
  if (rating !== null) payload.rating = rating;
  if (completedAt) payload.completed_at = completedAt;
  if (threadId) payload.thread_id = threadId;

  return payload;
}

async function createNotification({
  userId,
  actorUserId,
  taskId,
  type,
  payload,
  threadId = null,
  projectId = null,
}) {
  return prisma.notification.create({
    data: {
      userId,
      actorUserId,
      taskId,
      threadId,
      projectId,
      type,
      payload,
    },
  });
}

async function createUser({
  email,
  password = 'Password123!',
  developerProfile = null,
  companyProfile = null,
}) {
  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerified: true,
      ...(developerProfile && {
        developerProfile: {
          create: developerProfile,
        },
      }),
      ...(companyProfile && {
        companyProfile: {
          create: companyProfile,
        },
      }),
    },
    include: {
      developerProfile: true,
      companyProfile: true,
    },
  });
}

// Data generators
const companyData = [
  {
    name: 'TechVentures Inc',
    type: 'STARTUP',
    description: 'A fast-growing SaaS startup focused on automating business processes for SMBs.',
    teamSize: 12,
    country: 'United States',
    websiteUrl: 'https://techventures.example.com',
  },
  {
    name: 'CloudSync Solutions',
    type: 'SMB',
    description: 'Cloud infrastructure and DevOps consulting company helping teams scale.',
    teamSize: 25,
    country: 'Canada',
    websiteUrl: 'https://cloudsync.example.com',
  },
  {
    name: 'PixelWorks Design Studio',
    type: 'STARTUP',
    description: 'Creative digital agency specializing in web design and mobile apps.',
    teamSize: 8,
    country: 'United Kingdom',
    websiteUrl: 'https://pixelworks.example.com',
  },
  {
    name: 'DataFlow Analytics',
    type: 'SMB',
    description: 'Business intelligence and data analytics platform for enterprises.',
    teamSize: 40,
    country: 'Germany',
    websiteUrl: 'https://dataflow.example.com',
  },
  {
    name: 'CodeCraft Labs',
    type: 'STARTUP',
    description: 'Custom software development agency focusing on high-performance applications.',
    teamSize: 15,
    country: 'Australia',
    websiteUrl: 'https://codecraft.example.com',
  },
];

const developerData = [
  // Frontend developers
  {
    name: 'Alex Johnson',
    jobTitle: 'Frontend Developer',
    bio: 'Passionate about building beautiful, responsive web interfaces. 2+ years experience with React and TypeScript.',
    experienceLevel: 'JUNIOR',
    location: 'London, UK',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'REST APIs'],
    techStack: ['JavaScript', 'React', 'Next.js'],
    availability: 'PART_TIME',
    preferredTaskCategories: ['FRONTEND'],
  },
  {
    name: 'Emma Chen',
    jobTitle: 'React Developer',
    bio: 'Specialized in modern React patterns and state management. Strong CSS fundamentals.',
    experienceLevel: 'JUNIOR',
    location: 'Toronto, Canada',
    skills: ['React', 'Redux', 'HTML5', 'CSS3'],
    techStack: ['JavaScript', 'React', 'Webpack'],
    availability: 'FULL_TIME',
    preferredTaskCategories: ['FRONTEND'],
  },
  {
    name: 'Marco Rossi',
    jobTitle: 'UI Developer',
    bio: 'Focus on user experience and clean code. Experience with Vue and React.',
    experienceLevel: 'JUNIOR',
    location: 'Berlin, Germany',
    skills: ['Vue.js', 'React', 'CSS', 'Figma to Code'],
    techStack: ['JavaScript', 'Vue', 'SCSS'],
    availability: 'PART_TIME',
    preferredTaskCategories: ['FRONTEND'],
  },
  // Backend developers
  {
    name: 'David Kumar',
    jobTitle: 'Backend Engineer',
    bio: 'Node.js specialist with experience building scalable APIs. Strong database design skills.',
    experienceLevel: 'JUNIOR',
    location: 'Bangalore, India',
    skills: ['Node.js', 'Express', 'PostgreSQL', 'MongoDB'],
    techStack: ['JavaScript', 'Node.js', 'PostgreSQL'],
    availability: 'FULL_TIME',
    preferredTaskCategories: ['BACKEND'],
  },
  {
    name: 'Sofia Petrov',
    jobTitle: 'Full Stack Developer',
    bio: 'Comfortable across the stack. Recent bootcamp graduate focused on web development.',
    experienceLevel: 'STUDENT',
    location: 'Sofia, Bulgaria',
    skills: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
    techStack: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
    availability: 'FULL_TIME',
    preferredTaskCategories: ['BACKEND', 'FRONTEND'],
  },
  {
    name: 'James Wilson',
    jobTitle: 'Python Developer',
    bio: 'Transitioning from Python to Node.js. Data processing and API development experience.',
    experienceLevel: 'JUNIOR',
    location: 'Austin, Texas',
    skills: ['Python', 'JavaScript', 'Django', 'FastAPI'],
    techStack: ['Python', 'Node.js', 'PostgreSQL'],
    availability: 'PART_TIME',
    preferredTaskCategories: ['BACKEND'],
  },
  {
    name: 'Lisa Anderson',
    jobTitle: 'Backend Developer',
    bio: 'Experience building microservices. Strong in system design and optimization.',
    experienceLevel: 'MIDDLE',
    location: 'Seattle, Washington',
    skills: ['Node.js', 'Docker', 'PostgreSQL', 'API Design'],
    techStack: ['JavaScript', 'Node.js', 'Docker', 'PostgreSQL'],
    availability: 'PART_TIME',
    preferredTaskCategories: ['BACKEND', 'DEVOPS'],
  },
  // Designers
  {
    name: 'Nina Gonzalez',
    jobTitle: 'UI/UX Designer',
    bio: 'Passionate about user-centered design. Proficient in Figma and design systems.',
    experienceLevel: 'JUNIOR',
    location: 'Barcelona, Spain',
    skills: ['Figma', 'UI Design', 'Wireframing', 'User Research'],
    techStack: [],
    availability: 'FULL_TIME',
    preferredTaskCategories: ['OTHER'],
  },
  {
    name: 'Tom Hayes',
    jobTitle: 'Product Designer',
    bio: 'Focused on designing delightful user experiences. Experience in design sprints.',
    experienceLevel: 'JUNIOR',
    location: 'Dublin, Ireland',
    skills: ['Figma', 'Prototyping', 'UX Research', 'Design Systems'],
    techStack: [],
    availability: 'PART_TIME',
    preferredTaskCategories: ['OTHER'],
  },
  // QA / DevOps
  {
    name: 'Rachel Lee',
    jobTitle: 'QA Engineer',
    bio: 'Quality assurance specialist with focus on automated testing.',
    experienceLevel: 'JUNIOR',
    location: 'Singapore',
    skills: ['Jest', 'Testing', 'Automation', 'Bug Tracking'],
    techStack: ['JavaScript', 'Jest'],
    availability: 'FULL_TIME',
    preferredTaskCategories: ['QA'],
  },
  {
    name: 'Carlos Mendez',
    jobTitle: 'DevOps Enthusiast',
    bio: 'Learning Docker and Kubernetes. Interested in CI/CD pipelines.',
    experienceLevel: 'STUDENT',
    location: 'Mexico City, Mexico',
    skills: ['Docker', 'Linux', 'Git', 'CI/CD'],
    techStack: ['Docker', 'Linux', 'Node.js'],
    availability: 'FULL_TIME',
    preferredTaskCategories: ['DEVOPS'],
  },
  {
    name: 'Priya Sharma',
    jobTitle: 'Full Stack Developer',
    bio: 'Bootcamp graduate with passion for clean code and modern tech.',
    experienceLevel: 'STUDENT',
    location: 'Chennai, India',
    skills: ['React', 'Node.js', 'MongoDB', 'JavaScript'],
    techStack: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    availability: 'FULL_TIME',
    preferredTaskCategories: ['FRONTEND', 'BACKEND'],
  },
];

const projectData = [
  {
    title: 'E-Learning Platform Redesign',
    shortDescription: 'Complete UI/UX overhaul of our online learning management system.',
    description:
      'We are rebuilding our educational platform to improve user engagement and learning outcomes. This project includes redesigning the course interface, improving video streaming, and creating a better student dashboard.',
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Figma'],
  },
  {
    title: 'Mobile App MVP',
    shortDescription: 'Native iOS/Android app for managing team tasks and collaboration.',
    description:
      'Mobile-first application for small teams to track projects, share files, and communicate. This is our initial MVP focusing on core features.',
    technologies: ['React Native', 'Firebase', 'Redux'],
  },
  {
    title: 'Analytics Dashboard',
    shortDescription: 'Real-time analytics and reporting for SaaS product.',
    description:
      'Building a comprehensive analytics dashboard that visualizes customer data, revenue metrics, and product usage patterns. Real-time updates required.',
    technologies: ['React', 'D3.js', 'PostgreSQL', 'Node.js'],
  },
  {
    title: 'API Gateway Service',
    shortDescription: 'Central API management and authentication layer.',
    description:
      'Implementing a scalable API gateway for routing requests, managing authentication, and rate limiting across all services.',
    technologies: ['Node.js', 'Express', 'Docker', 'PostgreSQL'],
  },
  {
    title: 'Customer Portal Enhancement',
    shortDescription: 'Adding new self-service features to existing customer portal.',
    description:
      'Extending our web portal with invoice management, subscription updates, and support ticket creation. Must integrate with existing systems.',
    technologies: ['Vue.js', 'Node.js', 'Stripe API', 'PostgreSQL'],
  },
  {
    title: 'Internal Admin Dashboard',
    shortDescription: 'Admin panel for managing platform users and content.',
    description:
      'Building comprehensive admin tools for user management, moderation, analytics review, and content publishing workflows.',
    technologies: ['React', 'Node.js', 'MongoDB', 'JWT Auth'],
  },
];

const taskTemplates = [
  {
    title: 'Implement User Authentication Module',
    description:
      'Build a secure user authentication system with JWT tokens, refresh token rotation, and password hashing using bcrypt.',
    requirements:
      'Must handle user registration, login, logout, password reset. Include comprehensive error handling and input validation.',
    deliverables: 'Authentication service with unit tests, API endpoints, and documentation.',
    category: 'BACKEND',
    type: 'PAID',
    difficulty: 'MIDDLE',
    estimatedEffortHours: 40,
    duration: 'DAYS_8_14',
    budget: 500,
  },
  {
    title: 'Create Dashboard Component Library',
    description:
      'Build a reusable set of React components for dashboard UI (cards, charts, tables, modals, buttons).',
    requirements:
      'Components must be responsive, accessible (WCAG 2.1), and documented. Include Storybook integration.',
    deliverables: 'Component library with TypeScript types, Storybook, and usage examples.',
    category: 'FRONTEND',
    type: 'PAID',
    difficulty: 'JUNIOR',
    estimatedEffortHours: 30,
    duration: 'DAYS_8_14',
    budget: 400,
  },
  {
    title: 'Fix Mobile Responsive Layout Issues',
    description:
      'Debug and fix responsive design issues on tablet and mobile devices. Current layout breaks below 768px.',
    requirements:
      'Must test on iOS Safari, Chrome Android, and Firefox. Use CSS Grid/Flexbox optimally.',
    deliverables: 'Fixed CSS, browser compatibility report, before/after screenshots.',
    category: 'FRONTEND',
    type: 'PAID',
    difficulty: 'JUNIOR',
    estimatedEffortHours: 20,
    duration: 'DAYS_1_7',
    budget: 250,
  },
  {
    title: 'Database Query Optimization',
    description:
      'Optimize slow database queries causing performance bottlenecks. Analyze slow query logs and implement proper indexing.',
    requirements:
      'Use EXPLAIN ANALYZE. Document optimization strategies. Minimize migration impact.',
    deliverables: 'Optimized queries, migration script, performance comparison report.',
    category: 'BACKEND',
    type: 'PAID',
    difficulty: 'MIDDLE',
    estimatedEffortHours: 35,
    duration: 'DAYS_8_14',
    budget: 450,
  },
  {
    title: 'Build Admin User Management Page',
    description:
      'Create admin interface for managing user roles, permissions, and account status with bulk operations support.',
    requirements:
      'Implement filtering, sorting, and pagination. Add audit logging for admin actions. Require confirmation for destructive operations.',
    deliverables: 'React component, API endpoints, tests, and user documentation.',
    category: 'FRONTEND',
    type: 'PAID',
    difficulty: 'MIDDLE',
    estimatedEffortHours: 45,
    duration: 'DAYS_15_30',
    budget: 600,
  },
  {
    title: 'Implement Email Notification System',
    description:
      'Build email notification service triggered by user actions. Include templating, scheduling, and unsubscribe management.',
    requirements:
      'Handle transactional emails, support SMTP, include rate limiting. Must be testable without sending real emails.',
    deliverables: 'Email service with templates, unit tests, and integration documentation.',
    category: 'BACKEND',
    type: 'PAID',
    difficulty: 'MIDDLE',
    estimatedEffortHours: 38,
    duration: 'DAYS_8_14',
    budget: 500,
  },
  {
    title: 'Create Figma Design System',
    description:
      'Design comprehensive UI kit in Figma covering colors, typography, components, and spacing guidelines.',
    requirements:
      'Include light/dark modes, document usage patterns. Organize for developer handoff. Include annotation for measurements.',
    deliverables: 'Figma design system file with components, documentation, and usage guide.',
    category: 'OTHER',
    type: 'PAID',
    difficulty: 'MIDDLE',
    estimatedEffortHours: 50,
    duration: 'DAYS_15_30',
    budget: 700,
  },
  {
    title: 'Implement Search Functionality',
    description:
      'Add full-text search across products with filters, sorting, and pagination. Use Elasticsearch or PostgreSQL full-text search.',
    requirements:
      'Must be fast (<200ms response). Support fuzzy matching. Include search analytics.',
    deliverables: 'Search API, frontend component, search analytics dashboard.',
    category: 'BACKEND',
    type: 'PAID',
    difficulty: 'SENIOR',
    estimatedEffortHours: 60,
    duration: 'DAYS_15_30',
    budget: 800,
  },
  {
    title: 'Add Dark Mode Support',
    description: 'Implement system-wide dark mode toggle with persistent user preference storage.',
    requirements:
      'Support CSS custom properties, preserve accessibility, validate against WCAG AAA.',
    deliverables: 'Dark theme CSS, theme toggle component, localStorage integration.',
    category: 'FRONTEND',
    type: 'EXPERIENCE',
    difficulty: 'JUNIOR',
    estimatedEffortHours: 15,
    duration: 'DAYS_1_7',
    budget: 0,
  },
  {
    title: 'Create API Documentation',
    description:
      'Write comprehensive OpenAPI/Swagger documentation for all RESTful API endpoints including examples and authentication.',
    requirements:
      'Include request/response schemas, error codes, authentication methods. Must be auto-generated from code.',
    deliverables: 'OpenAPI spec file, Swagger UI implementation, usage guide.',
    category: 'OTHER',
    type: 'VOLUNTEER',
    difficulty: 'JUNIOR',
    estimatedEffortHours: 25,
    duration: 'DAYS_8_14',
    budget: 0,
  },
];

const reviewTexts = {
  excellent: [
    'Excellent work! Delivered on time with high-quality code. Very responsive to feedback and suggestions.',
    'Outstanding! The implementation exceeded our expectations. Professional approach and great communication.',
    'Perfect execution. Code is clean, well-tested, and production-ready. Would definitely hire again!',
    'Fantastic work! Problem-solving skills were impressive. Very professional and easy to work with.',
    'Exceptional quality! Attention to detail was impressive. Implemented features with great consideration for performance.',
  ],
  good: [
    'Great work overall! Minor revisions needed but mostly excellent. Good communication throughout.',
    'Very solid implementation. Small tweaks requested but fundamentally sound approach.',
    'Good quality work with timely delivery. Some edge cases needed refinement but very competent.',
    'Solid performance. Delivered what was promised with good code quality.',
    'Good work! Required some adjustments but overall very professional.',
  ],
  acceptable: [
    'Acceptable work but needed several revisions. Could improve code organization. Good effort overall.',
    'Decent work. Some parts needed rework but showed good learning attitude.',
    'Meets requirements with some quality concerns. Could benefit from more testing.',
    'Fair work. Required feedback implementation but fundamentally on track.',
  ],
};

const chatMessages = [
  "Hi! I'm interested in this task. I have solid React experience and think I can deliver quality code.",
  'When do you need this completed? Is there flexibility on the timeline?',
  'I have some questions about the requirements. Can we clarify the authentication approach?',
  'Started working on the task. Initial setup taking a bit longer than expected but making good progress.',
  'Submitted the first version for review. Would appreciate feedback on the API design.',
  'Made the requested changes. Also optimized the database queries as discussed.',
  'Ready for final review. All tests are passing and docs are complete.',
  'Thanks for the feedback! The revision is complete and testing looks good now.',
  'This is amazing work! The implementation is clean and well-documented.',
  'Quick question - should I add support for batch operations in the API?',
  'Ran into an issue with the PostgreSQL connection pooling. Investigating now.',
  'Got it sorted! The library was outdated. Updated and all tests pass.',
  'Great collaboration! Looking forward to working together again.',
  'Could you review the PR when you have a chance? Made the updates you suggested.',
];

// Main seed function
async function main() {
  console.log('🌱 Starting database seed (CLEAN MODE - clearing all data)...');

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.notification.deleteMany({});
    await prisma.chatThreadRead.deleteMany({});
    await prisma.chatMessage.deleteMany({});
    await prisma.chatThread.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.application.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.projectReport.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.developerProfile.deleteMany({});
    await prisma.companyProfile.deleteMany({});
    await prisma.verificationToken.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});

    // Create companies and their users
    console.log('👥 Creating companies...');
    const companies = [];
    for (const companyInfo of companyData) {
      const user = await createUser({
        email: generateEmail(companyInfo.name),
        companyProfile: {
          companyName: companyInfo.name,
          companyType: companyInfo.type,
          description: companyInfo.description,
          teamSize: companyInfo.teamSize,
          country: companyInfo.country,
          websiteUrl: companyInfo.websiteUrl,
          verified: true,
        },
      });
      companies.push({ user, ...companyInfo });
    }
    console.log(`✅ Created ${companies.length} company accounts`);

    // Create developers
    console.log('👨‍💻 Creating developers...');
    const developers = [];
    for (const devInfo of developerData) {
      const { name, ...devProfile } = devInfo;
      const user = await createUser({
        email: generateEmail(name),
        developerProfile: {
          displayName: name,
          ...devProfile,
        },
      });
      developers.push({ user, name, ...devProfile });
    }
    console.log(`✅ Created ${developers.length} developer profiles`);

    // Create projects
    console.log('📁 Creating projects...');
    const projects = [];
    let projectIndex = 0;
    for (const company of companies) {
      const projectsPerCompany = Math.floor(Math.random() * 2) + 2; // 2-3 projects per company
      for (let i = 0; i < projectsPerCompany && projectIndex < projectData.length; i++) {
        const projectInfo = projectData[projectIndex];
        const project = await prisma.project.create({
          data: {
            ownerUserId: company.user.id,
            title: projectInfo.title,
            shortDescription: projectInfo.shortDescription,
            description: projectInfo.description,
            technologies: projectInfo.technologies,
          },
        });
        projects.push(project);
        projectIndex++;
      }
    }
    console.log(`✅ Created ${projects.length} projects`);

    // Create tasks
    console.log('📝 Creating tasks...');
    const tasks = [];
    for (const project of projects) {
      const tasksPerProject = Math.floor(Math.random() * 2) + 3; // 3-4 tasks per project
      for (let i = 0; i < tasksPerProject; i++) {
        const templateIndex = Math.floor(Math.random() * taskTemplates.length);
        const template = taskTemplates[templateIndex];
        const task = await prisma.task.create({
          data: {
            ownerUserId: project.ownerUserId,
            projectId: project.id,
            title: template.title,
            description: template.description,
            requirements: template.requirements,
            deliverables: template.deliverables,
            category: template.category,
            type: template.type,
            difficulty: template.difficulty,
            estimatedEffortHours: template.estimatedEffortHours,
            expectedDuration: template.duration,
            communicationLanguage: 'English',
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            publishedAt: new Date(),
          },
        });
        tasks.push(task);
      }
    }
    console.log(`✅ Created ${tasks.length} tasks`);

    // Create applications and accepted work flows
    console.log('📤 Creating applications and work flows...');
    let applicationCount = 0;
    let chatThreadCount = 0;
    let reviewCount = 0;

    for (const task of tasks) {
      // 2-4 developers apply per task
      const numApplicants = Math.floor(Math.random() * 2) + 2;
      const applicants = developers.sort(() => Math.random() - 0.5).slice(0, numApplicants);

      for (let i = 0; i < applicants.length; i++) {
        const developer = applicants[i];
        const application = await prisma.application.create({
          data: {
            taskId: task.id,
            developerUserId: developer.user.id,
            message: `I'm interested in this task and confident I can deliver quality work. ${reviewTexts.good[0]}`,
            status: i === 0 ? 'ACCEPTED' : 'APPLIED', // First applicant accepted
            proposedPlan:
              i === 0
                ? 'I will start with setup and architecture review, then implement features incrementally with daily updates.'
                : null,
          },
        });
        applicationCount++;

        await createNotification({
          userId: task.ownerUserId,
          actorUserId: developer.user.id,
          taskId: task.id,
          type: 'APPLICATION_CREATED',
          payload: buildNotificationPayload({
            taskId: task.id,
            applicationId: application.id,
          }),
        });

        // If application accepted, create chat and collaborative flow
        if (application.status === 'ACCEPTED') {
          // Update task to link accepted application
          await prisma.task.update({
            where: { id: task.id },
            data: {
              acceptedApplicationId: application.id,
              status: 'IN_PROGRESS',
            },
          });

          await createNotification({
            userId: developer.user.id,
            actorUserId: task.ownerUserId,
            taskId: task.id,
            type: 'APPLICATION_ACCEPTED',
            payload: buildNotificationPayload({
              taskId: task.id,
              applicationId: application.id,
            }),
          });

          // Create chat thread
          const chatThread = await prisma.chatThread.create({
            data: {
              taskId: task.id,
              companyUserId: task.ownerUserId,
              developerUserId: developer.user.id,
            },
          });
          chatThreadCount++;

          // Add chat messages
          const numMessages = Math.floor(Math.random() * 3) + 2; // 2-4 messages
          for (let j = 0; j < numMessages; j++) {
            const messageIndex = Math.floor(Math.random() * chatMessages.length);
            const isSentByDev = Math.random() > 0.5;
            await prisma.chatMessage.create({
              data: {
                threadId: chatThread.id,
                senderUserId: isSentByDev ? developer.user.id : task.ownerUserId,
                senderPersona: isSentByDev ? 'developer' : 'company',
                text: chatMessages[messageIndex],
              },
            });

            await createNotification({
              userId: isSentByDev ? task.ownerUserId : developer.user.id,
              actorUserId: isSentByDev ? developer.user.id : task.ownerUserId,
              taskId: task.id,
              threadId: chatThread.id,
              type: 'CHAT_MESSAGE',
              payload: buildNotificationPayload({
                taskId: task.id,
                threadId: chatThread.id,
              }),
            });
          }

          await prisma.task.update({
            where: { id: task.id },
            data: {
              status: 'COMPLETION_REQUESTED',
            },
          });

          await createNotification({
            userId: task.ownerUserId,
            actorUserId: developer.user.id,
            taskId: task.id,
            type: 'COMPLETION_REQUESTED',
            payload: buildNotificationPayload({
              taskId: task.id,
            }),
          });

          // Update task to completed status
          const completedAt = new Date();
          await prisma.task.update({
            where: { id: task.id },
            data: {
              status: 'COMPLETED',
              completedAt,
            },
          });

          await createNotification({
            userId: developer.user.id,
            actorUserId: task.ownerUserId,
            taskId: task.id,
            type: 'TASK_COMPLETED',
            payload: buildNotificationPayload({
              taskId: task.id,
              completedAt: completedAt.toISOString(),
            }),
          });

          // Create reviews: company reviews developer and vice versa
          // Company reviews developer (random rating 3-5, mostly 4-5)
          const ratings = [3, 4, 4, 4, 5, 5, 5];
          const companyRating = ratings[Math.floor(Math.random() * ratings.length)];
          const reviewTextsToUse =
            companyRating === 5
              ? reviewTexts.excellent
              : companyRating === 4
                ? reviewTexts.good
                : reviewTexts.acceptable;
          const companyReviewText =
            reviewTextsToUse[Math.floor(Math.random() * reviewTextsToUse.length)];

          const createdCompanyReview = await prisma.review.create({
            data: {
              taskId: task.id,
              authorUserId: task.ownerUserId,
              targetUserId: developer.user.id,
              rating: companyRating,
              text: companyReviewText,
            },
          });
          reviewCount++;

          await createNotification({
            userId: developer.user.id,
            actorUserId: task.ownerUserId,
            taskId: task.id,
            type: 'REVIEW_CREATED',
            payload: buildNotificationPayload({
              taskId: task.id,
              reviewId: createdCompanyReview.id,
              rating: companyRating,
            }),
          });

          // Developer reviews company (usually positive)
          const devRating = ratings[Math.floor(Math.random() * ratings.length)];
          const devReviewTexts =
            devRating === 5
              ? reviewTexts.excellent
              : devRating === 4
                ? reviewTexts.good
                : reviewTexts.acceptable;
          const devReviewText = devReviewTexts[Math.floor(Math.random() * devReviewTexts.length)];

          const createdDevReview = await prisma.review.create({
            data: {
              taskId: task.id,
              authorUserId: developer.user.id,
              targetUserId: task.ownerUserId,
              rating: devRating,
              text: devReviewText,
            },
          });
          reviewCount++;

          await createNotification({
            userId: task.ownerUserId,
            actorUserId: developer.user.id,
            taskId: task.id,
            type: 'REVIEW_CREATED',
            payload: buildNotificationPayload({
              taskId: task.id,
              reviewId: createdDevReview.id,
              rating: devRating,
            }),
          });
        }
      }
    }
    console.log(`✅ Created ${applicationCount} applications`);
    console.log(`✅ Created ${chatThreadCount} chat threads with messages`);
    console.log(`✅ Created ${reviewCount} reviews`);

    console.log('\n✨ Database seeding completed successfully!');
    console.log(`
    📊 Summary:
    - Companies: ${companies.length}
    - Developers: ${developers.length}
    - Projects: ${projects.length}
    - Tasks: ${tasks.length}
    - Applications: ${applicationCount}
    - Chat Threads: ${chatThreadCount}
    - Reviews: ${reviewCount}
    `);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
