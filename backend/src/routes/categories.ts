import { Hono } from 'hono';
import type { Env, AppVariables } from '../env';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { createCategorySchema, updateCategorySchema } from '../schemas';
import { successResponse, errorResponse, createdResponse, MESSAGES } from '../utils/response';

const categories = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/categories - لیست دسته‌بندی‌ها (نیاز به احراز هویت)
categories.get('/', authMiddleware, async (c) => {
  const result = await c.env.DB
    .prepare('SELECT * FROM categories ORDER BY name')
    .all();
  return successResponse(c, result.results);
});

// POST /api/categories - ایجاد دسته‌بندی (نیازمند دسترسی مدیریت دسته‌بندی‌ها)
categories.post('/', authMiddleware, requirePermission('categories.manage'), async (c) => {
  const body = await c.req.json();
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const { name, description } = parsed.data;
  const result = await c.env.DB
    .prepare('INSERT INTO categories (name, description) VALUES (?, ?)')
    .bind(name, description || null)
    .run();

  const id = result.meta.last_row_id as number;
  const category = await c.env.DB
    .prepare('SELECT * FROM categories WHERE id = ?')
    .bind(id)
    .first();

  return createdResponse(c, category);
});

// PUT /api/categories/:id - ویرایش دسته‌بندی (نیازمند دسترسی مدیریت دسته‌بندی‌ها)
categories.put('/:id', authMiddleware, requirePermission('categories.manage'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const body = await c.req.json();
  const parsed = updateCategorySchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const existing = await c.env.DB
    .prepare('SELECT id FROM categories WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) {
    return errorResponse(c, MESSAGES.CATEGORY_NOT_FOUND, 404);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.name !== undefined) {
    updates.push('name = ?');
    values.push(parsed.data.name);
  }
  if (parsed.data.description !== undefined) {
    updates.push('description = ?');
    values.push(parsed.data.description);
  }

  if (updates.length === 0) {
    const category = await c.env.DB
      .prepare('SELECT * FROM categories WHERE id = ?')
      .bind(id)
      .first();
    return successResponse(c, category);
  }

  values.push(id);
  await c.env.DB
    .prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const category = await c.env.DB
    .prepare('SELECT * FROM categories WHERE id = ?')
    .bind(id)
    .first();

  return successResponse(c, category);
});

// DELETE /api/categories/:id - حذف دسته‌بندی (نیازمند دسترسی مدیریت دسته‌بندی‌ها)
categories.delete('/:id', authMiddleware, requirePermission('categories.manage'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const existing = await c.env.DB
    .prepare('SELECT id FROM categories WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) {
    return errorResponse(c, MESSAGES.CATEGORY_NOT_FOUND, 404);
  }

  await c.env.DB
    .prepare('DELETE FROM categories WHERE id = ?')
    .bind(id)
    .run();

  return successResponse(c, { message: MESSAGES.CATEGORY_DELETED });
});

export default categories;
