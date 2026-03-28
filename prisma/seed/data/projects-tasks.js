export const TARGET_PROJECTS_PER_COMPANY = 3;
export const TARGET_TASKS_PER_PROJECT = 5;
export const MIN_PROJECT_MAX_TALENTS = 8;
export const DEMO_MAX_TALENTS_PROJECT_TITLE = 'Seed Demo: Archived by Max Talents';

export const projectData = [
  {
    title: 'E-Learning Platform Redesign',
    shortDescription: 'Modernized student and mentor journeys with measurable UX improvements.',
    description:
      'We are redesigning our learning platform to improve weekly retention and course completion. Scope includes a redesigned dashboard, adaptive lesson recommendations, and richer progress analytics. We need consistent UI patterns, better loading behavior on low-bandwidth networks, and clear accessibility support.',
  },
  {
    title: 'Mobile App MVP',
    shortDescription: 'Cross-platform collaboration app for distributed product teams.',
    description:
      'This MVP enables teams to manage tasks, async updates, and lightweight document sharing from mobile. Core requirements: smooth offline behavior, role-based permissions, push notifications, and clear event tracking for product analytics. We expect incremental delivery with demo-ready milestones every week.',
  },
  {
    title: 'Analytics Dashboard',
    shortDescription: 'Live KPI dashboard with product, revenue, and funnel insights.',
    description:
      'We are building an executive-facing analytics suite fed by event streams and transactional data. The dashboard must surface conversion drop-offs, cohort retention, and revenue trends with near real-time updates. Reliability and data consistency checks are mandatory before every release.',
  },
  {
    title: 'API Gateway Service',
    shortDescription: 'Unified authentication, routing, and traffic policy layer.',
    description:
      'Goal is to centralize API concerns across microservices: authentication, request validation, policy enforcement, and standardized error contracts. We also need metrics and traces to simplify operational debugging. Deliverables should include migration notes for existing services and rollout safety checks.',
  },
  {
    title: 'Customer Portal Enhancement',
    shortDescription: 'Self-service account workflows for billing and support.',
    description:
      'Enhancement work for an existing portal used by paid customers. Features include invoice downloads, subscription plan switching, support ticket linking, and identity verification flows. We need careful attention to edge cases, localization placeholders, and change logs for support teams.',
  },
  {
    title: 'Internal Admin Dashboard',
    shortDescription: 'Moderation and operations cockpit for platform administrators.',
    description:
      'Admin tool to manage users, project content, reports, and operational metrics. The dashboard should support bulk actions, strict auditability, and clear permissions boundaries between moderators and admins. Design and implementation should prioritize reliability over cosmetic complexity.',
  },
  {
    title: 'Hiring Pipeline Workspace',
    shortDescription: 'Internal tooling for screening, interviews, and hiring decisions.',
    description:
      'Building an internal workflow that unifies candidate profiles, interview feedback, and hiring decisions. Important constraints: privacy-aware access controls, consistent evaluation templates, and export-ready reports for leadership reviews.',
  },
  {
    title: 'Partner Integration Hub',
    shortDescription: 'Reusable connectors for CRM, billing, and analytics vendors.',
    description:
      'The hub standardizes outbound and inbound integrations with external services. It should include retries, idempotency keys, queue visibility, and failure notifications. We need predictable extension points for adding new connectors quickly.',
  },
  {
    title: 'Community Features Expansion',
    shortDescription: 'Forum and collaboration features for user engagement.',
    description:
      'Expanding community capabilities with threaded discussions, content moderation queues, and engagement notifications. We aim to increase active participation while keeping moderation costs manageable through better tooling and signal-based prioritization.',
  },
  {
    title: 'Compliance Readiness Toolkit',
    shortDescription: 'Security and audit controls for upcoming enterprise contracts.',
    description:
      'Project focused on audit trails, policy evidence collection, and baseline compliance workflows. Includes stronger access logging, policy review reminders, and dashboard visibility into unresolved risk items.',
  },
  {
    title: 'AI Content Assistant Pilot',
    shortDescription: 'Controlled assistant for drafting product help content.',
    description:
      'Pilot project for generating structured support content from existing documentation. Scope covers prompt management, approval workflow, and quality checks before publication. We need clear human-in-the-loop controls and defensible audit history for generated outputs.',
  },
  {
    title: 'Developer Onboarding Experience',
    shortDescription: 'Guided setup and learning paths for new contributors.',
    description:
      'This initiative shortens contributor onboarding time with interactive setup checklists, curated docs, and first-task recommendations. Success criteria include reduced first-PR time and higher completion of onboarding milestones.',
  },
  {
    title: 'Reliability Improvement Program',
    shortDescription: 'Stability and incident response improvements across services.',
    description:
      'Program-level effort to reduce incident frequency and improve recovery time. Includes SLO definition, alert quality improvements, and incident review automation. We need a practical mix of engineering, documentation, and runbook quality upgrades.',
  },
  {
    title: 'Content Moderation Revamp',
    shortDescription: 'Tooling and workflows for safer user-generated content.',
    description:
      'Revamping moderation tooling with triage queues, report prioritization, and reviewer collaboration notes. Features should improve response time and consistency while preserving clear reviewer accountability and escalation paths.',
  },
  {
    title: 'Billing Reconciliation Engine',
    shortDescription: 'Automated checks for invoice and payment consistency.',
    description:
      'Engine validates invoice totals, payment events, and subscription state transitions. We require transparent reconciliation reports, anomaly alerting, and secure access to financial audit records.',
  },
];

export const taskTemplates = [
  {
    title: 'Implement User Authentication Module',
    description:
      'Build secure authentication with JWT access tokens, refresh token rotation, password reset flow, and session revocation support. Include clear boundaries between auth service, persistence, and transport layers.',
    requirements: [
      'Cover registration, login, logout, password reset, and token refresh with robust validation and meaningful domain errors.',
      'Include rate limiting strategy, brute-force protection notes, and a migration-safe rollout plan.',
      'Provide unit tests for core flows and integration tests for HTTP endpoints.',
    ],
    deliverables: [
      'Production-ready auth service with test coverage and API documentation.',
      'Short operations guide for token invalidation and credential incident response.',
    ],
    category: 'BACKEND',
    type: 'PAID',
    difficulty: 'MIDDLE',
    estimatedEffortHours: 40,
    duration: 'DAYS_8_14',
  },
  {
    title: 'Create Dashboard Component Library',
    description:
      'Implement reusable React components (cards, tables, filters, alerts, dialogs) aligned with design tokens and accessibility standards. Components should be composable and simple to test.',
    requirements: [
      'WCAG 2.1 AA compliance for keyboard navigation and semantics.',
      'Storybook stories for primary states and edge cases.',
      'Document component APIs and upgrade notes for existing screens.',
    ],
    deliverables: ['Typed component package with usage examples and visual regression checklist.'],
    category: 'FRONTEND',
    type: 'PAID',
    difficulty: 'JUNIOR',
    estimatedEffortHours: 30,
    duration: 'DAYS_8_14',
  },
  {
    title: 'Fix Mobile Responsive Layout Issues',
    description:
      'Resolve layout breaks on tablet and mobile views with a focus on navigation, cards, and form controls. Keep desktop behavior stable and avoid layout shifts during load.',
    requirements: [
      'Validate on iOS Safari and modern Android Chrome.',
      'Document responsive breakpoints and before/after behavior for QA.',
    ],
    deliverables: ['Patch with cross-device verification notes and screenshot evidence.'],
    category: 'FRONTEND',
    type: 'PAID',
    difficulty: 'JUNIOR',
    estimatedEffortHours: 20,
    duration: 'DAYS_1_7',
  },
  {
    title: 'Database Query Optimization',
    description:
      'Profile and optimize slow queries causing API latency spikes. Add indexes where justified and verify improvements with realistic dataset snapshots.',
    requirements: [
      'Use EXPLAIN ANALYZE and capture baseline versus improved metrics.',
      'Provide rollback-friendly migration and production safety checks.',
    ],
    deliverables: ['Optimized query set, migration, and concise performance report.'],
    category: 'BACKEND',
    type: 'PAID',
    difficulty: 'MIDDLE',
    estimatedEffortHours: 35,
    duration: 'DAYS_8_14',
  },
  {
    title: 'Build Admin User Management Page',
    description:
      'Create a robust admin interface for account states, roles, moderation flags, and bulk actions. UX must prevent destructive mistakes through confirmations and contextual warnings.',
    requirements: [
      'Filtering, sorting, pagination, and keyboard-friendly interactions.',
      'Audit log entries for role changes and irreversible operations.',
      'Error handling for partial failures in bulk updates.',
    ],
    deliverables: ['Admin page + API endpoints + tests + operation notes for support team.'],
    category: 'FRONTEND',
    type: 'PAID',
    difficulty: 'MIDDLE',
    estimatedEffortHours: 45,
    duration: 'DAYS_15_30',
  },
  {
    title: 'Implement Email Notification System',
    description:
      'Build transactional email outbox with retry logic, template rendering, and safe failure handling. Solution should support local testing and production-grade observability.',
    requirements: [
      'Queue status lifecycle with retry backoff and expiration behavior.',
      'Template placeholders with validation and fallback content.',
      'No real-email side effects in tests.',
    ],
    deliverables: ['Outbox worker logic, templates, tests, and failure playbook.'],
    category: 'BACKEND',
    type: 'PAID',
    difficulty: 'MIDDLE',
    estimatedEffortHours: 38,
    duration: 'DAYS_8_14',
  },
  {
    title: 'Create Figma Design System',
    description:
      'Design and document a UI kit with typography, color tokens, spacing scales, and interaction states. Ensure handoff supports rapid implementation without guesswork.',
    requirements: [
      'Include component anatomy, usage constraints, and anti-pattern examples.',
      'Provide responsive variants and accessibility-focused color guidance.',
    ],
    deliverables: ['Figma library, token table, and implementation checklist for engineers.'],
    category: 'UI_UX_DESIGN',
    type: 'PAID',
    difficulty: 'MIDDLE',
    estimatedEffortHours: 50,
    duration: 'DAYS_15_30',
  },
  {
    title: 'Implement Search Functionality',
    description:
      'Add full-text search with filters, sorting, and pagination. Must support relevance tuning and analytics events for search quality monitoring.',
    requirements: [
      'Target p95 response under 200ms for common queries.',
      'Support typo tolerance and clear empty-state UX.',
      'Capture query-to-click metrics for ranking improvements.',
    ],
    deliverables: ['Search backend, UI integration, and diagnostics dashboard widgets.'],
    category: 'BACKEND',
    type: 'PAID',
    difficulty: 'SENIOR',
    estimatedEffortHours: 60,
    duration: 'DAYS_15_30',
  },
  {
    title: 'Add Dark Mode Support',
    description:
      'Introduce theme tokens and a stable dark mode implementation that respects user preference and system settings.',
    requirements: [
      'Persist preference and prevent flash-of-unstyled-theme during page load.',
      'Verify contrast accessibility in key screens and states.',
    ],
    deliverables: ['Dark theme token set, toggle controls, and regression test notes.'],
    category: 'FRONTEND',
    type: 'VOLUNTEER',
    difficulty: 'JUNIOR',
    estimatedEffortHours: 15,
    duration: 'DAYS_1_7',
  },
  {
    title: 'Create API Documentation',
    description:
      'Document REST API surface with OpenAPI, examples, and authentication notes that are accurate for frontend and QA usage.',
    requirements: [
      'Document request/response schemas and practical error examples.',
      'Include endpoint ownership and change management notes.',
    ],
    deliverables: ['OpenAPI spec, docs site integration, and maintenance checklist.'],
    category: 'TECH_WRITING',
    type: 'VOLUNTEER',
    difficulty: 'JUNIOR',
    estimatedEffortHours: 25,
    duration: 'DAYS_8_14',
  },
];
