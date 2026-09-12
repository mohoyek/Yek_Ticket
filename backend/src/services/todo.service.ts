import type { Todo } from '../env';

export interface TodoWithTicket extends Todo {
  ticket_title: string | null;
}

export class TodoService {
  constructor(private db: D1Database) {}

  async getAllForUser(
    userId: number,
    filter?: { is_done?: boolean }
  ): Promise<TodoWithTicket[]> {
    let where = 't.user_id = ?';
    const params: unknown[] = [userId];

    if (filter?.is_done !== undefined) {
      where += ' AND t.is_done = ?';
      params.push(filter.is_done ? 1 : 0);
    }

    const result = await this.db
      .prepare(
        `SELECT t.*, tk.title as ticket_title
         FROM todos t
         LEFT JOIN tickets tk ON t.ticket_id = tk.id
         WHERE ${where}
         ORDER BY t.is_done ASC, t.due_date IS NULL, t.due_date ASC, t.created_at DESC`
      )
      .bind(...params)
      .all<TodoWithTicket>();
    return result.results;
  }

  async create(
    userId: number,
    title: string,
    ticketId?: number | null,
    dueDate?: string | null
  ): Promise<TodoWithTicket> {
    const result = await this.db
      .prepare('INSERT INTO todos (user_id, title, ticket_id, due_date) VALUES (?, ?, ?, ?)')
      .bind(userId, title, ticketId || null, dueDate || null)
      .run();

    const id = result.meta.last_row_id as number;
    return (await this.getById(id, userId))!;
  }

  async getById(id: number, userId: number): Promise<TodoWithTicket | null> {
    return await this.db
      .prepare(
        `SELECT t.*, tk.title as ticket_title
         FROM todos t
         LEFT JOIN tickets tk ON t.ticket_id = tk.id
         WHERE t.id = ? AND t.user_id = ?`
      )
      .bind(id, userId)
      .first<TodoWithTicket>();
  }

  async update(
    id: number,
    userId: number,
    data: { title?: string; is_done?: boolean; due_date?: string | null }
  ): Promise<TodoWithTicket | null> {
    const existing = await this.getById(id, userId);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.is_done !== undefined) {
      updates.push('is_done = ?');
      values.push(data.is_done ? 1 : 0);
      updates.push('completed_at = ?');
      values.push(data.is_done ? new Date().toISOString() : null);
    }
    if (data.due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(data.due_date);
    }

    if (updates.length > 0) {
      values.push(id, userId);
      await this.db
        .prepare(`UPDATE todos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
        .bind(...values)
        .run();
    }

    return await this.getById(id, userId);
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();
    return (result.meta.changes || 0) > 0;
  }

  async getStats(userId: number): Promise<{ total: number; done: number; pending: number }> {
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
         FROM todos WHERE user_id = ?`
      )
      .bind(userId)
      .first<{ total: number; done: number }>();
    const total = result?.total || 0;
    const done = result?.done || 0;
    return { total, done, pending: total - done };
  }
}
