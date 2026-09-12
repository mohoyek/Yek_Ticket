import type { Env, Notification } from '../env';
import type { PushService } from './push.service';

export class NotificationService {
  private push?: PushService;

  constructor(
    private db: D1Database,
    private env?: Env
  ) {}

  /** Attach a push service so new notifications also fire Web Push. */
  withPush(push: PushService): this {
    this.push = push;
    return this;
  }

  private firePush(
    userId: number,
    ticketId: number | null,
    message: string
  ): void {
    if (!this.push) return;
    // Fire-and-forget: never block or fail the main request on push errors
    this.push
      .sendToUser(userId, {
        title: 'فریباف — اعلان جدید',
        body: message,
        ticketId,
      })
      .catch((err) => console.error('Web Push failed:', err));
  }

  async create(
    userId: number,
    ticketId: number | null,
    message: string
  ): Promise<Notification> {
    const result = await this.db
      .prepare(
        'INSERT INTO notifications (user_id, ticket_id, message) VALUES (?, ?, ?)'
      )
      .bind(userId, ticketId, message)
      .run();

    const id = result.meta.last_row_id as number;
    const notification = await this.db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .bind(id)
      .first<Notification>();

    this.firePush(userId, ticketId, message);

    return notification!;
  }

  async createBulk(
    userIds: number[],
    ticketId: number | null,
    message: string
  ): Promise<void> {
    if (userIds.length === 0) return;

    const stmt = this.db.prepare(
      'INSERT INTO notifications (user_id, ticket_id, message) VALUES (?, ?, ?)'
    );

    const batch = userIds.map((userId) => stmt.bind(userId, ticketId, message));
    await this.db.batch(batch);

    for (const userId of userIds) {
      this.firePush(userId, ticketId, message);
    }
  }

  async getByUserId(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: Notification[]; unreadCount: number; total: number }> {
    const offset = (page - 1) * limit;

    const [notificationsResult, countResult, unreadResult] = await Promise.all([
      this.db
        .prepare(
          'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
        )
        .bind(userId, limit, offset)
        .all<Notification>(),
      this.db
        .prepare('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?')
        .bind(userId)
        .first<{ total: number }>(),
      this.db
        .prepare(
          'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
        )
        .bind(userId)
        .first<{ count: number }>(),
    ]);

    return {
      notifications: notificationsResult.results,
      unreadCount: unreadResult?.count || 0,
      total: countResult?.total || 0,
    };
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    const notification = await this.db
      .prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();
    if (!notification) {
      throw new Error('NOTIFICATION_NOT_FOUND');
    }

    await this.db
      .prepare('UPDATE notifications SET is_read = 1 WHERE id = ?')
      .bind(id)
      .run();
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.db
      .prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
      .bind(userId)
      .run();
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = await this.db
      .prepare(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
      )
      .bind(userId)
      .first<{ count: number }>();
    return result?.count || 0;
  }
}
