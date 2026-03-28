import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  getCachedTechnologySearch,
  setCachedTechnologySearch,
  getCachedTechnologyById,
  setCachedTechnologyById,
  getCachedTechnologiesByIds,
  setCachedTechnologiesByIds,
} from '../../cache/technologies.js';

const TECHNOLOGY_TYPES = [
  'BACKEND',
  'FRONTEND',
  'DEVOPS',
  'QA',
  'DATA',
  'MOBILE',
  'OTHER',
  'FULLSTACK',
  'AI_ML',
  'UI_UX_DESIGN',
  'PRODUCT_MANAGEMENT',
  'BUSINESS_ANALYSIS',
  'CYBERSECURITY',
  'GAME_DEV',
  'EMBEDDED',
  'TECH_WRITING',
];

export function getTechnologyTypes() {
  return [...TECHNOLOGY_TYPES];
}

/**
 * Search technologies with autocomplete support
 * - Empty query or < 2 chars: return popular technologies
 * - Query >= 2 chars: search with prefix/contains ranking
 */
export async function searchTechnologies({ q, type, limit = 5, activeOnly = true }) {
  const normalizedLimit = Math.max(1, Math.min(20, limit || 5));
  const qTrim = q?.trim();

  const cached = await getCachedTechnologySearch({
    q: qTrim,
    type,
    limit: normalizedLimit,
    activeOnly,
  });
  if (cached) {
    return cached;
  }

  const where = {};

  // Filter by active status
  if (activeOnly) {
    where.isActive = true;
  }

  // Filter by type if provided
  if (type) {
    where.type = type;
  }

  // Mode selection: popular vs search
  if (!qTrim || qTrim.length < 2) {
    // POPULAR MODE: return top technologies by popularity score
    const technologies = await prisma.technology.findMany({
      where,
      orderBy: [{ popularityScore: 'desc' }, { name: 'asc' }],
      take: normalizedLimit,
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        popularityScore: true,
      },
    });

    const result = { items: technologies };
    await setCachedTechnologySearch(
      {
        q: qTrim,
        type,
        limit: normalizedLimit,
        activeOnly,
      },
      result
    );

    return result;
  }

  // SEARCH MODE: prefix matching with fallback to contains
  const lowerQuery = qTrim.toLowerCase();

  // Fetch candidates with OR search
  const candidates = await prisma.technology.findMany({
    where: {
      ...where,
      OR: [
        { name: { contains: qTrim, mode: 'insensitive' } },
        { slug: { contains: qTrim, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      popularityScore: true,
    },
  });

  // Rank results: prefix matches first, then contains, then by popularity
  const ranked = candidates
    .map((tech) => {
      const nameLower = tech.name.toLowerCase();
      const slugLower = tech.slug.toLowerCase();

      const isNamePrefix = nameLower.startsWith(lowerQuery);
      const isSlugPrefix = slugLower.startsWith(lowerQuery);
      const isPrefix = isNamePrefix || isSlugPrefix;

      return {
        ...tech,
        _rank: isPrefix ? 0 : 1, // 0 = prefix (higher priority), 1 = contains
      };
    })
    .sort((a, b) => {
      // First: prefix vs contains
      if (a._rank !== b._rank) return a._rank - b._rank;
      // Then: popularity score (descending)
      if (b.popularityScore !== a.popularityScore) {
        return b.popularityScore - a.popularityScore;
      }
      // Finally: alphabetical by name
      return a.name.localeCompare(b.name);
    })
    .slice(0, normalizedLimit)
    .map((tech) => ({
      id: tech.id,
      slug: tech.slug,
      name: tech.name,
      type: tech.type,
      popularityScore: tech.popularityScore,
    }));

  const result = { items: ranked };
  await setCachedTechnologySearch(
    {
      q: qTrim,
      type,
      limit: normalizedLimit,
      activeOnly,
    },
    result
  );

  return result;
}

/**
 * Get technology by ID
 */
export async function getTechnologyById(id) {
  const cached = await getCachedTechnologyById(id);
  if (cached) {
    return cached;
  }

  const technology = await prisma.technology.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      popularityScore: true,
      isActive: true,
    },
  });

  if (!technology) {
    throw new ApiError(404, 'NOT_FOUND', 'Technology not found');
  }

  await setCachedTechnologyById(id, technology);

  return technology;
}

/**
 * Get multiple technologies by IDs
 */
export async function getTechnologiesByIds(ids) {
  const uniqueIds = [...new Set(ids ?? [])];
  if (uniqueIds.length === 0) {
    return [];
  }

  const cached = await getCachedTechnologiesByIds(uniqueIds);
  if (cached) {
    return cached;
  }

  const technologies = await prisma.technology.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
    },
  });

  await setCachedTechnologiesByIds(uniqueIds, technologies);

  return technologies;
}

/**
 * Increment popularity score for technologies when they are used
 * Called when task/project is created or technology is added
 */
export async function incrementTechnologyPopularity(technologyIds) {
  if (!technologyIds || technologyIds.length === 0) return;

  // Deduplicate IDs
  const uniqueIds = [...new Set(technologyIds)];

  // Increment each technology's popularity score by 1
  await prisma.technology.updateMany({
    where: { id: { in: uniqueIds } },
    data: {
      popularityScore: { increment: 1 },
    },
  });
}

/**
 * Validate that all technology IDs exist and are active
 */
export async function validateTechnologyIds(technologyIds, requireActive = true) {
  if (!technologyIds || technologyIds.length === 0) return [];

  const uniqueIds = [...new Set(technologyIds)];

  const where = { id: { in: uniqueIds } };
  if (requireActive) {
    where.isActive = true;
  }

  const technologies = await prisma.technology.findMany({
    where,
    select: { id: true },
  });

  const foundIds = new Set(technologies.map((t) => t.id));
  const invalidIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (invalidIds.length > 0) {
    const message = requireActive
      ? 'Some technology IDs are invalid or inactive'
      : 'Some technology IDs are invalid';
    throw new ApiError(400, 'INVALID_TECHNOLOGY_IDS', message, { invalidIds });
  }

  return uniqueIds;
}
