import { Hono } from 'hono';
import type { Env, AppVariables } from '../env';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { KnowledgeService } from '../services/knowledge.service';
import { createKbArticleSchema, updateKbArticleSchema } from '../schemas';
import { successResponse, errorResponse, createdResponse, MESSAGES } from '../utils/response';

// پایگاه دانش — مقالات راهنما
const knowledge = new Hono<{ Bindings: Env; Variables: AppVariables }>();

knowledge.use('*', authMiddleware);

const canView = requirePermission('kb.view', 'kb.manage');
const canManage = requirePermission('kb.manage');

function hasManagePermission(permissions: string[] | undefined): boolean {
  return (permissions || []).includes('kb.manage');
}

// GET /api/kb - لیست مقالات (جستجو، فیلتر دسته‌بندی و برچسب)
knowledge.get('/', canView, async (c) => {
  const search = c.req.query('search')?.trim();
  const tag = c.req.query('tag')?.trim();
  const categoryParam = c.req.query('category');
  const category = categoryParam ? parseInt(categoryParam) : undefined;

  if (categoryParam && (isNaN(category as number) || (category as number) <= 0)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  // فقط دارندگان kb.manage می‌توانند پیش‌نویس‌ها را ببینند
  const includeUnpublished =
    c.req.query('include_unpublished') === '1' && hasManagePermission(c.get('permissions'));

  const service = new KnowledgeService(c.env.DB);
  const items = await service.getAll({
    search: search || undefined,
    tag: tag || undefined,
    category,
    publishedOnly: !includeUnpublished,
  });
  const stats = await service.getStats();

  return successResponse(c, { items, stats });
});

// GET /api/kb/stats - آمار پایگاه دانش
knowledge.get('/stats', canView, async (c) => {
  const service = new KnowledgeService(c.env.DB);
  const stats = await service.getStats();
  return successResponse(c, stats);
});

// GET /api/kb/:id - جزئیات مقاله (بازدید ثبت می‌شود)
knowledge.get('/:id', canView, async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const service = new KnowledgeService(c.env.DB);
  const article = await service.getById(id);

  if (!article) {
    return errorResponse(c, MESSAGES.KB_ARTICLE_NOT_FOUND, 404);
  }
  if (!article.is_published && !hasManagePermission(c.get('permissions'))) {
    return errorResponse(c, MESSAGES.KB_ARTICLE_NOT_FOUND, 404);
  }

  await service.incrementViews(id);

  return successResponse(c, { ...article, views: article.views + (article.is_published ? 1 : 0) });
});

// POST /api/kb - ایجاد مقاله (نیازمند دسترسی مدیریت پایگاه دانش)
knowledge.post('/', canManage, async (c) => {
  const body = await c.req.json();
  const parsed = createKbArticleSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const service = new KnowledgeService(c.env.DB);
  const article = await service.create(c.get('user').sub, parsed.data);

  return createdResponse(c, article);
});

// PUT /api/kb/:id - ویرایش مقاله (نیازمند دسترسی مدیریت پایگاه دانش)
knowledge.put('/:id', canManage, async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const body = await c.req.json();
  const parsed = updateKbArticleSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const service = new KnowledgeService(c.env.DB);
  const article = await service.update(id, parsed.data);

  if (!article) {
    return errorResponse(c, MESSAGES.KB_ARTICLE_NOT_FOUND, 404);
  }

  return successResponse(c, article);
});

// DELETE /api/kb/:id - حذف مقاله (نیازمند دسترسی مدیریت پایگاه دانش)
knowledge.delete('/:id', canManage, async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const service = new KnowledgeService(c.env.DB);
  const deleted = await service.delete(id);

  if (!deleted) {
    return errorResponse(c, MESSAGES.KB_ARTICLE_NOT_FOUND, 404);
  }

  return successResponse(c, { message: MESSAGES.KB_ARTICLE_DELETED });
});

export default knowledge;
