import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';

function getPersonaErrorMessage(persona) {
  return persona === 'company'
    ? 'Company profile does not exist'
    : 'Developer profile does not exist';
}

export function requirePersona(...requiredPersonas) {
  return async (req, res, next) => {
    const persona = req.headers['x-persona'];
    if (!persona)
      return next(new ApiError(400, 'PERSONA_REQUIRED', 'X-Persona header is required'));

    if (persona !== 'developer' && persona !== 'company') {
      return next(new ApiError(400, 'PERSONA_INVALID', 'X-Persona must be developer or company'));
    }

    if (requiredPersonas.length > 0 && !requiredPersonas.includes(persona)) {
      return next(
        new ApiError(403, 'PERSONA_NOT_AVAILABLE', getPersonaErrorMessage(requiredPersonas[0]))
      );
    }

    // Ensure profile exists for the persona
    const userId = req.user?.id;
    if (!userId) return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication required'));

    if (persona === 'developer') {
      const profile = await prisma.developerProfile.findUnique({ where: { userId } });
      if (!profile)
        return next(new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist'));
    }

    if (persona === 'company') {
      const profile = await prisma.companyProfile.findUnique({ where: { userId } });
      if (!profile)
        return next(new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Company profile does not exist'));
    }

    req.persona = persona;
    return next();
  };
}
