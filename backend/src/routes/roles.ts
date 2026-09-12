import { Hono } from 'hono';
import type { Env, AppVariables } from '../env';
import { RoleService, ALL_PERMISSIONS } from '../services/role.service';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { createRoleSchema, updateRoleSchema } from '../schemas';
import { successResponse, errorResponse, createdResponse, MESSAGES } from '../utils/response';

const roles = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// All role routes require auth + roles.manage permission
roles.use('*', authMiddleware, requirePermission('roles.manage'));

// GET /api/roles - لیست نقش‌ها
roles.get('/', async (c) => {
  const roleService = new RoleService(c.env.DB);
  const allRoles = await roleService.getAll();
  return successResponse(c, allRoles);
});

// GET /api/roles/permissions - لیست دسترسی‌های موجود
roles.get('/permissions', async (c) => {
  return successResponse(c, ALL_PERMISSIONS);
});

// POST /api/roles - ایجاد نقش جدید
roles.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createRoleSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const roleService = new RoleService(c.env.DB);

  // Check name uniqueness
  const existing = await roleService.getByName(parsed.data.name);
  if (existing) {
    return errorResponse(c, 'نقشی با این نام قبلاً وجود دارد', 409);
  }

  const role = await roleService.create(
    parsed.data.name,
    parsed.data.label,
    parsed.data.permissions
  );
  return createdResponse(c, role);
});

// PUT /api/roles/:id - ویرایش نقش
roles.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const body = await c.req.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const roleService = new RoleService(c.env.DB);

  // Check name uniqueness if renaming
  if (parsed.data.name) {
    const existing = await roleService.getByName(parsed.data.name);
    if (existing && existing.id !== id) {
      return errorResponse(c, 'نقشی با این نام قبلاً وجود دارد', 409);
    }
  }

  try {
    const role = await roleService.update(id, parsed.data);
    return successResponse(c, role);
  } catch (err) {
    if (err instanceof Error && err.message === 'ROLE_NOT_FOUND') {
      return errorResponse(c, 'نقش یافت نشد', 404);
    }
    throw err;
  }
});

// DELETE /api/roles/:id - حذف نقش (فقط نقش‌های سفارشی)
roles.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const roleService = new RoleService(c.env.DB);

  try {
    await roleService.delete(id);
    return successResponse(c, { message: 'نقش با موفقیت حذف شد' });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'ROLE_NOT_FOUND') {
        return errorResponse(c, 'نقش یافت نشد', 404);
      }
      if (err.message === 'CANNOT_DELETE_SYSTEM_ROLE') {
        return errorResponse(c, 'نقش‌های سیستمی قابل حذف نیستند', 400);
      }
      if (err.message === 'ROLE_IN_USE') {
        return errorResponse(c, 'این نقش به کاربرانی اختصاص داده شده و قابل حذف نیست', 400);
      }
    }
    throw err;
  }
});

export default roles;