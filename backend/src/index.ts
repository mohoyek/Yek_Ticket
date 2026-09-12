import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppVariables, Env } from './env';
import { errorHandler } from './middleware/error-handler';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import { canAccessTicket, default as ticketRoutes } from './routes/tickets';
import notificationRoutes from './routes/notifications';
import roleRoutes from './routes/roles';
import telegramRoutes from './routes/telegram';
import todoRoutes from './routes/todos';
import knowledgeRoutes from './routes/knowledge';
import { pushRoutes } from './routes/push';
import { authMiddleware } from './middleware/auth';
import { UploadService } from './services/upload.service';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// CORS middleware
app.use(
  '*',
  cors({
    origin: (_origin, c) => c.env.CORS_ORIGIN || _origin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Unread-Count'],
    credentials: true,
  })
);

// Error handler
app.use('*', errorHandler);

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Freebuff Tickets API',
    version: '1.0.0',
    status: 'running',
  });
});

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/tickets', ticketRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/roles', roleRoutes);
app.route('/api/telegram', telegramRoutes);
app.route('/api/todos', todoRoutes);
app.route('/api/kb', knowledgeRoutes);
app.route('/api/push', pushRoutes);

// Serve uploaded files from R2
app.get('/api/files/*', authMiddleware, async (c) => {
  const filePath = decodeURIComponent(c.req.path.replace('/api/files/', ''));
  const attachment = await c.env.DB
    .prepare(
      `SELECT a.file_name, a.ticket_id, t.created_by, t.assigned_to
       FROM attachments a
       JOIN tickets t ON t.id = a.ticket_id
       WHERE a.file_url = ?`
    )
    .bind(filePath)
    .first<{ file_name: string; ticket_id: number; created_by: number; assigned_to: number | null }>();

  if (!attachment) {
    return c.json({ error: 'فایل یافت نشد' }, 404);
  }

  const user = c.get('user');
  const permissions = c.get('permissions');
  if (!canAccessTicket(user, permissions, attachment)) {
    return c.json({ error: 'شما اجازه دسترسی به این فایل را ندارید' }, 403);
  }

  const uploadService = new UploadService(c.env.BUCKET);
  const file = await uploadService.serveFile(filePath);
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

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'مسیر یافت نشد' }, 404);
});

export default app;
