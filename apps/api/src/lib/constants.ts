import type { ElysiaCookie } from 'elysia/cookies';

export const webUrl = process.env.WEB_URL || 'http://localhost:3600';
export const apiUrl = process.env.API_URL || 'http://localhost:3601';
export const adminUrl = process.env.ADMIN_URL || 'http://localhost:3620';

/**
 * Default cookie properties.
 */
export const cookieDefaults = {
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 15,
} as const satisfies ElysiaCookie;

export const ADMIN_ROLES: [
  'developer',
  'teacher',
  'homeroom_teacher',
] = ['developer', 'teacher', 'homeroom_teacher'];
export const DEV_ROLE = 'developer';

/**
 * Timezone offset (WIB, UTC+7) in minutes.
 */
export const TZ_OFFSET = 7 * 60;
