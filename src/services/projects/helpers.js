function mapProjectInput(input) {
  return {
    title: input.title,
    shortDescription: input.short_description,
    description: input.description,
    visibility: input.visibility,
    status: input.status,
    maxTalents: input.max_talents,
  };
}

function mapProjectOutput(project) {
  return {
    project_id: project.id,
    title: project.title,
    short_description: project.shortDescription,
    technologies: project.technologies
      ? project.technologies.map((pt) => ({
          id: pt.technology.id,
          slug: pt.technology.slug,
          name: pt.technology.name,
          type: pt.technology.type,
          is_required: pt.isRequired,
        }))
      : undefined,
    visibility: project.visibility,
    status: project.status,
    max_talents: project.maxTalents,
    created_at: project.createdAt.toISOString(),
    company: {
      user_id: project.owner.id,
      company_name: project.owner.companyProfile.companyName,
      verified: project.owner.companyProfile.verified,
      avg_rating: Number(project.owner.companyProfile.avgRating),
      reviews_count: project.owner.companyProfile.reviewsCount,
    },
  };
}

function buildTaskSummary(groups) {
  const summary = {
    total: 0,
    draft: 0,
    published: 0,
    in_progress: 0,
    completed: 0,
    closed: 0,
  };

  for (const group of groups) {
    const count = group._count?._all ?? 0;
    summary.total += count;
    switch (group.status) {
      case 'DRAFT':
        summary.draft += count;
        break;
      case 'PUBLISHED':
        summary.published += count;
        break;
      case 'IN_PROGRESS':
      case 'DISPUTE':
      case 'COMPLETION_REQUESTED':
        summary.in_progress += count;
        break;
      case 'COMPLETED':
        summary.completed += count;
        break;
      case 'CLOSED':
        summary.closed += count;
        break;
      default:
        break;
    }
  }

  return summary;
}

function mapProjectDetailsOutput(project, taskSummary, tasksPreview) {
  return {
    project_id: project.id,
    owner_user_id: project.ownerUserId,
    title: project.title,
    short_description: project.shortDescription,
    description: project.description,
    technologies: project.technologies
      ? project.technologies.map((pt) => ({
          id: pt.technology.id,
          slug: pt.technology.slug,
          name: pt.technology.name,
          type: pt.technology.type,
          is_required: pt.isRequired,
        }))
      : undefined,
    visibility: project.visibility,
    status: project.status,
    max_talents: project.maxTalents,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
    deleted_at: project.deletedAt ? project.deletedAt.toISOString() : null,
    company: {
      user_id: project.owner.id,
      company_name: project.owner.companyProfile.companyName,
      verified: project.owner.companyProfile.verified,
      avg_rating: Number(project.owner.companyProfile.avgRating),
      reviews_count: project.owner.companyProfile.reviewsCount,
    },
    tasks_summary: taskSummary,
    tasks_preview: tasksPreview,
  };
}

export { mapProjectInput, mapProjectOutput, buildTaskSummary, mapProjectDetailsOutput };
