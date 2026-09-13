import { Hono } from 'hono';
import { PushService } from '../services/push.service';
import type { Env, AppVariables } from '../env';
import { TicketService } from '../services/ticket.service';
import { UploadService } from '../services/upload.service';
import { NotificationService } from '../services/notification.service';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import {
  createTicketSchema,
  updateTicketSchema,
  createCommentSchema,
  assignTicketSchema,
  referTicketSchema,
} from '../schemas';
import { successResponse, errorResponse, createdResponse, MESSAGES } from '../utils/response';

const tickets = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// All ticket routes require auth
tickets.use('*', authMiddleware);

// Helper: check whether the current user may access the given ticket
export function canAccessTicket(
  user: { sub: number },
  permissions: string[],
  ticket: { created_by: number; assigned_to: number | null }
): boolean {
  if (permissions.includes('tickets.view_all')) return true;
  if (permissions.includes('tickets.view_unassigned')) {
    return (
      ticket.created_by === user.sub ||
      ticket.assigned_to === null ||
      ticket.assigned_to === user.sub
    );
  }
  // customer-like: own tickets only
  return ticket.created_by === user.sub;
}

// GET /api/tickets - لیست تیکت‌ها
tickets.get('/', async (c) => {
  const user = c.get('user');
  const permissions = c.get('permissions');
  const query = {
    status: c.req.query('status') || undefined,
    priority: c.req.query('priority') || undefined,
    category: c.req.query('category') ? parseInt(c.req.query('category')!) : undefined,
    assigned_to: c.req.query('assigned_to') ? parseInt(c.req.query('assigned_to')!) : undefined,
    search: c.req.query('search') || undefined,
    page: parseInt(c.req.query('page') || '1'),
    limit: parseInt(c.req.query('limit') || '20'),
  };

  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);
  const result = await ticketService.getAll(query, permissions, user.sub);

  return c.json({
    success: true,
    data: result.tickets,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    },
  });
});

// POST /api/tickets - ایجاد تیکت جدید
tickets.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createTicketSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const { title, description, category_id, priority, contact_phone, employee_name } = parsed.data;
  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);

  let ticket;
  try {
    ticket = await ticketService.create(
      title,
      description,
      category_id,
      priority,
      user.sub,
      contact_phone,
      employee_name
    );
  } catch (err) {
    if (err instanceof Error && err.message === 'EMPLOYEE_NAME_REQUIRED') {
      return errorResponse(c, 'برای تیکت شرکتی، نام کارمند الزامی است', 400);
    }
    throw err;
  }

  // Notify all internal staff about new ticket
  const staffResult = await c.env.DB
    .prepare("SELECT id FROM users WHERE role != 'customer'")
    .all<{ id: number }>();
  const staffIds = staffResult.results.map((s) => s.id).filter((id) => id !== user.sub);

  if (staffIds.length > 0) {
    const notificationService = new NotificationService(c.env.DB, c.env).withPush(
      new PushService(c.env.DB, c.env)
    );
    await notificationService.createBulk(
      staffIds,
      ticket.id,
      `تیکت جدید «${title}» ایجاد شد`
    );
  }

  return createdResponse(c, ticket);
});

// GET /api/tickets/stats - آمار تیکت‌ها بر اساس وضعیت و اولویت
tickets.get('/stats', async (c) => {
  const user = c.get('user');
  const permissions = c.get('permissions');
  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);
  const stats = await ticketService.getStats(permissions, user.sub);
  return successResponse(c, stats);
});

// GET /api/tickets/:id - جزئیات تیکت
tickets.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user');
  const permissions = c.get('permissions');

  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);
  const ticket = await ticketService.getById(id);

  if (!ticket) {
    return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
  }

  // Access check based on permissions
  if (!canAccessTicket(user, permissions, ticket)) {
    return errorResponse(c, MESSAGES.UNAUTHORIZED_TICKET, 403);
  }

  // Get comments and attachments
  const [comments, attachments] = await Promise.all([
    ticketService.getComments(id),
    ticketService.getAttachments(id),
  ]);

  return successResponse(c, { ...ticket, comments, attachments });
});

// PUT /api/tickets/:id - به‌روزرسانی تیکت
tickets.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user');
  const permissions = c.get('permissions');

  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const body = await c.req.json();
  const parsed = updateTicketSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);

  try {
    const ticket = await ticketService.update(id, parsed.data, user.sub, permissions);
    return successResponse(c, ticket);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'TICKET_NOT_FOUND') {
        return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
      }
      if (err.message === 'UNAUTHORIZED_TICKET') {
        return errorResponse(c, MESSAGES.UNAUTHORIZED_TICKET, 403);
      }
      if (err.message === 'FORBIDDEN') {
        return errorResponse(c, MESSAGES.FORBIDDEN, 403);
      }
    }
    throw err;
  }
});

// DELETE /api/tickets/:id - حذف تیکت (نیازمند دسترسی حذف)
tickets.delete('/:id', requirePermission('tickets.delete'), async (c) => {
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);

  try {
    await ticketService.delete(id);
    return successResponse(c, { message: MESSAGES.TICKET_DELETED });
  } catch (err) {
    if (err instanceof Error && err.message === 'TICKET_NOT_FOUND') {
      return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
    }
    throw err;
  }
});

// POST /api/tickets/:id/comments - افزودن کامنت
tickets.post('/:id/comments', async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user');
  const permissions = c.get('permissions');

  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const body = await c.req.json();
  const parsed = createCommentSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);

  // Check the user may comment on this ticket
  const ticket = await ticketService.getById(id);
  if (!ticket) {
    return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
  }
  if (!canAccessTicket(user, permissions, ticket)) {
    return errorResponse(c, MESSAGES.UNAUTHORIZED_TICKET, 403);
  }
  if (!permissions.includes('tickets.comment')) {
    return errorResponse(c, MESSAGES.FORBIDDEN, 403);
  }

  try {
    const comment = await ticketService.addComment(id, user.sub, parsed.data.body);
    return createdResponse(c, comment);
  } catch (err) {
    if (err instanceof Error && err.message === 'TICKET_NOT_FOUND') {
      return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
    }
    throw err;
  }
});

// GET /api/tickets/:id/comments - لیست کامنت‌ها
tickets.get('/:id/comments', async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user');
  const permissions = c.get('permissions');

  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);

  // Check the user may view this ticket's comments
  const ticket = await ticketService.getById(id);
  if (!ticket) {
    return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
  }
  if (!canAccessTicket(user, permissions, ticket)) {
    return errorResponse(c, MESSAGES.UNAUTHORIZED_TICKET, 403);
  }

  const comments = await ticketService.getComments(id);

  return successResponse(c, comments);
});

// POST /api/tickets/:id/attachments - آپلود فایل
tickets.post('/:id/attachments', async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user');
  const permissions = c.get('permissions');

  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const commentId = formData.get('comment_id') as string | null;

  if (!file) {
    return errorResponse(c, 'فایل ارسال نشده است', 400);
  }

  const uploadService = new UploadService(c.env.BUCKET);
  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);

  // Check the user may upload to this ticket
  const ticket = await ticketService.getById(id);
  if (!ticket) {
    return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
  }
  if (!canAccessTicket(user, permissions, ticket)) {
    return errorResponse(c, MESSAGES.UNAUTHORIZED_TICKET, 403);
  }
  if (!permissions.includes('tickets.upload')) {
    return errorResponse(c, MESSAGES.FORBIDDEN, 403);
  }

  // Enforce max attachments per ticket
  const MAX_ATTACHMENTS = 5;
  const attachmentCount = await c.env.DB
    .prepare('SELECT COUNT(*) as count FROM attachments WHERE ticket_id = ?')
    .bind(id)
    .first<{ count: number }>();
  if ((attachmentCount?.count || 0) >= MAX_ATTACHMENTS) {
    return errorResponse(c, `حداکثر ${MAX_ATTACHMENTS} فایل برای هر تیکت مجاز است`, 400);
  }

  try {
    const { fileName, fileUrl } = await uploadService.uploadFile(file, id, user.sub);
    const attachment = await ticketService.addAttachment(
      id,
      commentId ? parseInt(commentId) : null,
      fileName,
      fileUrl,
      user.sub
    );

    return createdResponse(c, attachment);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'FILE_TOO_LARGE') {
        return errorResponse(c, MESSAGES.FILE_TOO_LARGE, 400);
      }
      if (err.message === 'INVALID_FILE_TYPE') {
        return errorResponse(c, MESSAGES.INVALID_FILE_TYPE, 400);
      }
      if (err.message === 'STORAGE_UNAVAILABLE') {
        return errorResponse(c, MESSAGES.STORAGE_UNAVAILABLE, 503);
      }
    }
    throw err;
  }
});

// GET /api/tickets/:id/files/:attachmentId - دانلود پیوست تیکت
tickets.get('/:id/files/:attachmentId', async (c) => {
  const ticketId = parseInt(c.req.param('id'));
  const attachmentId = parseInt(c.req.param('attachmentId'));
  const user = c.get('user');
  const permissions = c.get('permissions');

  if (isNaN(ticketId) || isNaN(attachmentId)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);
  const ticket = await ticketService.getById(ticketId);
  if (!ticket) {
    return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
  }
  if (!canAccessTicket(user, permissions, ticket)) {
    return errorResponse(c, MESSAGES.UNAUTHORIZED_TICKET, 403);
  }

  const attachment = await ticketService.getAttachmentById(attachmentId, ticketId);
  if (!attachment) {
    return errorResponse(c, MESSAGES.ATTACHMENT_NOT_FOUND, 404);
  }

  const uploadService = new UploadService(c.env.BUCKET);
  const file = await uploadService.serveFile(attachment.file_url);
  if (!file) {
    return c.json({ error: 'فایل یافت نشد' }, 404);
  }

  const headers: Record<string, string> = {};
  if (file.httpMetadata?.contentType) {
    headers['Content-Type'] = file.httpMetadata.contentType;
  }
  const fileName = attachment.file_name.replace(/["\r\n]/g, '_');
  headers['Content-Disposition'] = `attachment; filename="${fileName}"`;
  headers['X-Content-Type-Options'] = 'nosniff';

  return new Response(file.body, { headers });
});

// PUT /api/tickets/:id/assign - انتساب تیکت
tickets.put('/:id/assign', requirePermission('tickets.assign'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user');

  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const body = await c.req.json();
  const parsed = assignTicketSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);

  try {
    await ticketService.assign(id, parsed.data.assigned_to, user.sub);
    return successResponse(c, { message: MESSAGES.TICKET_ASSIGNED });
  } catch (err) {
    if (err instanceof Error && err.message === 'TICKET_NOT_FOUND') {
      return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
    }
    throw err;
  }
});

// PUT /api/tickets/:id/refer - ارجاع تیکت به همکار (مدیر/پشتیبان)
tickets.put('/:id/refer', requirePermission('tickets.refer'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user');
  const permissions = c.get('permissions');

  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const body = await c.req.json();
  const parsed = referTicketSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const ticketService = new TicketService(c.env.DB, c.env, c.env.BUCKET);

  try {
    const result = await ticketService.refer(
      id,
      user.sub,
      parsed.data.to_user_id,
      parsed.data.note,
      parsed.data.create_todo,
      permissions
    );
    return successResponse(c, {
      message: MESSAGES.TICKET_REFERRED,
      ...result,
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'TICKET_NOT_FOUND') {
        return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
      }
      if (err.message === 'RECIPIENT_NOT_FOUND') {
        return errorResponse(c, 'همکار موردنظر یافت نشد یا مشتری است', 400);
      }
      if (err.message === 'CANNOT_REFER_TO_SELF') {
        return errorResponse(c, 'نمی‌توانید تیکت را به خودتان ارجاع دهید', 400);
      }
      if (err.message === 'UNAUTHORIZED_TICKET') {
        return errorResponse(c, MESSAGES.UNAUTHORIZED_TICKET, 403);
      }
    }
    throw err;
  }
});

export default tickets;