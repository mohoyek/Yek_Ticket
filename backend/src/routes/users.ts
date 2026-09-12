import { Hono } from 'hono';
import type { Env, AppVariables } from '../env';
import { UserService } from '../services/user.service';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { createUserSchema, updateUserSchema } from '../schemas';
import { successResponse, errorResponse, createdResponse, MESSAGES } from '../utils/response';

const users = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// All routes require auth (permission is enforced per-route)
users.use('*', authMiddleware);

// GET /api/users - لیست کاربران با جستجو و فیلتر نقش (نیازمند دسترسی مدیریت کاربران)
users.get('/', requirePermission('users.manage'), async (c) => {
  const search = c.req.query('search')?.trim() || undefined;
  const role = c.req.query('role')?.trim() || undefined;

  const userService = new UserService(c.env.DB);
  const allUsers = await userService.getAll({ search, role });
  return successResponse(c, allUsers);
});

// POST /api/users - ایجاد کاربر جدید (نیازمند دسترسی مدیریت کاربران)
users.post('/', requirePermission('users.manage'), async (c) => {
  const body = await c.req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const { full_name, username, password, role, telegram_chat_id } = parsed.data;
  const userService = new UserService(c.env.DB);

  try {
    const user = await userService.create(full_name, username, password, role, telegram_chat_id);
    return createdResponse(c, user);
  } catch (err) {
    if (err instanceof Error && err.message === 'USER_EXISTS') {
      return errorResponse(c, MESSAGES.USER_EXISTS, 409);
    }
    throw err;
  }
});

// PUT /api/users/:id - ویرایش کاربر (نیازمند دسترسی مدیریت کاربران)
users.put('/:id', requirePermission('users.manage'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const body = await c.req.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const userService = new UserService(c.env.DB);

  try {
    const user = await userService.update(id, parsed.data);
    return successResponse(c, user);
  } catch (err) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return errorResponse(c, MESSAGES.USER_NOT_FOUND, 404);
    }
    throw err;
  }
});

// DELETE /api/users/:id - حذف کاربر (نیازمند دسترسی مدیریت کاربران)
users.delete('/:id', requirePermission('users.manage'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const payload = c.get('user');
  const userService = new UserService(c.env.DB);

  try {
    await userService.delete(id, payload.sub);
    return successResponse(c, { message: MESSAGES.USER_DELETED });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'USER_NOT_FOUND') {
        return errorResponse(c, MESSAGES.USER_NOT_FOUND, 404);
      }
      if (err.message === 'CANNOT_DELETE_SELF') {
        return errorResponse(c, MESSAGES.CANNOT_DELETE_SELF, 400);
      }
      if (err.message === 'CANNOT_DELETE_ADMIN') {
        return errorResponse(c, MESSAGES.CANNOT_DELETE_ADMIN, 400);
      }
    }
    throw err;
  }
});

// GET /api/users/staff - لیست کارکنان داخلی (برای انتساب)
users.get('/staff', requirePermission('tickets.assign', 'tickets.view_all', 'tickets.view_unassigned'), async (c) => {
  const userService = new UserService(c.env.DB);
  const staff = await userService.getInternalStaff();
  return successResponse(c, staff);
});

export default users;
