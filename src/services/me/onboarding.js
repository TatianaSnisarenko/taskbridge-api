import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

const DEFAULT_ROLE_STATE = {
  status: 'not_started',
  version: 1,
  completed_at: null,
  skipped_at: null,
};

function mapRoleState(state) {
  if (!state) {
    return { ...DEFAULT_ROLE_STATE };
  }

  return {
    status: state.status,
    version: state.version,
    completed_at: state.completedAt ? state.completedAt.toISOString() : null,
    skipped_at: state.skippedAt ? state.skippedAt.toISOString() : null,
  };
}

async function ensureRoleProfileExists({ userId, role }) {
  if (role === 'developer') {
    const profile = await prisma.developerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist');
    }
    return;
  }

  const profile = await prisma.companyProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Company profile does not exist');
  }
}

export async function getMyOnboardingState({ userId }) {
  const states = await prisma.userOnboardingState.findMany({
    where: {
      userId,
      role: { in: ['developer', 'company'] },
    },
  });

  const byRole = states.reduce((acc, state) => {
    acc[state.role] = state;
    return acc;
  }, {});

  return {
    developer: mapRoleState(byRole.developer),
    company: mapRoleState(byRole.company),
  };
}

export async function updateMyOnboardingState({ userId, role, status, version }) {
  await ensureRoleProfileExists({ userId, role });

  const now = new Date();
  const state = await prisma.userOnboardingState.upsert({
    where: { userId_role: { userId, role } },
    create: {
      userId,
      role,
      status,
      version,
      completedAt: status === 'completed' ? now : null,
      skippedAt: status === 'skipped' ? now : null,
    },
    update: {
      status,
      version,
      completedAt: status === 'completed' ? now : null,
      skippedAt: status === 'skipped' ? now : null,
    },
  });

  return {
    role: state.role,
    status: state.status,
    version: state.version,
    completed_at: state.completedAt ? state.completedAt.toISOString() : null,
    skipped_at: state.skippedAt ? state.skippedAt.toISOString() : null,
    updated_at: state.updatedAt.toISOString(),
  };
}

export async function checkShouldShowOnboarding({ userId, role, version }) {
  await ensureRoleProfileExists({ userId, role });

  const all = await getMyOnboardingState({ userId });
  const roleState = all[role];

  const shouldShow = roleState.status === 'not_started' || version > roleState.version;

  return {
    should_show: shouldShow,
    current_status: roleState.status,
    current_version: roleState.version,
  };
}

export async function resetMyOnboardingState({ userId, role }) {
  await ensureRoleProfileExists({ userId, role });

  const state = await prisma.userOnboardingState.upsert({
    where: { userId_role: { userId, role } },
    create: {
      userId,
      role,
      status: 'not_started',
      version: 1,
      completedAt: null,
      skippedAt: null,
    },
    update: {
      status: 'not_started',
      completedAt: null,
      skippedAt: null,
    },
  });

  return {
    role: state.role,
    status: state.status,
    version: state.version,
    completed_at: null,
    skipped_at: null,
    updated_at: state.updatedAt.toISOString(),
  };
}
