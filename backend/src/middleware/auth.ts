import { createMiddleware } from 'hono/factory';
import type { Env, JWTPayload, AppVariables } from '../env';
import { verifyJWT } from '../utils/jwt';
import { RoleService } from '../services/role.service';
import { errorResponse, MESSAGES } from '../utils/response';

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(c, MESSAGES.UNAUTHORIZED, 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(c, MESSAGES.UNAUTHORIZED, 401);
    }

    try {
      const payload = await verifyJWT(token, c.env.JWT_SECRET);
      c.set('user', payload);

      // Load role permissions from DB
      const roleService = new RoleService(c.env.DB);
      const permissions = await roleService.getPermissions(payload.role);
      c.set('permissions', permissions);

      await next();
    } catch {
      return errorResponse(c, MESSAGES.UNAUTHORIZED, 401);
    }
  }
);