import type { Env, Ticket, Comment, Attachment, User } from '../env';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';

export interface TicketWithDetails extends Ticket {
  category_name?: string;
  created_by_name?: string;
  assigned_to_name?: string;
  comment_count?: number;
  attachment_count?: number;
}

export class TicketService {
  private notifications: NotificationService;

  constructor(private db: D1Database, private env?: Env, private bucket?: R2Bucket) {
    this.notifications = new NotificationService(db, env);
    if (env) {
      this.notifications.withPush(new PushService(db, env));
    }
  }

  async getAll(
    filters: {
      status?: string;
      priority?: string;
      category?: number;
      assigned_to?: number;
      search?: string;
      page?: number;
      limit?: number;
    },
    permissions: string[],
    userId: number
  ): Promise<{ tickets: TicketWithDetails[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let params: unknown[] = [];

    // Visibility based on permissions
    if (!permissions.includes('tickets.view_all')) {
      if (permissions.includes('tickets.view_unassigned')) {
        whereConditions.push('(t.assigned_to = ? OR t.assigned_to IS NULL OR t.created_by = ?)');
        params.push(userId, userId);
      } else {
        whereConditions.push('t.created_by = ?');
        params.push(userId);
      }
    }
    // roles with tickets.view_all see everything

    if (filters.status) {
      whereConditions.push('t.status = ?');
      params.push(filters.status);
    }
    if (filters.priority) {
      whereConditions.push('t.priority = ?');
      params.push(filters.priority);
    }
    if (filters.category) {
      whereConditions.push('t.category_id = ?');
      params.push(filters.category);
    }
    if (filters.assigned_to) {
      whereConditions.push('t.assigned_to = ?');
      params.push(filters.assigned_to);
    }
    if (filters.search) {
      whereConditions.push('(t.title LIKE ? OR t.description LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM tickets t ${whereClause}`;
    const countResult = await this.db
      .prepare(countQuery)
      .bind(...params)
      .first<{ total: number }>();
    const total = countResult?.total || 0;

    // Get tickets with joins
    const dataQuery = `
      SELECT t.*,
        c.name as category_name,
        u1.full_name as created_by_name,
        u2.full_name as assigned_to_name,
        (SELECT COUNT(*) FROM comments WHERE ticket_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM attachments WHERE ticket_id = t.id) as attachment_count
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const result = await this.db
      .prepare(dataQuery)
      .bind(...params)
      .all<TicketWithDetails>();

    return {
      tickets: result.results,
      total,
      page,
      limit,
    };
  }

  async getStats(
    permissions: string[],
    userId: number
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byAssignee: { assigned_to: number | null; assigned_to_name: string | null; count: number }[];
  }> {
    const whereConditions: string[] = [];
    const params: unknown[] = [];

    // Visibility based on permissions (same rules as getAll)
    if (!permissions.includes('tickets.view_all')) {
      if (permissions.includes('tickets.view_unassigned')) {
        whereConditions.push('(t.assigned_to = ? OR t.assigned_to IS NULL OR t.created_by = ?)');
        params.push(userId, userId);
      } else {
        whereConditions.push('t.created_by = ?');
        params.push(userId);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [statusResult, priorityResult, totalResult, assigneeResult] = await Promise.all([
      this.db
        .prepare(`SELECT status, COUNT(*) as count FROM tickets t ${whereClause} GROUP BY status`)
        .bind(...params)
        .all<{ status: string; count: number }>(),
      this.db
        .prepare(`SELECT priority, COUNT(*) as count FROM tickets t ${whereClause} GROUP BY priority`)
        .bind(...params)
        .all<{ priority: string; count: number }>(),
      this.db
        .prepare(`SELECT COUNT(*) as total FROM tickets t ${whereClause}`)
        .bind(...params)
        .first<{ total: number }>(),
      this.db
        .prepare(
          `SELECT t.assigned_to, u.full_name as assigned_to_name, COUNT(*) as count
           FROM tickets t
           LEFT JOIN users u ON t.assigned_to = u.id
           ${whereClause}
           GROUP BY t.assigned_to, u.full_name
           ORDER BY count DESC`
        )
        .bind(...params)
        .all<{ assigned_to: number | null; assigned_to_name: string | null; count: number }>(),
    ]);

    const byStatus: Record<string, number> = {
      open: 0,
      in_progress: 0,
      closed: 0,
      waiting_customer: 0,
    };
    statusResult.results.forEach((r) => {
      byStatus[r.status] = r.count;
    });

    const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    priorityResult.results.forEach((r) => {
      byPriority[r.priority] = r.count;
    });

    return {
      total: totalResult?.total || 0,
      byStatus,
      byPriority,
      byAssignee: assigneeResult.results.map((r) => ({
        assigned_to: r.assigned_to,
        assigned_to_name: r.assigned_to_name,
        count: r.count,
      })),
    };
  }

  async getById(id: number): Promise<TicketWithDetails | null> {
    const ticket = await this.db
      .prepare(
        `SELECT t.*,
          c.name as category_name,
          u1.full_name as created_by_name,
          u2.full_name as assigned_to_name,
          (SELECT COUNT(*) FROM comments WHERE ticket_id = t.id) as comment_count,
          (SELECT COUNT(*) FROM attachments WHERE ticket_id = t.id) as attachment_count
        FROM tickets t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN users u1 ON t.created_by = u1.id
        LEFT JOIN users u2 ON t.assigned_to = u2.id
        WHERE t.id = ?`
      )
      .bind(id)
      .first<TicketWithDetails>();

    return ticket || null;
  }

  async create(
    title: string,
    description: string | undefined,
    categoryId: number | undefined,
    priority: string,
    createdBy: number,
    contactPhone?: string,
    employeeName?: string
  ): Promise<Ticket> {
    // Company customers must provide employee name
    if (employeeName !== undefined && employeeName.trim() === '') {
      employeeName = undefined;
    }
    if (contactPhone !== undefined && contactPhone.trim() === '') {
      contactPhone = undefined;
    }

    const creator = await this.db
      .prepare('SELECT customer_type FROM users WHERE id = ?')
      .bind(createdBy)
      .first<{ customer_type: 'shop' | 'company' | null }>();

    if (creator?.customer_type === 'company' && !employeeName) {
      throw new Error('EMPLOYEE_NAME_REQUIRED');
    }

    const result = await this.db
      .prepare(
        `INSERT INTO tickets (title, description, category_id, priority, created_by, contact_phone, employee_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(title, description || null, categoryId || null, priority, createdBy, contactPhone || null, employeeName || null)
      .run();

    const ticketId = result.meta.last_row_id as number;
    const ticket = await this.db
      .prepare('SELECT * FROM tickets WHERE id = ?')
      .bind(ticketId)
      .first<Ticket>();

    return ticket!;
  }

  async update(
    id: number,
    data: {
      title?: string;
      description?: string;
      category_id?: number | null;
      status?: string;
      priority?: string;
      assigned_to?: number | null;
      contact_phone?: string;
      employee_name?: string;
    },
    updatedBy: number,
    permissions: string[]
  ): Promise<Ticket> {
    const existing = await this.db
      .prepare('SELECT * FROM tickets WHERE id = ?')
      .bind(id)
      .first<Ticket>();
    if (!existing) {
      throw new Error('TICKET_NOT_FOUND');
    }

    // Ticket access check
    const hasViewAll = permissions.includes('tickets.view_all');
    const hasViewUnassigned = permissions.includes('tickets.view_unassigned');
    if (!hasViewAll) {
      const isAssigneeOrCreator =
        existing.created_by === updatedBy || existing.assigned_to === updatedBy;
      const canSeeUnassigned = hasViewUnassigned && existing.assigned_to === null;
      if (!isAssigneeOrCreator && !canSeeUnassigned) {
        throw new Error('UNAUTHORIZED_TICKET');
      }
    }

    // Field-level permission checks
    if (data.priority !== undefined && !permissions.includes('tickets.change_priority')) {
      throw new Error('FORBIDDEN');
    }
    if (data.assigned_to !== undefined && !permissions.includes('tickets.assign')) {
      throw new Error('FORBIDDEN');
    }
    if (data.status !== undefined && !permissions.includes('tickets.update_status')) {
      throw new Error('FORBIDDEN');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(data.category_id);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      values.push(data.priority);
    }
    if (data.assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(data.assigned_to);
    }
    if (data.contact_phone !== undefined) {
      updates.push('contact_phone = ?');
      values.push(data.contact_phone || null);
    }
    if (data.employee_name !== undefined) {
      updates.push('employee_name = ?');
      values.push(data.employee_name || null);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);
    await this.db
      .prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await this.db
      .prepare('SELECT * FROM tickets WHERE id = ?')
      .bind(id)
      .first<Ticket>();

    // Create notifications for relevant changes
    await this.notifyTicketUpdate(existing, updated!, updatedBy, data);

    return updated!;
  }

  private async notifyTicketUpdate(
    oldTicket: Ticket,
    newTicket: Ticket,
    updatedBy: number,
    data: { status?: string; priority?: string; assigned_to?: number | null }
  ): Promise<void> {
    const notifyUserIds: number[] = [];

    // Notify customer if their ticket is updated by staff
    if (oldTicket.created_by !== updatedBy) {
      notifyUserIds.push(oldTicket.created_by);
    }

    // Notify assigned staff if assigned to someone else
    if (data.assigned_to !== undefined && data.assigned_to !== null && data.assigned_to !== updatedBy) {
      notifyUserIds.push(data.assigned_to);
    } else if (oldTicket.assigned_to && oldTicket.assigned_to !== updatedBy) {
      notifyUserIds.push(oldTicket.assigned_to);
    }

    // Deduplicate
    const uniqueUserIds = [...new Set(notifyUserIds)].filter((id) => id !== updatedBy);

    if (uniqueUserIds.length === 0) return;

    const messages: string[] = [];
    if (data.status && data.status !== oldTicket.status) {
      const statusLabels: Record<string, string> = {
        open: 'باز',
        in_progress: 'در حال بررسی',
        closed: 'بسته‌شده',
        waiting_customer: 'در انتظار مشتری',
      };
      messages.push(`وضعیت تیکت «${newTicket.title}» به «${statusLabels[data.status]}» تغییر کرد`);
    }
    if (data.priority && data.priority !== oldTicket.priority) {
      const priorityLabels: Record<string, string> = {
        low: 'کم',
        medium: 'متوسط',
        high: 'زیاد',
        urgent: 'فوری',
      };
      messages.push(`اولویت تیکت «${newTicket.title}» به «${priorityLabels[data.priority]}» تغییر کرد`);
    }
    if (data.assigned_to !== undefined && data.assigned_to !== oldTicket.assigned_to) {
      if (data.assigned_to === null) {
        messages.push(`تیکت «${newTicket.title}» از انتساب خارج شد`);
      } else {
        messages.push(`تیکت «${newTicket.title}» به کاربر جدید منتسب شد`);
      }
    }

    if (messages.length === 0) {
      messages.push(`تیکت «${newTicket.title}» به‌روزرسانی شد`);
    }

    await this.notifications.createBulk(uniqueUserIds, newTicket.id, messages.join('\n'));
  }

  async delete(id: number): Promise<void> {
    const existing = await this.db
      .prepare('SELECT id FROM tickets WHERE id = ?')
      .bind(id)
      .first();
    if (!existing) {
      throw new Error('TICKET_NOT_FOUND');
    }

    // Collect attached files before the ticket is deleted (cascade removes DB rows)
    const attachments = await this.db
      .prepare('SELECT file_url FROM attachments WHERE ticket_id = ?')
      .bind(id)
      .all<{ file_url: string }>();

    await this.db
      .prepare('DELETE FROM tickets WHERE id = ?')
      .bind(id)
      .run();

    // Delete the actual files from R2 (best-effort so API still succeeds)
    if (this.bucket && attachments.results.length > 0) {
      try {
        await Promise.all(attachments.results.map((a) => this.bucket!.delete(a.file_url)));
      } catch (error) {
        console.error('Failed to delete R2 files for ticket', id, error);
      }
    }
  }

  // Comments
  async getComments(ticketId: number): Promise<(Comment & { user_name: string })[]> {
    const result = await this.db
      .prepare(
        `SELECT c.*, u.full_name as user_name
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.ticket_id = ?
         ORDER BY c.created_at ASC`
      )
      .bind(ticketId)
      .all<Comment & { user_name: string }>();
    return result.results;
  }

  async addComment(
    ticketId: number,
    userId: number,
    body: string
  ): Promise<Comment> {
    // Check ticket exists
    const ticket = await this.db
      .prepare('SELECT id, created_by, assigned_to, title FROM tickets WHERE id = ?')
      .bind(ticketId)
      .first<Ticket & { title: string }>();
    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND');
    }

    const result = await this.db
      .prepare('INSERT INTO comments (ticket_id, user_id, body) VALUES (?, ?, ?)')
      .bind(ticketId, userId, body)
      .run();

    const commentId = result.meta.last_row_id as number;
    const comment = await this.db
      .prepare('SELECT * FROM comments WHERE id = ?')
      .bind(commentId)
      .first<Comment>();

    // Notify relevant users
    const notifyUserIds: number[] = [];
    if (ticket.created_by !== userId) notifyUserIds.push(ticket.created_by);
    if (ticket.assigned_to && ticket.assigned_to !== userId) notifyUserIds.push(ticket.assigned_to);

    if (notifyUserIds.length > 0) {
      const user = await this.db
        .prepare('SELECT full_name FROM users WHERE id = ?')
        .bind(userId)
        .first<{ full_name: string }>();
      await this.notifications.createBulk(
        notifyUserIds,
        ticketId,
        `${user?.full_name || 'کاربر'} روی تیکت «${ticket.title}» کامنت گذاشت`
      );
    }

    return comment!;
  }

  // Attachments
  async addAttachment(
    ticketId: number,
    commentId: number | null,
    fileName: string,
    fileUrl: string,
    uploadedBy: number
  ): Promise<Attachment> {
    const result = await this.db
      .prepare(
        'INSERT INTO attachments (ticket_id, comment_id, file_name, file_url, uploaded_by) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(ticketId, commentId, fileName, fileUrl, uploadedBy)
      .run();

    const attachmentId = result.meta.last_row_id as number;
    const attachment = await this.db
      .prepare('SELECT * FROM attachments WHERE id = ?')
      .bind(attachmentId)
      .first<Attachment>();

    return attachment!;
  }

  async getAttachments(ticketId: number): Promise<(Attachment & { uploaded_by_name: string })[]> {
    const result = await this.db
      .prepare(
        `SELECT a.*, u.full_name as uploaded_by_name
         FROM attachments a
         LEFT JOIN users u ON a.uploaded_by = u.id
         WHERE a.ticket_id = ?
         ORDER BY a.created_at DESC`
      )
      .bind(ticketId)
      .all<Attachment & { uploaded_by_name: string }>();
    return result.results;
  }

  async getAttachmentById(
    attachmentId: number,
    ticketId: number
  ): Promise<(Attachment & { uploaded_by_name: string }) | null> {
    const result = await this.db
      .prepare(
        `SELECT a.*, u.full_name as uploaded_by_name
         FROM attachments a
         LEFT JOIN users u ON a.uploaded_by = u.id
         WHERE a.id = ? AND a.ticket_id = ?`
      )
      .bind(attachmentId, ticketId)
      .first<Attachment & { uploaded_by_name: string }>();
    return result || null;
  }

  // Assign
  async assign(ticketId: number, assignedTo: number | null, actorId: number): Promise<void> {
    const existing = await this.db
      .prepare('SELECT id, assigned_to, created_by, title FROM tickets WHERE id = ?')
      .bind(ticketId)
      .first<{ id: number; assigned_to: number | null; created_by: number; title: string }>();
    if (!existing) {
      throw new Error('TICKET_NOT_FOUND');
    }

    const oldAssignee = existing.assigned_to;
    await this.db
      .prepare('UPDATE tickets SET assigned_to = ? WHERE id = ?')
      .bind(assignedTo, ticketId)
      .run();

    // No change -> nothing to notify about
    if (oldAssignee === assignedTo) return;

    // Notify the affected users
    const notifyUserIds: number[] = [];
    if (assignedTo !== null && assignedTo !== actorId) {
      notifyUserIds.push(assignedTo);
    }
    if (oldAssignee !== null && oldAssignee !== actorId) {
      notifyUserIds.push(oldAssignee);
    }
    if (existing.created_by !== actorId) {
      notifyUserIds.push(existing.created_by);
    }

    const uniqueUserIds = [...new Set(notifyUserIds)];
    if (uniqueUserIds.length > 0) {
      const actor = await this.db
        .prepare('SELECT full_name FROM users WHERE id = ?')
        .bind(actorId)
        .first<{ full_name: string }>();
      const actorName = actor?.full_name || 'کاربر';
      const message =
        assignedTo === null
          ? `تیکت «${existing.title}» توسط ${actorName} از انتساب خارج شد`
          : `تیکت «${existing.title}» توسط ${actorName} منتسب شد`;
      await this.notifications.createBulk(uniqueUserIds, ticketId, message);
    }
  }

  /**
   * Refer a ticket to a colleague (manager / support): records a comment for
   * the audit trail, notifies the recipient and (optionally) adds a to-do
   * item to the recipient's personal to-do list.
   */
  async refer(
    ticketId: number,
    fromUserId: number,
    toUserId: number,
    note: string | undefined,
    createTodo: boolean,
    permissions: string[]
  ): Promise<{ referred_to_name: string; todo_created: boolean }> {
    const ticket = await this.db
      .prepare('SELECT id, title, created_by, assigned_to FROM tickets WHERE id = ?')
      .bind(ticketId)
      .first<{ id: number; title: string; created_by: number; assigned_to: number | null }>();
    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND');
    }

    const canSee =
      permissions.includes('tickets.view_all') ||
      (permissions.includes('tickets.view_unassigned') &&
        (ticket.created_by === fromUserId ||
          ticket.assigned_to === null ||
          ticket.assigned_to === fromUserId)) ||
      ticket.created_by === fromUserId;
    if (!canSee) {
      throw new Error('UNAUTHORIZED_TICKET');
    }

    const recipient = await this.db
      .prepare("SELECT id, full_name FROM users WHERE id = ? AND role != 'customer'")
      .bind(toUserId)
      .first<{ id: number; full_name: string }>();
    if (!recipient) {
      throw new Error('RECIPIENT_NOT_FOUND');
    }
    if (recipient.id === fromUserId) {
      throw new Error('CANNOT_REFER_TO_SELF');
    }

    const sender = await this.db
      .prepare('SELECT full_name FROM users WHERE id = ?')
      .bind(fromUserId)
      .first<{ full_name: string }>();
    const senderName = sender?.full_name || 'کاربر';

    // 1. Audit trail comment (only when there is a note or a fresh referral)
    if (note && note.trim()) {
      await this.db
        .prepare('INSERT INTO comments (ticket_id, user_id, body) VALUES (?, ?, ?)')
        .bind(ticketId, fromUserId, `ارجاع به ${recipient.full_name}: ${note.trim()}`)
        .run();
    }

    // 2. Notify the recipient (+ ticket creator if the actor is not the creator)
    const notifyUserIds = [recipient.id];
    if (ticket.created_by !== fromUserId && ticket.created_by !== recipient.id) {
      notifyUserIds.push(ticket.created_by);
    }
    await this.notifications.createBulk(
      notifyUserIds,
      ticketId,
      `تیکت «${ticket.title}» توسط ${senderName} به ${recipient.full_name} ارجاع شد`
    );

    // 3. Add a to-do item to the recipient's list
    let todoCreated = false;
    if (createTodo) {
      await this.db
        .prepare('INSERT INTO todos (user_id, title, ticket_id) VALUES (?, ?, ?)')
        .bind(
          recipient.id,
          `بررسی ارجاع تیکت #${ticketId} «${ticket.title}» از ${senderName}`,
          ticketId
        )
        .run();
      todoCreated = true;
    }

    return { referred_to_name: recipient.full_name, todo_created: todoCreated };
  }
}
