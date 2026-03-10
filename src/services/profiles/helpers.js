function mapDeveloperProfileInput(input) {
  return {
    displayName: input.display_name,
    jobTitle: input.primary_role,
    bio: input.bio,
    experienceLevel: input.experience_level,
    location: input.location,
    timezone: input.timezone,
    availability: input.availability,
    preferredTaskCategories: input.preferred_task_categories,
    portfolioUrl: input.portfolio_url,
    linkedinUrl: input.linkedin_url,
  };
}

function mapCompanyProfileInput(input) {
  return {
    companyName: input.company_name,
    companyType: input.company_type,
    description: input.description,
    teamSize: input.team_size,
    country: input.country,
    timezone: input.timezone,
    contactEmail: input.contact_email,
    websiteUrl: input.website_url,
    links: input.links,
  };
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value?.toNumber === 'function') return value.toNumber();
  return Number(value);
}

function mapDeveloperProfileOutput(profile) {
  return {
    user_id: profile.userId,
    display_name: profile.displayName,
    primary_role: profile.jobTitle,
    bio: profile.bio,
    experience_level: profile.experienceLevel,
    location: profile.location,
    timezone: profile.timezone,
    technologies: profile.technologies
      ? profile.technologies.map((dt) => ({
          id: dt.technology.id,
          slug: dt.technology.slug,
          name: dt.technology.name,
          type: dt.technology.type,
          proficiency_years: dt.proficiencyYears,
        }))
      : undefined,
    portfolio_url: profile.portfolioUrl,
    linkedin_url: profile.linkedinUrl,
    avatar_url: profile.avatarUrl,
    avg_rating: toNumber(profile.avgRating),
    reviews_count: profile.reviewsCount,
  };
}

function mapCompanyProfileOutput(profile) {
  return {
    user_id: profile.userId,
    created_at: profile.createdAt,
    company_name: profile.companyName,
    company_type: profile.companyType,
    description: profile.description,
    team_size: profile.teamSize,
    country: profile.country,
    timezone: profile.timezone,
    logo_url: profile.logoUrl,
    website_url: profile.websiteUrl,
    links: profile.links,
    verified: profile.verified,
    avg_rating: toNumber(profile.avgRating),
    reviews_count: profile.reviewsCount,
  };
}

export {
  mapDeveloperProfileInput,
  mapCompanyProfileInput,
  toNumber,
  mapDeveloperProfileOutput,
  mapCompanyProfileOutput,
};
