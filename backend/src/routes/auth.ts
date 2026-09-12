import { Hono } from 'hono';
import type { Env, AppVariables } from '../env';
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';
import { authMiddleware } from '../middleware/auth';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas';
import { successResponse, errorResponse, createdResponse, MESSAGES } from '../utils/response';

const auth = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// POST /api/auth/register - ثبت‌نام مشتری (فروشگاهی / شرکتی)
auth.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const { full_name, company_name, username, password, customer_type } = parsed.data;
  const authService = new AuthService(c.env.DB, c.env.JWT_SECRET);

  try {
    const result = await authService.register(
      username,
      password,
      customer_type,
      full_name,
      company_name
    );
    return createdResponse(c, result);
  } catch (err) {
    if (err instanceof Error && err.message === 'USER_EXISTS') {
      return errorResponse(c, MESSAGES.USER_EXISTS, 409);
    }
    throw err;
  }
});

// POST /api/auth/login - ورود
auth.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const { username, password } = parsed.data;
  const authService = new AuthService(c.env.DB, c.env.JWT_SECRET);

  try {
    const result = await authService.login(username, password);
    return successResponse(c, result);
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      return errorResponse(c, MESSAGES.INVALID_CREDENTIALS, 401);
    }
    throw err;
  }
});

// PUT /api/auth/me - به‌روزرسانی پروفایل (نام و رمز عبور)
auth.put('/me', authMiddleware, async (c) => {
  const payload = c.get('user');
  const body = await c.req.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const authService = new AuthService(c.env.DB, c.env.JWT_SECRET);

  try {
    const user = await authService.updateProfile(payload.sub, parsed.data);
    const roleService = new RoleService(c.env.DB);
    const permissions = await roleService.getPermissions(payload.role);
    return successResponse(c, { user, permissions, message: MESSAGES.PROFILE_UPDATED });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'USER_NOT_FOUND') {
        return errorResponse(c, MESSAGES.USER_NOT_FOUND, 404);
      }
      if (err.message === 'WRONG_CURRENT_PASSWORD') {
        return errorResponse(c, MESSAGES.WRONG_CURRENT_PASSWORD, 400);
      }
      if (err.message === 'NO_CHANGES' || err.message === 'CURRENT_PASSWORD_REQUIRED') {
        return errorResponse(c, MESSAGES.NO_CHANGES, 400);
      }
    }
    throw err;
  }
});

// GET /api/auth/me - اطلاعات کاربر جاری
// PUT /api/auth/me - به‌روزرسانی پروفایل
auth.get('/me', authMiddleware, async (c) => {
  const payload = c.get('user');
  const user = await c.env.DB
    .prepare('SELECT id, full_name, username, role, customer_type, company_name, telegram_chat_id, created_at FROM users WHERE id = ?')
    .bind(payload.sub)
    .first();

  if (!user) {
    return errorResponse(c, MESSAGES.USER_NOT_FOUND, 404);
  }

  const roleLabel = await c.env.DB
    .prepare('SELECT label FROM roles WHERE name = ?')
    .bind(payload.role)
    .first<{ label: string }>();

  return successResponse(c, {
    user: { ...user, role_label: roleLabel?.label || null },
    permissions: c.get('permissions'),
  });
});

export default auth;
