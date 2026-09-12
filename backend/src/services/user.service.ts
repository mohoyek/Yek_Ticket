import type { Env, User } from '../env';
import { hashPassword } from '../utils/password';

export class UserService {
  constructor(private db: D1Database) {}

  async getAll(filter?: { search?: string; role?: string }): Promise<Omit<User, 'password_hash'>[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.role) {
      conditions.push('role = ?');
      params.push(filter.role);
    }
    if (filter?.search && filter.search.trim()) {
      // LIKE روی SQLite برای حروف لاتین حساس به بزرگی/کوچکی نیست
      const term = `%${filter.search.trim()}%`;
      conditions.push('(full_name LIKE ? OR username LIKE ?)');
      params.push(term, term);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db
      .prepare(
        `SELECT id, full_name, username, role, customer_type, company_name, telegram_chat_id, created_at FROM users${where} ORDER BY created_at DESC`
      )
      .bind(...params)
      .all();
    return result.results as Omit<User, 'password_hash'>[];
  }

  async getById(id: number): Promise<Omit<User, 'password_hash'> | null> {
    const user = await this.db
      .prepare('SELECT id, full_name, username, role, customer_type, company_name, telegram_chat_id, created_at FROM users WHERE id = ?')
      .bind(id)
      .first<User>();
    return user || null;
  }

  async create(
    fullName: string,
    username: string,
    password: string,
    role: string,
    telegramChatId?: string
  ): Promise<Omit<User, 'password_hash'>> {
    const existing = await this.db
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first();
    if (existing) {
      throw new Error('USER_EXISTS');
    }

    const passwordHash = await hashPassword(password);
    const result = await this.db
      .prepare(
        'INSERT INTO users (full_name, username, password_hash, role, telegram_chat_id) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(fullName, username, passwordHash, role, telegramChatId || null)
      .run();

    const userId = result.meta.last_row_id as number;
    const user = await this.db
      .prepare('SELECT id, full_name, username, role, customer_type, company_name, telegram_chat_id, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    return user!;
  }

  async update(
    id: number,
    data: { full_name?: string; password?: string; role?: string; telegram_chat_id?: string }
  ): Promise<Omit<User, 'password_hash'>> {
    const user = await this.db
      .prepare('SELECT id FROM users WHERE id = ?')
      .bind(id)
      .first();
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(data.full_name);
    }
    if (data.password !== undefined) {
      const hash = await hashPassword(data.password);
      updates.push('password_hash = ?');
      values.push(hash);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }
    if (data.telegram_chat_id !== undefined) {
      updates.push('telegram_chat_id = ?');
      values.push(data.telegram_chat_id);
    }

    if (updates.length === 0) {
      const updated = await this.db
        .prepare('SELECT id, full_name, username, role, customer_type, company_name, telegram_chat_id, created_at FROM users WHERE id = ?')
        .bind(id)
        .first<User>();
      return updated!;
    }

    values.push(id);
    await this.db
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await this.db
      .prepare('SELECT id, full_name, username, role, customer_type, company_name, telegram_chat_id, created_at FROM users WHERE id = ?')
      .bind(id)
      .first<User>();

    return updated!;
  }

  async delete(id: number, currentUserId: number): Promise<void> {
    const user = await this.db
      .prepare('SELECT id, role FROM users WHERE id = ?')
      .bind(id)
      .first<{ id: number; role: string }>();
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    if (user.id === currentUserId) {
      throw new Error('CANNOT_DELETE_SELF');
    }
    if (user.role === 'admin') {
      throw new Error('CANNOT_DELETE_ADMIN');
    }

    await this.db
      .prepare('DELETE FROM users WHERE id = ?')
      .bind(id)
      .run();
  }

  async getInternalStaff(): Promise<Omit<User, 'password_hash'>[]> {
    const result = await this.db
      .prepare(
        "SELECT id, full_name, username, role, customer_type, company_name, telegram_chat_id, created_at FROM users WHERE role != 'customer' ORDER BY full_name"
      )
      .all();
    return result.results as Omit<User, 'password_hash'>[];
  }

  async findByTelegramChatId(chatId: string): Promise<User | null> {
    const user = await this.db
      .prepare('SELECT * FROM users WHERE telegram_chat_id = ?')
      .bind(chatId)
      .first<User>();
    return user || null;
  }

  async createCustomer(fullName: string, username: string, passwordHash: string, telegramChatId?: string): Promise<User> {
    const result = await this.db
      .prepare(
        'INSERT INTO users (full_name, username, password_hash, role, telegram_chat_id) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(fullName, username, passwordHash, 'customer', telegramChatId || null)
      .run();

    const userId = result.meta.last_row_id as number;
    const user = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    return user!;
  }
}
