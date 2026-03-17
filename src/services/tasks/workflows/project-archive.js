import { createNotification } from '../../notifications/index.js';

export async function maybeArchiveProject(tx, projectId) {
  if (!projectId) return;

  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerUserId: true, title: true, maxTalents: true, status: true },
  });

  if (!project || project.status !== 'ACTIVE') return;

  const completedCount = await tx.task.count({
    where: {
      projectId,
      status: 'COMPLETED',
      deletedAt: null,
    },
  });

  const failedCount = await tx.task.count({
    where: {
      projectId,
      status: 'FAILED',
      deletedAt: null,
    },
  });

  if (completedCount + failedCount >= project.maxTalents) {
    await tx.project.update({
      where: { id: projectId },
      data: { status: 'ARCHIVED' },
    });

    await createNotification({
      client: tx,
      userId: project.ownerUserId,
      actorUserId: null,
      projectId: project.id,
      type: 'PROJECT_ARCHIVED_LIMIT_REACHED',
      payload: {
        project_id: project.id,
        project_title: project.title,
        max_talents: project.maxTalents,
        completed_count: completedCount,
        failed_count: failedCount,
      },
    });
  }
}
