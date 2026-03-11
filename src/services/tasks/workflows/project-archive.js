export async function maybeArchiveProject(tx, projectId) {
  if (!projectId) return;

  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, maxTalents: true, status: true },
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
  }
}
