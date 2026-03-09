// Shared constants for validation schemas

export const emailRegexp = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
export const passRegexp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[ -~]{6,64}$/;

export const EXPERIENCE_LEVELS = ['STUDENT', 'JUNIOR', 'MIDDLE', 'SENIOR'];
export const AVAILABILITY_LEVELS = ['FEW_HOURS_WEEK', 'PART_TIME', 'FULL_TIME'];
export const TASK_CATEGORIES = [
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
export const COMPANY_TYPES = ['STARTUP', 'SMB', 'ENTERPRISE', 'INDIVIDUAL'];
