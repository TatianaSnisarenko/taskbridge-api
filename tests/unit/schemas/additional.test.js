import { Buffer } from 'node:buffer';
import {
  createTaskInviteSchema,
  getTaskInvitesQuerySchema,
  inviteIdParamSchema,
} from '../../../src/schemas/invites.schemas.js';
import {
  getMyApplicationsQuerySchema,
  getMyInvitesQuerySchema,
  getMyTasksQuerySchema,
  getMyProjectsQuerySchema,
  getMyNotificationsQuerySchema,
  getMyThreadsQuerySchema,
  threadIdParamSchema,
  threadMessagesQuerySchema,
  createMessageBodySchema,
} from '../../../src/schemas/me.schemas.js';
import {
  createDeveloperProfileSchema,
  updateDeveloperProfileSchema,
  getDeveloperProfileParamsSchema,
  getCompanyProfileParamsSchema,
  createCompanyProfileSchema,
  updateCompanyProfileSchema,
  getUserReviewsSchema,
  uploadAvatarSchema,
} from '../../../src/schemas/profiles.schemas.js';
import {
  createProjectSchema,
  updateProjectSchema,
  updateProjectParamsSchema,
  deleteProjectParamsSchema,
  getProjectParamsSchema,
  getProjectQuerySchema,
  getProjectsQuerySchema,
  reportProjectParamsSchema,
  reportProjectSchema,
  getProjectReportsQuerySchema,
  resolveProjectReportParamsSchema,
  resolveProjectReportSchema,
} from '../../../src/schemas/projects.schemas.js';
import {
  createTaskDraftSchema,
  updateTaskDraftSchema,
  taskIdParamSchema,
  createTaskApplicationSchema,
  getTasksCatalogSchema,
  createReviewSchema,
  createTaskDisputeSchema,
  resolveTaskDisputeSchema,
  escalateTaskCompletionDisputeSchema,
  rejectTaskCompletionSchema,
  getTaskDisputesQuerySchema,
  reportTaskSchema,
  getTaskReportsQuerySchema,
  reportIdParamSchema,
  resolveTaskReportSchema,
  getProjectTasksQuerySchema,
  getRecommendedDevelopersQuerySchema,
  getTaskCandidatesQuerySchema,
} from '../../../src/schemas/tasks.schemas.js';
import {
  searchTechnologiesSchema,
  technologyIdsSchema,
} from '../../../src/schemas/technologies.schemas.js';

describe('additional Joi schemas', () => {
  test('invites schemas validate valid payloads', () => {
    expect(
      createTaskInviteSchema.validate({
        developer_id: '550e8400-e29b-41d4-a716-446655440000',
        message: 'Hello',
      }).error
    ).toBeUndefined();

    expect(
      getTaskInvitesQuerySchema.validate({ page: 1, size: 20, status: 'PENDING' }).error
    ).toBeUndefined();
    expect(
      inviteIdParamSchema.validate({ inviteId: '550e8400-e29b-41d4-a716-446655440000' }).error
    ).toBeUndefined();
  });

  test('me schemas validate and reject invalid values', () => {
    expect(getMyApplicationsQuerySchema.validate({}).error).toBeUndefined();
    expect(getMyInvitesQuerySchema.validate({ status: 'ACCEPTED' }).error).toBeUndefined();
    expect(getMyTasksQuerySchema.validate({ status: 'COMPLETED' }).error).toBeUndefined();
    expect(getMyProjectsQuerySchema.validate({ page: 2, size: 10 }).error).toBeUndefined();
    expect(getMyNotificationsQuerySchema.validate({ unread_only: true }).error).toBeUndefined();
    expect(getMyThreadsQuerySchema.validate({ search: 'abc' }).error).toBeUndefined();
    expect(
      threadIdParamSchema.validate({ threadId: '550e8400-e29b-41d4-a716-446655440000' }).error
    ).toBeUndefined();
    expect(threadMessagesQuerySchema.validate({ page: 1, size: 50 }).error).toBeUndefined();
    expect(createMessageBodySchema.validate({ text: 'hello' }).error).toBeUndefined();

    expect(getMyTasksQuerySchema.validate({ status: 'BAD' }).error).toBeDefined();
    expect(createMessageBodySchema.validate({ text: '' }).error).toBeDefined();
  });

  test('profiles schemas validate core payloads and constraints', () => {
    const developerPayload = {
      display_name: 'Dev Name',
      primary_role: 'Backend Engineer',
      bio: 'Experienced backend engineer in Node.js and PostgreSQL.',
      experience_level: 'MIDDLE',
      location: 'Kyiv',
      timezone: 'Europe/Kyiv',
      availability: 'PART_TIME',
      preferred_task_categories: ['BACKEND', 'DEVOPS'],
      portfolio_url: 'https://example.com/portfolio',
      linkedin_url: 'https://linkedin.com/in/example',
      technology_ids: ['550e8400-e29b-41d4-a716-446655440000'],
    };

    expect(createDeveloperProfileSchema.validate(developerPayload).error).toBeUndefined();
    expect(updateDeveloperProfileSchema.validate(developerPayload).error).toBeUndefined();
    expect(
      getDeveloperProfileParamsSchema.validate({ userId: '550e8400-e29b-41d4-a716-446655440000' })
        .error
    ).toBeUndefined();
    expect(
      getCompanyProfileParamsSchema.validate({ userId: '550e8400-e29b-41d4-a716-446655440000' })
        .error
    ).toBeUndefined();

    const companyPayload = {
      company_name: 'Acme',
      company_type: 'STARTUP',
      description: 'We build modern software products.',
      team_size: 10,
      country: 'UA',
      timezone: 'Europe/Kyiv',
      contact_email: 'contact@example.com',
      website_url: 'https://acme.dev',
      links: { github: 'https://github.com/acme' },
    };

    expect(createCompanyProfileSchema.validate(companyPayload).error).toBeUndefined();
    expect(updateCompanyProfileSchema.validate(companyPayload).error).toBeUndefined();
    expect(getUserReviewsSchema.validate({ page: 1, size: 20 }).error).toBeUndefined();

    const filePayload = {
      file: {
        fieldname: 'avatar',
        originalname: 'a.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 1000,
        buffer: Buffer.from('img'),
      },
    };
    expect(uploadAvatarSchema.validate(filePayload).error).toBeUndefined();
    expect(
      uploadAvatarSchema.validate({
        file: { ...filePayload.file, mimetype: 'image/gif' },
      }).error
    ).toBeDefined();
  });

  test('projects schemas validate main routes payloads', () => {
    const payload = {
      title: 'Project A',
      short_description: 'A short description for project',
      description: 'A long enough description for project details.',
      technology_ids: ['550e8400-e29b-41d4-a716-446655440000'],
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      max_talents: 3,
      deadline: '2026-09-01',
    };

    expect(createProjectSchema.validate(payload).error).toBeUndefined();
    expect(updateProjectSchema.validate(payload).error).toBeUndefined();
    expect(
      updateProjectParamsSchema.validate({ projectId: '550e8400-e29b-41d4-a716-446655440000' })
        .error
    ).toBeUndefined();
    expect(
      deleteProjectParamsSchema.validate({ projectId: '550e8400-e29b-41d4-a716-446655440000' })
        .error
    ).toBeUndefined();
    expect(
      getProjectParamsSchema.validate({ projectId: '550e8400-e29b-41d4-a716-446655440000' }).error
    ).toBeUndefined();
    expect(
      getProjectQuerySchema.validate({ include_deleted: false, preview_limit: 3 }).error
    ).toBeUndefined();
    expect(
      getProjectsQuerySchema.validate({
        page: 1,
        size: 20,
        search: 'abc',
        technology: ['node'],
        visibility: 'PUBLIC',
      }).error
    ).toBeUndefined();
    expect(
      reportProjectParamsSchema.validate({ projectId: '550e8400-e29b-41d4-a716-446655440000' })
        .error
    ).toBeUndefined();
    expect(reportProjectSchema.validate({ reason: 'SPAM', comment: 'bad' }).error).toBeUndefined();
    expect(reportProjectSchema.validate({ reason: 'BAD' }).error).toBeDefined();
    expect(
      getProjectReportsQuerySchema.validate({ status: 'OPEN', reason: 'SCAM' }).error
    ).toBeUndefined();
    expect(
      resolveProjectReportParamsSchema.validate({
        reportId: '550e8400-e29b-41d4-a716-446655440000',
      }).error
    ).toBeUndefined();
    expect(
      resolveProjectReportSchema.validate({ action: 'DELETE', note: 'Valid note' }).error
    ).toBeUndefined();
  });

  test('tasks schemas validate key query/body contracts', () => {
    const draftPayload = {
      project_id: null,
      title: 'Backend API task',
      description: 'Implement endpoints and tests for API.',
      category: 'BACKEND',
      type: 'EXPERIENCE',
      difficulty: 'JUNIOR',
      technology_ids: ['550e8400-e29b-41d4-a716-446655440000'],
      estimated_effort_hours: 10,
      expected_duration: 'DAYS_8_14',
      communication_language: 'English',
      timezone_preference: 'Europe/Kyiv',
      application_deadline: '2026-12-31T00:00:00.000Z',
      deadline: '2027-01-15',
      visibility: 'PUBLIC',
      deliverables: ['Code', 'Tests'],
      requirements: ['Node.js', 'PostgreSQL'],
      nice_to_have: ['Docker'],
    };

    expect(createTaskDraftSchema.validate(draftPayload).error).toBeUndefined();
    expect(updateTaskDraftSchema.validate(draftPayload).error).toBeUndefined();
    expect(
      taskIdParamSchema.validate({ taskId: '550e8400-e29b-41d4-a716-446655440000' }).error
    ).toBeUndefined();
    expect(
      createTaskApplicationSchema.validate({
        message: 'I can implement this quickly with tests.',
        proposed_plan: 'Phase 1, phase 2, phase 3 with milestones.',
        availability_note: 'Evenings',
      }).error
    ).toBeUndefined();

    expect(
      getTasksCatalogSchema.validate({
        page: 1,
        size: 20,
        category: 'BACKEND',
        difficulty: 'JUNIOR',
        type: 'EXPERIENCE',
        tech_match: 'ANY',
      }).error
    ).toBeUndefined();
    expect(createReviewSchema.validate({ rating: 5, text: 'Great work' }).error).toBeUndefined();
    expect(
      createTaskDisputeSchema.validate({ reason: 'Developer is inactive for several days' }).error
    ).toBeUndefined();
    expect(
      resolveTaskDisputeSchema.validate({
        action: 'MARK_FAILED',
        reason: 'Admin reviewed the dispute evidence and made a decision',
      }).error
    ).toBeUndefined();
    expect(
      escalateTaskCompletionDisputeSchema.validate({
        reason: 'Company did not respond before the completion confirmation deadline.',
      }).error
    ).toBeUndefined();
    expect(
      rejectTaskCompletionSchema.validate({ feedback: 'Needs more tests and docs' }).error
    ).toBeUndefined();
    expect(
      getTaskDisputesQuerySchema.validate({
        page: 1,
        size: 20,
        status: 'OPEN',
        reason_type: 'COMPLETION_NOT_CONFIRMED',
      }).error
    ).toBeUndefined();
    expect(
      reportTaskSchema.validate({ reason: 'SPAM', comment: 'bad content' }).error
    ).toBeUndefined();
    expect(
      getTaskReportsQuerySchema.validate({ status: 'RESOLVED', reason: 'MISLEADING' }).error
    ).toBeUndefined();
    expect(
      reportIdParamSchema.validate({ reportId: '550e8400-e29b-41d4-a716-446655440000' }).error
    ).toBeUndefined();
    expect(
      resolveTaskReportSchema.validate({ action: 'DISMISS', note: 'Not enough evidence' }).error
    ).toBeUndefined();
    expect(getProjectTasksQuerySchema.validate({ status: 'PUBLISHED' }).error).toBeUndefined();
    expect(getRecommendedDevelopersQuerySchema.validate({ limit: 3 }).error).toBeUndefined();
    expect(
      getTaskCandidatesQuerySchema.validate({
        page: 1,
        size: 20,
        availability: 'PART_TIME',
        experience_level: 'MIDDLE',
        min_rating: 4,
        exclude_invited: true,
        exclude_applied: false,
      }).error
    ).toBeUndefined();

    expect(createReviewSchema.validate({ rating: 10 }).error).toBeDefined();
  });

  test('technologies schemas validate search and ids', () => {
    expect(
      searchTechnologiesSchema.validate({ q: 'node', type: 'BACKEND', limit: 5, activeOnly: true })
        .error
    ).toBeUndefined();
    expect(
      technologyIdsSchema.validate([
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
      ]).error
    ).toBeUndefined();

    expect(searchTechnologiesSchema.validate({ type: 'BAD_TYPE' }).error).toBeDefined();
    expect(
      technologyIdsSchema.validate([
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440000',
      ]).error
    ).toBeDefined();
  });
});
