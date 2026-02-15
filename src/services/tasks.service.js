import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';

function mapTaskInput(input) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    type: input.type,
    difficulty: input.difficulty,
    requiredSkills: input.required_skills,
    estimatedEffortHours: input.estimated_effort_hours,
    expectedDuration: input.expected_duration,
    communicationLanguage: input.communication_language,
    timezonePreference: input.timezone_preference,
    applicationDeadline: input.application_deadline,
    visibility: input.visibility,
    deliverables: input.deliverables,
    requirements: input.requirements,
    niceToHave: input.nice_to_have,
  };
}

export async function createTaskDraft({ userId, task }) {
  const projectId = task.project_id ?? null;

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerUserId: true, deletedAt: true },
    });

    if (!project || project.deletedAt) {
      throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
    }

    if (project.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'Project does not belong to user');
    }
  }

  const created = await prisma.task.create({
    data: {
      ownerUserId: userId,
      projectId,
      status: 'DRAFT',
      ...mapTaskInput(task),
    },
    select: { id: true, status: true, createdAt: true },
  });

  return { taskId: created.id, status: created.status, createdAt: created.createdAt };
}
