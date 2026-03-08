import 'dotenv/config';
import { prisma } from '../src/db/prisma.js';
import { hashPassword } from '../src/utils/password.js';

// Utility functions
const TARGET_PROJECTS_PER_COMPANY = 3;
const TARGET_TASKS_PER_PROJECT = 5;
const MIN_PROJECT_MAX_TALENTS = 8;

function generateEmail(name) {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
}

/**
 * Slugify for technology names
 * - lowercases
 * - replaces '+' and '#' for common tech names
 * - keeps letters, digits, dots and dashes
 */
function slugify(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/&/g, 'and')
    .replace(/\./g, '.') // keep dots (node.js, .net)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Normalize technology list - ensure stable slug + remove duplicates by slug
 */
function normalizeTechList(list) {
  const map = new Map();
  for (const item of list) {
    const slug = item.slug ? item.slug : slugify(item.name);
    const key = slug;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item, slug });
    } else {
      // If duplicate, keep the max popularityScore and prefer explicit type (non-OTHER)
      map.set(key, {
        ...existing,
        popularityScore: Math.max(existing.popularityScore ?? 0, item.popularityScore ?? 0),
        type: existing.type !== 'OTHER' ? existing.type : item.type,
        name: existing.name.length >= item.name.length ? existing.name : item.name,
      });
    }
  }
  return Array.from(map.values());
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

async function createNotificationIfMissing({
  userId,
  actorUserId,
  taskId,
  type,
  payload,
  threadId = null,
  projectId = null,
}) {
  if (type === 'CHAT_MESSAGE') {
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

  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      actorUserId,
      taskId,
      type,
    },
  });

  if (existing) return existing;

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

// Technology data with initial popularity scores
const TECHNOLOGIES = [
  // ---------------- BACKEND ----------------
  { name: 'Java', type: 'BACKEND', popularityScore: 95 },
  { name: 'Spring Boot', type: 'BACKEND', popularityScore: 90 },
  { name: 'Spring', type: 'BACKEND', popularityScore: 75 },
  { name: 'Hibernate', type: 'BACKEND', popularityScore: 55 },
  { name: 'JPA', type: 'BACKEND', popularityScore: 50 },
  { name: 'Maven', type: 'BACKEND', popularityScore: 40 },
  { name: 'Gradle', type: 'BACKEND', popularityScore: 35 },
  { name: 'Node.js', type: 'BACKEND', popularityScore: 92 },
  { name: 'Express', type: 'BACKEND', popularityScore: 70 },
  { name: 'NestJS', type: 'BACKEND', popularityScore: 65 },
  { name: 'Fastify', type: 'BACKEND', popularityScore: 30 },
  { name: 'Python', type: 'BACKEND', popularityScore: 90 },
  { name: 'Django', type: 'BACKEND', popularityScore: 55 },
  { name: 'FastAPI', type: 'BACKEND', popularityScore: 70 },
  { name: 'Flask', type: 'BACKEND', popularityScore: 35 },
  { name: 'C#', type: 'BACKEND', popularityScore: 70 },
  { name: '.NET', type: 'BACKEND', popularityScore: 75 },
  { name: 'ASP.NET Core', type: 'BACKEND', popularityScore: 60 },
  { name: 'Go', type: 'BACKEND', popularityScore: 55 },
  { name: 'Gin', type: 'BACKEND', popularityScore: 20 },
  { name: 'PHP', type: 'BACKEND', popularityScore: 45 },
  { name: 'Laravel', type: 'BACKEND', popularityScore: 40 },
  { name: 'Symfony', type: 'BACKEND', popularityScore: 20 },
  { name: 'Ruby', type: 'BACKEND', popularityScore: 25 },
  { name: 'Ruby on Rails', type: 'BACKEND', popularityScore: 30 },
  { name: 'REST API', type: 'BACKEND', popularityScore: 85 },
  { name: 'GraphQL', type: 'BACKEND', popularityScore: 45 },

  // ---------------- FRONTEND ----------------
  { name: 'JavaScript', type: 'FRONTEND', popularityScore: 100 },
  { name: 'TypeScript', type: 'FRONTEND', popularityScore: 95 },
  { name: 'React', type: 'FRONTEND', popularityScore: 95 },
  { name: 'Next.js', type: 'FRONTEND', popularityScore: 70 },
  { name: 'Redux', type: 'FRONTEND', popularityScore: 45 },
  { name: 'React Query', type: 'FRONTEND', popularityScore: 30 },
  { name: 'Vue.js', type: 'FRONTEND', popularityScore: 60 },
  { name: 'Nuxt', type: 'FRONTEND', popularityScore: 25 },
  { name: 'Angular', type: 'FRONTEND', popularityScore: 55 },
  { name: 'Svelte', type: 'FRONTEND', popularityScore: 20 },
  { name: 'HTML', type: 'FRONTEND', popularityScore: 85 },
  { name: 'CSS', type: 'FRONTEND', popularityScore: 85 },
  { name: 'Sass', type: 'FRONTEND', popularityScore: 30 },
  { name: 'Tailwind CSS', type: 'FRONTEND', popularityScore: 55 },
  { name: 'Bootstrap', type: 'FRONTEND', popularityScore: 35 },
  { name: 'Vite', type: 'FRONTEND', popularityScore: 30 },
  { name: 'Webpack', type: 'FRONTEND', popularityScore: 25 },

  // ---------------- FULLSTACK ----------------
  { name: 'Fullstack (JS)', type: 'FULLSTACK', popularityScore: 60 },
  { name: 'Next.js Fullstack', type: 'FULLSTACK', popularityScore: 40 },
  { name: 'MERN Stack', type: 'FULLSTACK', popularityScore: 35 },
  { name: 'MEAN Stack', type: 'FULLSTACK', popularityScore: 20 },

  // ---------------- DEVOPS ----------------
  { name: 'Docker', type: 'DEVOPS', popularityScore: 90 },
  { name: 'Docker Compose', type: 'DEVOPS', popularityScore: 70 },
  { name: 'Kubernetes', type: 'DEVOPS', popularityScore: 75 },
  { name: 'Helm', type: 'DEVOPS', popularityScore: 35 },
  { name: 'Terraform', type: 'DEVOPS', popularityScore: 55 },
  { name: 'Ansible', type: 'DEVOPS', popularityScore: 25 },
  { name: 'AWS', type: 'DEVOPS', popularityScore: 80 },
  { name: 'GCP', type: 'DEVOPS', popularityScore: 35 },
  { name: 'Azure', type: 'DEVOPS', popularityScore: 35 },
  { name: 'GitHub Actions', type: 'DEVOPS', popularityScore: 60 },
  { name: 'GitLab CI', type: 'DEVOPS', popularityScore: 30 },
  { name: 'Jenkins', type: 'DEVOPS', popularityScore: 35 },
  { name: 'Nginx', type: 'DEVOPS', popularityScore: 55 },
  { name: 'Traefik', type: 'DEVOPS', popularityScore: 20 },
  { name: 'Linux', type: 'DEVOPS', popularityScore: 70 },
  { name: 'Bash', type: 'DEVOPS', popularityScore: 45 },
  { name: 'Prometheus', type: 'DEVOPS', popularityScore: 35 },
  { name: 'Grafana', type: 'DEVOPS', popularityScore: 40 },

  // ---------------- QA ----------------
  { name: 'Manual Testing', type: 'QA', popularityScore: 55 },
  { name: 'Test Automation', type: 'QA', popularityScore: 55 },
  { name: 'Jest', type: 'QA', popularityScore: 45 },
  { name: 'Mocha', type: 'QA', popularityScore: 15 },
  { name: 'Cypress', type: 'QA', popularityScore: 30 },
  { name: 'Playwright', type: 'QA', popularityScore: 30 },
  { name: 'Selenium', type: 'QA', popularityScore: 25 },
  { name: 'JUnit', type: 'QA', popularityScore: 35 },
  { name: 'Testcontainers', type: 'QA', popularityScore: 25 },
  { name: 'Postman', type: 'QA', popularityScore: 50 },

  // ---------------- DATA ----------------
  { name: 'SQL', type: 'DATA', popularityScore: 90 },
  { name: 'PostgreSQL', type: 'DATA', popularityScore: 85 },
  { name: 'MySQL', type: 'DATA', popularityScore: 55 },
  { name: 'MongoDB', type: 'DATA', popularityScore: 60 },
  { name: 'Redis', type: 'DATA', popularityScore: 55 },
  { name: 'Kafka', type: 'DATA', popularityScore: 45 },
  { name: 'RabbitMQ', type: 'DATA', popularityScore: 25 },
  { name: 'Elasticsearch', type: 'DATA', popularityScore: 25 },
  { name: 'Prisma', type: 'DATA', popularityScore: 35 },

  // ---------------- MOBILE ----------------
  { name: 'Android', type: 'MOBILE', popularityScore: 40 },
  { name: 'Kotlin', type: 'MOBILE', popularityScore: 35 },
  { name: 'iOS', type: 'MOBILE', popularityScore: 35 },
  { name: 'Swift', type: 'MOBILE', popularityScore: 30 },
  { name: 'Flutter', type: 'MOBILE', popularityScore: 45 },
  { name: 'React Native', type: 'MOBILE', popularityScore: 45 },

  // ---------------- AI / ML ----------------
  { name: 'Machine Learning', type: 'AI_ML', popularityScore: 60 },
  { name: 'Deep Learning', type: 'AI_ML', popularityScore: 45 },
  { name: 'PyTorch', type: 'AI_ML', popularityScore: 45 },
  { name: 'TensorFlow', type: 'AI_ML', popularityScore: 35 },
  { name: 'scikit-learn', type: 'AI_ML', popularityScore: 40 },
  { name: 'LLMs', type: 'AI_ML', popularityScore: 55 },
  { name: 'RAG', type: 'AI_ML', popularityScore: 35 },

  // ---------------- UI/UX DESIGN ----------------
  { name: 'Figma', type: 'UI_UX_DESIGN', popularityScore: 80 },
  { name: 'UI Design', type: 'UI_UX_DESIGN', popularityScore: 55 },
  { name: 'UX Research', type: 'UI_UX_DESIGN', popularityScore: 35 },
  { name: 'Design Systems', type: 'UI_UX_DESIGN', popularityScore: 30 },
  { name: 'Wireframing', type: 'UI_UX_DESIGN', popularityScore: 25 },

  // ---------------- PRODUCT MANAGEMENT ----------------
  { name: 'Product Discovery', type: 'PRODUCT_MANAGEMENT', popularityScore: 25 },
  { name: 'Roadmapping', type: 'PRODUCT_MANAGEMENT', popularityScore: 20 },
  { name: 'Product Analytics', type: 'PRODUCT_MANAGEMENT', popularityScore: 20 },

  // ---------------- BUSINESS ANALYSIS ----------------
  { name: 'Business Analysis', type: 'BUSINESS_ANALYSIS', popularityScore: 25 },
  { name: 'Requirements', type: 'BUSINESS_ANALYSIS', popularityScore: 20 },
  { name: 'User Stories', type: 'BUSINESS_ANALYSIS', popularityScore: 20 },

  // ---------------- CYBERSECURITY ----------------
  { name: 'OWASP Top 10', type: 'CYBERSECURITY', popularityScore: 25 },
  { name: 'App Security', type: 'CYBERSECURITY', popularityScore: 20 },
  { name: 'Penetration Testing', type: 'CYBERSECURITY', popularityScore: 15 },

  // ---------------- GAME DEV ----------------
  { name: 'Unity', type: 'GAME_DEV', popularityScore: 20 },
  { name: 'Unreal Engine', type: 'GAME_DEV', popularityScore: 15 },

  // ---------------- EMBEDDED ----------------
  { name: 'Embedded C', type: 'EMBEDDED', popularityScore: 15 },
  { name: 'C', type: 'EMBEDDED', popularityScore: 20 },
  { name: 'C++', type: 'EMBEDDED', popularityScore: 20 },

  // ---------------- TECH WRITING ----------------
  { name: 'Technical Writing', type: 'TECH_WRITING', popularityScore: 25 },
  { name: 'API Documentation', type: 'TECH_WRITING', popularityScore: 20 },

  // ---------------- OTHER ----------------
  { name: 'Git', type: 'OTHER', popularityScore: 75 },
  { name: 'Agile', type: 'OTHER', popularityScore: 35 },
  { name: 'Scrum', type: 'OTHER', popularityScore: 30 },
];

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
    availability: 'PART_TIME',
    preferredTaskCategories: ['FRONTEND'],
  },
  {
    name: 'Emma Chen',
    jobTitle: 'React Developer',
    bio: 'Specialized in modern React patterns and state management. Strong CSS fundamentals.',
    experienceLevel: 'JUNIOR',
    location: 'Toronto, Canada',
    availability: 'FULL_TIME',
    preferredTaskCategories: ['FRONTEND'],
  },
  {
    name: 'Marco Rossi',
    jobTitle: 'UI Developer',
    bio: 'Focus on user experience and clean code. Experience with Vue and React.',
    experienceLevel: 'JUNIOR',
    location: 'Berlin, Germany',
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
    availability: 'FULL_TIME',
    preferredTaskCategories: ['BACKEND'],
  },
  {
    name: 'Sofia Petrov',
    jobTitle: 'Full Stack Developer',
    bio: 'Comfortable across the stack. Recent bootcamp graduate focused on web development.',
    experienceLevel: 'STUDENT',
    location: 'Sofia, Bulgaria',
    availability: 'FULL_TIME',
    preferredTaskCategories: ['BACKEND', 'FRONTEND'],
  },
  {
    name: 'James Wilson',
    jobTitle: 'Python Developer',
    bio: 'Transitioning from Python to Node.js. Data processing and API development experience.',
    experienceLevel: 'JUNIOR',
    location: 'Austin, Texas',
    availability: 'PART_TIME',
    preferredTaskCategories: ['BACKEND'],
  },
  {
    name: 'Lisa Anderson',
    jobTitle: 'Backend Developer',
    bio: 'Experience building microservices. Strong in system design and optimization.',
    experienceLevel: 'MIDDLE',
    location: 'Seattle, Washington',
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
    availability: 'FULL_TIME',
    preferredTaskCategories: ['OTHER'],
  },
  {
    name: 'Tom Hayes',
    jobTitle: 'Product Designer',
    bio: 'Focused on designing delightful user experiences. Experience in design sprints.',
    experienceLevel: 'JUNIOR',
    location: 'Dublin, Ireland',
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
    availability: 'FULL_TIME',
    preferredTaskCategories: ['QA'],
  },
  {
    name: 'Carlos Mendez',
    jobTitle: 'DevOps Enthusiast',
    bio: 'Learning Docker and Kubernetes. Interested in CI/CD pipelines.',
    experienceLevel: 'STUDENT',
    location: 'Mexico City, Mexico',
    availability: 'FULL_TIME',
    preferredTaskCategories: ['DEVOPS'],
  },
  {
    name: 'Priya Sharma',
    jobTitle: 'Full Stack Developer',
    bio: 'Bootcamp graduate with passion for clean code and modern tech.',
    experienceLevel: 'STUDENT',
    location: 'Chennai, India',
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
  },
  {
    title: 'Mobile App MVP',
    shortDescription: 'Native iOS/Android app for managing team tasks and collaboration.',
    description:
      'Mobile-first application for small teams to track projects, share files, and communicate. This is our initial MVP focusing on core features.',
  },
  {
    title: 'Analytics Dashboard',
    shortDescription: 'Real-time analytics and reporting for SaaS product.',
    description:
      'Building a comprehensive analytics dashboard that visualizes customer data, revenue metrics, and product usage patterns. Real-time updates required.',
  },
  {
    title: 'API Gateway Service',
    shortDescription: 'Central API management and authentication layer.',
    description:
      'Implementing a scalable API gateway for routing requests, managing authentication, and rate limiting across all services.',
  },
  {
    title: 'Customer Portal Enhancement',
    shortDescription: 'Adding new self-service features to existing customer portal.',
    description:
      'Extending our web portal with invoice management, subscription updates, and support ticket creation. Must integrate with existing systems.',
  },
  {
    title: 'Internal Admin Dashboard',
    shortDescription: 'Admin panel for managing platform users and content.',
    description:
      'Building comprehensive admin tools for user management, moderation, analytics review, and content publishing workflows.',
  },
];

const taskTemplates = [
  {
    title: 'Implement User Authentication Module',
    description:
      'Build a secure user authentication system with JWT tokens, refresh token rotation, and password hashing using bcrypt.',
    requirements: [
      'Must handle user registration, login, logout, password reset. Include comprehensive error handling and input validation.',
    ],
    deliverables: ['Authentication service with unit tests, API endpoints, and documentation.'],
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
    requirements: [
      'Components must be responsive, accessible (WCAG 2.1), and documented. Include Storybook integration.',
    ],
    deliverables: ['Component library with TypeScript types, Storybook, and usage examples.'],
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
    requirements: [
      'Must test on iOS Safari, Chrome Android, and Firefox. Use CSS Grid/Flexbox optimally.',
    ],
    deliverables: ['Fixed CSS, browser compatibility report, before/after screenshots.'],
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
    requirements: [
      'Use EXPLAIN ANALYZE. Document optimization strategies. Minimize migration impact.',
    ],
    deliverables: ['Optimized queries, migration script, performance comparison report.'],
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
    requirements: [
      'Implement filtering, sorting, and pagination. Add audit logging for admin actions. Require confirmation for destructive operations.',
    ],
    deliverables: ['React component, API endpoints, tests, and user documentation.'],
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
    requirements: [
      'Handle transactional emails, support SMTP, include rate limiting. Must be testable without sending real emails.',
    ],
    deliverables: ['Email service with templates, unit tests, and integration documentation.'],
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
    requirements: [
      'Include light/dark modes, document usage patterns. Organize for developer handoff. Include annotation for measurements.',
    ],
    deliverables: ['Figma design system file with components, documentation, and usage guide.'],
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
    requirements: [
      'Must be fast (<200ms response). Support fuzzy matching. Include search analytics.',
    ],
    deliverables: ['Search API, frontend component, search analytics dashboard.'],
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
    requirements: [
      'Support CSS custom properties, preserve accessibility, validate against WCAG AAA.',
    ],
    deliverables: ['Dark theme CSS, theme toggle component, localStorage integration.'],
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
    requirements: [
      'Include request/response schemas, error codes, authentication methods. Must be auto-generated from code.',
    ],
    deliverables: ['OpenAPI spec file, Swagger UI implementation, usage guide.'],
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
  console.log('🌱 Starting database seed...');

  try {
    // Create/update technologies catalog first
    console.log('🔧 Creating technologies catalog (if not exists)...');
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
    console.log(`✅ Technologies ready: ${createdTechnologies.length}`);

    // Skip clearing existing data - only add new data if not already present
    console.log('📊 Checking existing data...');

    // Create companies and their users
    console.log('👥 Creating companies (if not exists)...');
    const companies = [];
    for (const companyInfo of companyData) {
      const email = generateEmail(companyInfo.name);
      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { companyProfile: true },
      });

      if (existingUser) {
        console.log(`⏭️  Company ${email} already exists, skipping...`);
        companies.push({ user: existingUser, ...companyInfo });
        continue;
      }

      const user = await createUser({
        email,
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
    console.log(`✅ Companies ready: ${companies.length}`);

    // Create developers
    console.log('👨‍💻 Creating developers (if not exists)...');
    const developers = [];
    for (const devInfo of developerData) {
      // Filter out legacy fields (skills, techStack) - using new DeveloperTechnology relations instead
      // eslint-disable-next-line no-unused-vars
      const { name, skills, techStack, ...devProfile } = devInfo;
      const email = generateEmail(name);
      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { developerProfile: true },
      });

      if (existingUser) {
        console.log(`⏭️  Developer ${email} already exists, skipping...`);
        developers.push({ user: existingUser, name, ...devProfile });
        continue;
      }

      const user = await createUser({
        email,
        developerProfile: {
          displayName: name,
          ...devProfile,
        },
      });
      developers.push({ user, name, ...devProfile });
    }
    console.log(`✅ Developers ready: ${developers.length}`);

    // Link developers to technologies based on their job titles
    console.log('🔗 Linking developers to technologies...');
    let devTechLinkCount = 0;

    for (const dev of developers) {
      // Skip if already has tech links
      const existingLinks = await prisma.developerTechnology.count({
        where: { developerUserId: dev.user.id },
      });

      if (existingLinks > 0) {
        console.log(
          `⏭️  Developer ${dev.user.email} already has ${existingLinks} tech links, skipping...`
        );
        continue;
      }

      // Determine tech pool based on job title and preferred categories
      let techPool = [];
      const jobTitle = dev.jobTitle?.toLowerCase() || '';
      const preferredCats = dev.preferredCategories || [];

      if (jobTitle.includes('backend') || preferredCats.includes('BACKEND')) {
        techPool = createdTechnologies.filter((t) => t.type === 'BACKEND');
      } else if (jobTitle.includes('frontend') || preferredCats.includes('FRONTEND')) {
        techPool = createdTechnologies.filter((t) => t.type === 'FRONTEND');
      } else if (
        jobTitle.includes('fullstack') ||
        jobTitle.includes('full stack') ||
        jobTitle.includes('full-stack')
      ) {
        const backendTechs = createdTechnologies.filter((t) => t.type === 'BACKEND');
        const frontendTechs = createdTechnologies.filter((t) => t.type === 'FRONTEND');
        techPool = [...backendTechs.slice(0, 10), ...frontendTechs.slice(0, 10)];
      } else if (jobTitle.includes('devops') || preferredCats.includes('DEVOPS')) {
        techPool = createdTechnologies.filter((t) => t.type === 'DEVOPS');
      } else if (
        jobTitle.includes('qa') ||
        jobTitle.includes('test') ||
        preferredCats.includes('QA')
      ) {
        techPool = createdTechnologies.filter((t) => t.type === 'QA');
      } else if (jobTitle.includes('mobile') || preferredCats.includes('MOBILE')) {
        techPool = createdTechnologies.filter((t) => t.type === 'MOBILE');
      } else if (
        jobTitle.includes('ui') ||
        jobTitle.includes('ux') ||
        jobTitle.includes('design')
      ) {
        techPool = createdTechnologies.filter(
          (t) =>
            t.type === 'UI_UX_DESIGN' ||
            (t.type === 'FRONTEND' && (t.name.toLowerCase().includes('css') || t.name === 'Figma'))
        );
      } else if (
        jobTitle.includes('data') ||
        jobTitle.includes('database') ||
        preferredCats.includes('DATA')
      ) {
        techPool = createdTechnologies.filter((t) => t.type === 'DATA');
      } else if (
        jobTitle.includes('ml') ||
        jobTitle.includes('ai') ||
        preferredCats.includes('AI_ML')
      ) {
        techPool = createdTechnologies.filter((t) => t.type === 'AI_ML');
      } else {
        // Fallback: mix of popular technologies
        techPool = createdTechnologies.filter((t) => t.popularityScore >= 40);
      }

      // Pick 3-5 random technologies
      const numTechs = Math.floor(Math.random() * 3) + 3; // 3-5
      const selectedTechs = techPool.sort(() => Math.random() - 0.5).slice(0, numTechs);

      // Determine proficiency years based on experience
      const experience = dev.experience || 'MIDDLE';
      const baseYears =
        experience === 'JUNIOR' || experience === 'STUDENT' ? 1 : experience === 'SENIOR' ? 5 : 3;

      for (const tech of selectedTechs) {
        const proficiencyYears =
          baseYears + Math.floor(Math.random() * (experience === 'SENIOR' ? 5 : 2));

        await prisma.developerTechnology.create({
          data: {
            developerUserId: dev.user.id,
            technologyId: tech.id,
            proficiencyYears,
          },
        });

        devTechLinkCount++;
      }
    }
    console.log(`✅ Developer-technology links created: ${devTechLinkCount}`);

    // Create projects (idempotent and without uncontrolled growth)
    console.log('📁 Creating projects (if missing)...');
    const projects = [];

    for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
      const company = companies[companyIndex];

      const existingProjects = await prisma.project.findMany({
        where: {
          ownerUserId: company.user.id,
          deletedAt: null,
        },
      });

      projects.push(...existingProjects);

      if (existingProjects.length >= TARGET_PROJECTS_PER_COMPANY) {
        console.log(
          `⏭️  Company ${company.user.email} already has ${existingProjects.length} projects, skipping creation...`
        );
        continue;
      }

      const existingTitles = new Set(existingProjects.map((project) => project.title));
      const companyProjectTemplates = projectData.slice(
        companyIndex * TARGET_PROJECTS_PER_COMPANY,
        companyIndex * TARGET_PROJECTS_PER_COMPANY + TARGET_PROJECTS_PER_COMPANY
      );

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
    console.log(`✅ Projects ready: ${projects.length}`);

    // Create tasks (idempotent, with fixed target per project)
    console.log('📝 Creating tasks (if missing)...');
    const tasks = [];
    const newlyCreatedTasks = [];

    for (const project of projects) {
      const existingTasks = await prisma.task.findMany({
        where: {
          projectId: project.id,
          deletedAt: null,
        },
      });

      const existingTitles = new Set(existingTasks.map((task) => task.title));
      const projectTasks = [...existingTasks];

      if (projectTasks.length < TARGET_TASKS_PER_PROJECT) {
        const missingCount = TARGET_TASKS_PER_PROJECT - projectTasks.length;
        const availableTemplates = taskTemplates.filter(
          (template) => !existingTitles.has(template.title)
        );

        for (let i = 0; i < missingCount && i < availableTemplates.length; i++) {
          const template = availableTemplates[i];

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
              publishedAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000), // deterministic: 1h, 2h, ... ago
            },
          });

          existingTitles.add(template.title);
          projectTasks.push(task);
          newlyCreatedTasks.push(task);
        }
      }

      tasks.push(...projectTasks);
    }
    console.log(`✅ Tasks ready: ${tasks.length}`);
    console.log(`✅ Newly created tasks this run: ${newlyCreatedTasks.length}`);

    // Link newly created tasks to technologies based on category
    console.log('🔗 Linking tasks to technologies...');
    let taskTechLinkCount = 0;

    for (const task of newlyCreatedTasks) {
      // Skip if already has tech links
      const existingLinks = await prisma.taskTechnology.count({
        where: { taskId: task.id },
      });

      if (existingLinks > 0) {
        console.log(
          `⏭️  Task "${task.title}" already has ${existingLinks} tech links, skipping...`
        );
        continue;
      }

      // Determine tech pool based on task category
      let techPool = [];
      const category = task.category;

      if (category === 'BACKEND') {
        techPool = createdTechnologies.filter((t) => t.type === 'BACKEND' || t.type === 'DATA');
      } else if (category === 'FRONTEND') {
        techPool = createdTechnologies.filter((t) => t.type === 'FRONTEND');
      } else if (category === 'FULLSTACK') {
        const backendTechs = createdTechnologies.filter((t) => t.type === 'BACKEND');
        const frontendTechs = createdTechnologies.filter((t) => t.type === 'FRONTEND');
        techPool = [...backendTechs.slice(0, 15), ...frontendTechs.slice(0, 10)];
      } else if (category === 'DEVOPS') {
        techPool = createdTechnologies.filter((t) => t.type === 'DEVOPS');
      } else if (category === 'QA') {
        techPool = createdTechnologies.filter((t) => t.type === 'QA');
      } else if (category === 'DATA') {
        techPool = createdTechnologies.filter((t) => t.type === 'DATA');
      } else if (category === 'MOBILE') {
        techPool = createdTechnologies.filter((t) => t.type === 'MOBILE');
      } else if (category === 'AI_ML') {
        techPool = createdTechnologies.filter(
          (t) => t.type === 'AI_ML' || (t.type === 'BACKEND' && t.name === 'Python')
        );
      } else if (category === 'UI_UX_DESIGN') {
        techPool = createdTechnologies.filter((t) => t.type === 'UI_UX_DESIGN');
      } else if (category === 'GAME_DEV') {
        techPool = createdTechnologies.filter((t) => t.type === 'GAME_DEV');
      } else if (category === 'EMBEDDED') {
        techPool = createdTechnologies.filter((t) => t.type === 'EMBEDDED');
      } else {
        // Fallback: popular technologies
        techPool = createdTechnologies.filter((t) => t.popularityScore >= 30 && t.type === 'OTHER');
      }

      // Pick 2-4 random technologies
      const numTechs = Math.floor(Math.random() * 3) + 2; // 2-4
      const selectedTechs = techPool.sort(() => Math.random() - 0.5).slice(0, numTechs);

      for (let i = 0; i < selectedTechs.length; i++) {
        const tech = selectedTechs[i];
        const isRequired = Math.random() < 0.7; // 70% marked as required

        await prisma.taskTechnology.create({
          data: {
            taskId: task.id,
            technologyId: tech.id,
            isRequired,
          },
        });

        taskTechLinkCount++;
      }
    }
    console.log(`✅ Task-technology links created: ${taskTechLinkCount}`);

    // Create applications and accepted work flows
    console.log('📤 Creating applications and work flows (if not exists)...');
    let applicationCount = 0;
    let chatThreadCount = 0;
    let reviewCount = 0;

    for (const task of newlyCreatedTasks) {
      // Check if task already has an accepted application
      const existingAccepted = await prisma.application.findFirst({
        where: {
          taskId: task.id,
          status: 'ACCEPTED',
        },
      });

      if (existingAccepted) {
        console.log(`⏭️  Task "${task.title}" already has accepted application, skipping...`);
        continue;
      }

      // Only 70% of tasks get accepted applications to leave some in PUBLISHED state for preview display
      const shouldCreateAcceptedApp = Math.random() < 0.7;

      // 2-4 developers apply per task
      const numApplicants = Math.floor(Math.random() * 2) + 2;
      const applicants = developers.sort(() => Math.random() - 0.5).slice(0, numApplicants);

      for (let i = 0; i < applicants.length; i++) {
        const developer = applicants[i];

        // Check if application already exists
        const existingApp = await prisma.application.findFirst({
          where: {
            taskId: task.id,
            developerUserId: developer.user.id,
          },
        });

        if (existingApp) {
          console.log(
            `⏭️  Application from ${developer.user.email} to "${task.title}" already exists, skipping...`
          );
          continue;
        }

        const application = await prisma.application.create({
          data: {
            taskId: task.id,
            developerUserId: developer.user.id,
            message: `I'm interested in this task and confident I can deliver quality work. ${reviewTexts.good[0]}`,
            status: i === 0 && shouldCreateAcceptedApp ? 'ACCEPTED' : 'APPLIED',
            proposedPlan:
              i === 0 && shouldCreateAcceptedApp
                ? 'I will start with setup and architecture review, then implement features incrementally with daily updates.'
                : null,
          },
        });
        applicationCount++;

        await createNotificationIfMissing({
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

          await createNotificationIfMissing({
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
          const existingChat = await prisma.chatThread.findFirst({
            where: {
              taskId: task.id,
            },
          });

          if (!existingChat) {
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

              await createNotificationIfMissing({
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
          }

          await prisma.task.update({
            where: { id: task.id },
            data: {
              status: 'COMPLETION_REQUESTED',
            },
          });

          await createNotificationIfMissing({
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

          await createNotificationIfMissing({
            userId: developer.user.id,
            actorUserId: task.ownerUserId,
            taskId: task.id,
            type: 'TASK_COMPLETED',
            payload: buildNotificationPayload({
              taskId: task.id,
              completedAt: completedAt.toISOString(),
            }),
          });

          // Create reviews if not already exist
          const existingCompanyReview = await prisma.review.findFirst({
            where: {
              taskId: task.id,
              authorUserId: task.ownerUserId,
            },
          });

          if (!existingCompanyReview) {
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

            await createNotificationIfMissing({
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
          }

          // Developer reviews company
          const existingDevReview = await prisma.review.findFirst({
            where: {
              taskId: task.id,
              authorUserId: developer.user.id,
            },
          });

          if (!existingDevReview) {
            const devRating = [3, 4, 4, 4, 5, 5, 5][Math.floor(Math.random() * 7)];
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

            await createNotificationIfMissing({
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
    }
    console.log(`✅ Created ${applicationCount} applications`);
    console.log(`✅ Created ${chatThreadCount} chat threads with messages`);
    console.log(`✅ Created ${reviewCount} reviews`);

    // Reconcile project counters/limits for existing data (non-destructive)
    console.log('\n🛠️  Reconciling existing project counters and limits...');
    let reconciledProjectsCount = 0;

    for (const project of projects) {
      const [freshProject, taskGroups] = await Promise.all([
        prisma.project.findUnique({
          where: { id: project.id },
          select: {
            id: true,
            maxTalents: true,
            publishedTasksCount: true,
          },
        }),
        prisma.task.groupBy({
          by: ['status'],
          where: {
            projectId: project.id,
            deletedAt: null,
          },
          _count: { _all: true },
        }),
      ]);

      if (!freshProject) continue;

      const countByStatus = Object.fromEntries(taskGroups.map((g) => [g.status, g._count._all]));
      const publishedCount = countByStatus.PUBLISHED ?? 0;
      const completedCount = countByStatus.COMPLETED ?? 0;
      const failedCount = countByStatus.FAILED ?? 0;
      const usedTalents = completedCount + failedCount;

      const desiredMaxTalents = Math.max(
        freshProject.maxTalents,
        MIN_PROJECT_MAX_TALENTS,
        usedTalents,
        publishedCount
      );

      const updateData = {};
      if (freshProject.maxTalents !== desiredMaxTalents) {
        updateData.maxTalents = desiredMaxTalents;
      }
      if (freshProject.publishedTasksCount !== publishedCount) {
        updateData.publishedTasksCount = publishedCount;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.project.update({
          where: { id: project.id },
          data: updateData,
        });
        reconciledProjectsCount++;
      }
    }

    console.log(`✅ Reconciled ${reconciledProjectsCount} projects`);

    // Update avg_rating and reviews_count for all profiles
    console.log('\n📊 Updating profile statistics...');

    // Update developer profiles
    for (const developer of developers) {
      const reviews = await prisma.review.findMany({
        where: { targetUserId: developer.user.id },
        select: { rating: true },
      });

      const avgRating =
        reviews.length > 0
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          : '0.0';

      await prisma.developerProfile.update({
        where: { userId: developer.user.id },
        data: {
          avgRating,
          reviewsCount: reviews.length,
        },
      });
    }

    // Update company profiles
    for (const company of companies) {
      const reviews = await prisma.review.findMany({
        where: { targetUserId: company.user.id },
        select: { rating: true },
      });

      const avgRating =
        reviews.length > 0
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          : '0.0';

      await prisma.companyProfile.update({
        where: { userId: company.user.id },
        data: {
          avgRating,
          reviewsCount: reviews.length,
        },
      });
    }

    console.log('✅ Updated profile statistics');

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
