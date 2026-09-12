import { createMiddleware } from 'hono/factory';
import type { Env, AppVariables } from '../env';
import { errorResponse, MESSAGES } from '../utils/response';

type Role = 'admin' | 'manager' | 'support' | 'customer';

export function requireRole(...roles: Role[]) {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
    async (c, next) => {
      const user = c.get('user');
      if (!user) {
        return errorResponse(c, MESSAGES.UNAUTHORIZED, 401);
      }
      if (!roles.includes(user.role as Role)) {
        return errorResponse(c, MESSAGES.FORBIDDEN, 403);
      }
      await next();
    }
  );
}

// Permission-based guard (used with custom roles)
export function requirePermission(...permissions: string[]) {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
    async (c, next) => {
      const user = c.get('user');
      if (!user) {
        return errorResponse(c, MESSAGES.UNAUTHORIZED, 401);
      }
      const userPermissions = c.get('permissions') || [];
      if (!permissions.some((p) => userPermissions.includes(p))) {
        return errorResponse(c, MESSAGES.FORBIDDEN, 403);
      }
      await next();
    }
  );
}

// Role hierarchy helpers
export function isAdmin(role: string): boolean {
  return role === 'admin';
}

export function isManagerOrAbove(role: string): boolean {
  return role === 'admin' || role === 'manager';
}

export function isSupportOrAbove(role: string): boolean {
  return role === 'admin' || role === 'manager' || role === 'support';
}