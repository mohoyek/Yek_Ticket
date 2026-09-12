import { Hono } from 'hono';
import type { Env, JWTPayload } from '../env';
import { NotificationService } from '../services/notification.service';
import { authMiddleware } from '../middleware/auth';
import { successResponse, errorResponse, MESSAGES } from '../utils/response';

const notifications = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// All notification routes require auth
notifications.use('*', authMiddleware);

// GET /api/notifications - لیست اعلان‌های کاربر جاری
notifications.get('/', async (c) => {
  const user = c.get('user');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const notificationService = new NotificationService(c.env.DB);
  const result = await notificationService.getByUserId(user.sub, page, limit);

  // Set unread count in headers for easy access
  c.header('X-Unread-Count', String(result.unreadCount));

  return c.json({
    success: true,
    data: result.notifications,
    unreadCount: result.unreadCount,
    pagination: {
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

// GET /api/notifications/unread-count - تعداد اعلان‌های خوانده‌نشده
notifications.get('/unread-count', async (c) => {
  const user = c.get('user');
  const notificationService = new NotificationService(c.env.DB);
  const count = await notificationService.getUnreadCount(user.sub);

  return successResponse(c, { count });
});

// PUT /api/notifications/:id/read - علامت‌گذاری به‌عنوان خوانده‌شده
notifications.put('/:id/read', async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user');

  if (isNaN(id)) {
    return errorResponse(c, MESSAGES.VALIDATION_ERROR, 400);
  }

  const notificationService = new NotificationService(c.env.DB);

  try {
    await notificationService.markAsRead(id, user.sub);
    return successResponse(c, { message: MESSAGES.NOTIFICATION_READ });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOTIFICATION_NOT_FOUND') {
      return errorResponse(c, MESSAGES.NOTIFICATION_NOT_FOUND, 404);
    }
    throw err;
  }
});

// PUT /api/notifications/read-all - علامت‌گذاری همه به‌عنوان خوانده‌شده
notifications.put('/read-all', async (c) => {
  const user = c.get('user');
  const notificationService = new NotificationService(c.env.DB);
  await notificationService.markAllAsRead(user.sub);

  return successResponse(c, { message: 'همه اعلان‌ها به‌عنوان خوانده‌شده علامت‌گذاری شدند' });
});

export default notifications;
