import { Hono } from 'hono';
import type { Env, AppVariables } from '../env';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/role';
import { TodoService } from '../services/todo.service';
import { UserService } from '../services/user.service';
import { NotificationService } from '../services/notification.service';
import { PushService } from '../services/push.service';
import { createTodoSchema, updateTodoSchema, assignTodoSchema } from '../schemas';
import { successResponse, errorResponse, createdResponse, MESSAGES } from '../utils/response';

// Personal to-do list — every user manages only their own items
const todos = new Hono<{ Bindings: Env; Variables: AppVariables }>();

todos.use('*', authMiddleware);
todos.use('*', requirePermission('todos.manage'));

// GET /api/todos - لیست کارهای کاربر جاری
todos.get('/', async (c) => {
  const userId = c.get('user').sub;
  const isDoneParam = c.req.query('is_done');

  const todoService = new TodoService(c.env.DB);
  const items = await todoService.getAllForUser(userId, {
    is_done: isDoneParam === undefined ? undefined : isDoneParam === '1' || isDoneParam === 'true',
  });
  const stats = await todoService.getStats(userId);

  return successResponse(c, { items, stats });
});

// GET /api/todos/assignable-users - کارکنان داخلی قابل واگذاری وظیفه (بدون خود کاربر)
todos.get('/assignable-users', requirePermission('todos.assign'), async (c) => {
  const userService = new UserService(c.env.DB);
  const staff = await userService.getInternalStaff();
  const currentUserId = c.get('user').sub;

  return successResponse(
    c,
    staff.filter((s) => s.id !== currentUserId)
  );
});

// POST /api/todos/assign - واگذاری وظیفه به لیست کارهای روزانه یک کارمند/پشتیبان
todos.post('/assign', requirePermission('todos.assign'), async (c) => {
  const actor = c.get('user');
  const body = await c.req.json();
  const parsed = assignTodoSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const { user_id, title, ticket_id, due_date } = parsed.data;

  const userService = new UserService(c.env.DB);
  const target = await userService.getById(user_id);
  if (!target || target.role === 'customer') {
    return errorResponse(c, 'کارمند موردنظر یافت نشد', 400);
  }
  if (target.id === actor.sub) {
    return errorResponse(c, 'برای وظایف خودتان از «افزودن» استفاده کنید', 400);
  }

  // If linked to a ticket, it must exist
  if (ticket_id) {
    const ticket = await c.env.DB
      .prepare('SELECT id FROM tickets WHERE id = ?')
      .bind(ticket_id)
      .first<{ id: number }>();
    if (!ticket) {
      return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
    }
  }

  const todoService = new TodoService(c.env.DB);
  const todo = await todoService.create(target.id, title, ticket_id, due_date);

  // Let the assignee know who gave them the task
  const actorRow = await userService.getById(actor.sub);
  const notificationService = new NotificationService(c.env.DB, c.env).withPush(
    new PushService(c.env.DB, c.env)
  );
  await notificationService.create(
    target.id,
    ticket_id || null,
    `«${actorRow?.full_name || actor.username}» وظیفه‌ای برای شما ثبت کرد: ${title}`
  );

  return createdResponse(c, todo);
});

// POST /api/todos - افزودن کار جدید
todos.post('/', async (c) => {
  const userId = c.get('user').sub;
  const body = await c.req.json();
  const parsed = createTodoSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const { title, ticket_id, due_date } = parsed.data;

  // If linked to a ticket, the user must be able to see that ticket
  if (ticket_id) {
    const ticket = await c.env.DB
      .prepare('SELECT id FROM tickets WHERE id = ?')
      .bind(ticket_id)
      .first<{ id: number }>();
    if (!ticket) {
      return errorResponse(c, MESSAGES.TICKET_NOT_FOUND, 404);
    }
  }

  const todoService = new TodoService(c.env.DB);
  const todo = await todoService.create(userId, title, ticket_id, due_date);
  return createdResponse(c, todo);
});

// PUT /api/todos/:id - به‌روزرسانی کار (عنوان/وضعیت/سررسید)
todos.put('/:id', async (c) => {
  const userId = c.get('user').sub;
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const body = await c.req.json();
  const parsed = updateTodoSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || MESSAGES.VALIDATION_ERROR, 400);
  }

  const todoService = new TodoService(c.env.DB);
  const todo = await todoService.update(id, userId, parsed.data);
  if (!todo) {
    return errorResponse(c, MESSAGES.TODO_NOT_FOUND, 404);
  }

  return successResponse(c, todo);
});

// DELETE /api/todos/:id - حذف کار
todos.delete('/:id', async (c) => {
  const userId = c.get('user').sub;
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const todoService = new TodoService(c.env.DB);
  const deleted = await todoService.delete(id, userId);
  if (!deleted) {
    return errorResponse(c, MESSAGES.TODO_NOT_FOUND, 404);
  }

  return successResponse(c, { message: MESSAGES.TODO_DELETED });
});

export default todos;
