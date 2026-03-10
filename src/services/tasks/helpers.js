/**
 * Pure helper functions for tasks domain
 * No side effects, no database queries, no external dependencies
 */

import { ApiError } from '../../utils/ApiError.js';
import { findTaskForCandidates } from '../../db/queries/tasks.queries.js';

/**
 * Map API input to Prisma schema format
 */
export function mapTaskInput(input) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    type: input.type,
    difficulty: input.difficulty,
    estimatedEffortHours: input.estimated_effort_hours,
    expectedDuration: input.expected_duration,
    communicationLanguage: input.communication_language,
    timezonePreference: input.timezone_preference,
    applicationDeadline: input.application_deadline,
    deadline: input.deadline,
    visibility: input.visibility,
    deliverables: input.deliverables,
    requirements: input.requirements,
    niceToHave: input.nice_to_have,
  };
}

/**
 * Map task database record to API output format
 */
export function mapTaskDetailsOutput(task, computed) {
  const companyProfile = task.owner.companyProfile;
  const avgRating = companyProfile?.avgRating;

  return {
    task_id: task.id,
    owner_user_id: task.ownerUserId,
    status: task.status,
    project: task.project ? { project_id: task.project.id, title: task.project.title } : null,
    title: task.title,
    description: task.description,
    category: task.category,
    type: task.type,
    difficulty: task.difficulty,
    technologies: task.technologies
      ? task.technologies.map((tt) => ({
          id: tt.technology.id,
          slug: tt.technology.slug,
          name: tt.technology.name,
          type: tt.technology.type,
          is_required: tt.isRequired,
        }))
      : undefined,
    estimated_effort_hours: task.estimatedEffortHours,
    expected_duration: task.expectedDuration,
    communication_language: task.communicationLanguage,
    timezone_preference: task.timezonePreference,
    application_deadline: task.applicationDeadline
      ? task.applicationDeadline.toISOString().slice(0, 10)
      : null,
    deadline: task.deadline ? task.deadline.toISOString().slice(0, 10) : null,
    visibility: task.visibility,
    deliverables: task.deliverables,
    requirements: task.requirements,
    nice_to_have: task.niceToHave,
    created_at: task.createdAt.toISOString(),
    published_at: task.publishedAt ? task.publishedAt.toISOString() : null,
    accepted_application_id: task.acceptedApplicationId,
    deleted_at: task.deletedAt ? task.deletedAt.toISOString() : null,
    applications_count: computed.applicationsCount,
    can_apply: computed.canApply,
    is_owner: computed.isOwner,
    is_accepted_developer: computed.isAcceptedDeveloper,
    company: {
      user_id: task.ownerUserId,
      company_name: companyProfile?.companyName,
      verified: companyProfile?.verified,
      avg_rating: avgRating === null || avgRating === undefined ? null : Number(avgRating),
      reviews_count: companyProfile?.reviewsCount,
    },
  };
}

/**
 * Convert Prisma Decimal or any value to number
 */
export function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value?.toNumber === 'function') return value.toNumber();
  return Number(value);
}

/**
 * Calculate candidate match score based on tech overlap and ratings
 */
export function calculateCandidateScore({ matchCount, avgRating, reviewsCount }) {
  return matchCount * 10 + (avgRating || 0) * 2 + Math.min(reviewsCount || 0, 20) * 0.2;
}

/**
 * Sort candidates by score, rating, reviews, and name
 */
export function sortCandidates(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if ((b.avg_rating || 0) !== (a.avg_rating || 0)) return (b.avg_rating || 0) - (a.avg_rating || 0);
  if ((b.reviews_count || 0) !== (a.reviews_count || 0)) {
    return (b.reviews_count || 0) - (a.reviews_count || 0);
  }
  return (a.display_name || '').localeCompare(b.display_name || '');
}

/**
 * Fetch task for candidate operations (helper, not exported from main service)
 */
export async function getTaskForCandidates({ userId, taskId }) {
  const task = await findTaskForCandidates(taskId, userId);

  if (task.status !== 'PUBLISHED') {
    throw new ApiError(409, 'INVALID_STATE', 'Task must be in PUBLISHED status');
  }

  return task;
}

/**
 * Build candidate output object with match scoring
 */
export function buildCandidateOutput({ profile, taskTechnologyIdSet, appliedSet, invitedSet }) {
  const profileTechnologies = profile.technologies.map((dt) => dt.technology);
  const matchedTechnologies = profileTechnologies.filter((tech) =>
    taskTechnologyIdSet.has(tech.id)
  );
  const matchCount = matchedTechnologies.length;

  const avgRating = toNumber(profile.avgRating) || 0;
  const reviewsCount = profile.reviewsCount || 0;
  const alreadyApplied = appliedSet.has(profile.userId);
  const alreadyInvited = invitedSet.has(profile.userId);

  return {
    user_id: profile.userId,
    display_name: profile.displayName,
    primary_role: profile.jobTitle,
    avatar_url: profile.avatarUrl,
    experience_level: profile.experienceLevel,
    availability: profile.availability,
    avg_rating: avgRating,
    reviews_count: reviewsCount,
    technologies: profileTechnologies.map((tech) => ({
      id: tech.id,
      slug: tech.slug,
      name: tech.name,
      type: tech.type,
    })),
    matched_technologies: matchedTechnologies.map((tech) => ({
      id: tech.id,
      slug: tech.slug,
      name: tech.name,
      type: tech.type,
    })),
    score: Number(calculateCandidateScore({ matchCount, avgRating, reviewsCount }).toFixed(2)),
    already_applied: alreadyApplied,
    already_invited: alreadyInvited,
    can_invite: !alreadyApplied && !alreadyInvited,
  };
}
