import type { Notification } from '../env.node.js';
import type { PushService } from './push.service.node.js';

export class NotificationService {
  private push?: PushService;

  constructor(
    private db: any,
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
    const stmt = this.db.prepare(
      'INSERT INTO notifications (user_id, ticket_id, message) VALUES (?, ?, ?)'
    );
    const result = stmt.run(userId, ticketId, message);

    const id = result.lastInsertRowid as number;
    const selectStmt = this.db.prepare('SELECT * FROM notifications WHERE id = ?');
    const notification = selectStmt.get(id) as Notification | undefined;

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

    const transaction = this.db.transaction((users: number[]) => {
      for (const userId of users) {
        stmt.run(userId, ticketId, message);
      }
    });
    
    transaction(userIds);

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

    const notificationsStmt = this.db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    const countStmt = this.db.prepare('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?');
    const unreadStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    );

    const notificationsResult = notificationsStmt.all(userId, limit, offset) as Notification[];
    const countResult = countStmt.get(userId) as { total: number } | undefined;
    const unreadResult = unreadStmt.get(userId) as { count: number } | undefined;

    return {
      notifications: notificationsResult,
      unreadCount: unreadResult?.count || 0,
      total: countResult?.total || 0,
    };
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    const checkStmt = this.db.prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?');
    const notification = checkStmt.get(id, userId);
    if (!notification) {
      throw new Error('NOTIFICATION_NOT_FOUND');
    }

    const updateStmt = this.db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?');
    updateStmt.run(id);
  }

  async markAllAsRead(userId: number): Promise<void> {
    const stmt = this.db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0');
    stmt.run(userId);
  }

  async getUnreadCount(userId: number): Promise<number> {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    );
    const result = stmt.get(userId) as { count: number } | undefined;
    return result?.count || 0;
  }
}
