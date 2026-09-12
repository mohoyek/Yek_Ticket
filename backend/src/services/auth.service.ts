import type { Env, User } from '../env';
import { hashPassword, verifyPassword } from '../utils/password';
import { signJWT } from '../utils/jwt';
import { RoleService } from './role.service';

export class AuthService {
  constructor(private db: D1Database, private jwtSecret: string) {}

  async register(
    username: string,
    password: string,
    customerType: 'shop' | 'company',
    fullName?: string,
    companyName?: string
  ): Promise<{ token: string; user: Omit<User, 'password_hash'> & { role_label: string | null }; permissions: string[] }> {
    // Check if username exists
    const existing = await this.db
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first();
    if (existing) {
      throw new Error('USER_EXISTS');
    }

    const passwordHash = await hashPassword(password);
    const name = customerType === 'company' ? companyName : fullName;
    const result = await this.db
      .prepare(
        'INSERT INTO users (full_name, username, password_hash, role, customer_type, company_name) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(name, username, passwordHash, 'customer', customerType, customerType === 'company' ? companyName : null)
      .run();

    const userId = result.meta.last_row_id as number;
    const user = await this.db
      .prepare('SELECT id, full_name, username, role, customer_type, company_name, telegram_chat_id, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    const token = await signJWT(
      { sub: userId, username, role: 'customer' },
      this.jwtSecret
    );

    const roleService = new RoleService(this.db);
    const permissions = await roleService.getPermissions('customer');
    const roleLabel = await this.getRoleLabel('customer');

    return { token, user: { ...user!, role_label: roleLabel }, permissions };
  }

  async login(username: string, password: string): Promise<{ token: string; user: Omit<User, 'password_hash'> & { role_label: string | null }; permissions: string[] }> {
    const user = await this.db
      .prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first<User & { password_hash: string }>();

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const token = await signJWT(
      { sub: user.id, username: user.username, role: user.role },
      this.jwtSecret
    );

    const { password_hash: _, ...safeUser } = user;
    const roleService = new RoleService(this.db);
    const permissions = await roleService.getPermissions(user.role);
    const roleLabel = await this.getRoleLabel(user.role);
    return { token, user: { ...safeUser, role_label: roleLabel }, permissions };
  }

  private async getRoleLabel(role: string): Promise<string | null> {
    const row = await this.db
      .prepare('SELECT label FROM roles WHERE name = ?')
      .bind(role)
      .first<{ label: string }>();
    return row?.label || null;
  }

  async updateProfile(
    userId: number,
    data: { full_name?: string; current_password?: string; new_password?: string }
  ): Promise<Omit<User, 'password_hash'> & { role_label?: string | null }> {
    const user = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User & { password_hash: string }>();

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(data.full_name);
    }

    if (data.new_password !== undefined) {
      if (!data.current_password) {
        throw new Error('CURRENT_PASSWORD_REQUIRED');
      }
      const valid = await verifyPassword(data.current_password, user.password_hash);
      if (!valid) {
        throw new Error('WRONG_CURRENT_PASSWORD');
      }
      const hash = await hashPassword(data.new_password);
      updates.push('password_hash = ?');
      values.push(hash);
    }

    if (updates.length === 0) {
      throw new Error('NO_CHANGES');
    }

    values.push(userId);
    await this.db
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await this.db
      .prepare('SELECT id, full_name, username, role, telegram_chat_id, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    return updated!;
  }

  async createInternalUser(
    fullName: string,
    username: string,
    password: string,
    role: 'admin' | 'manager' | 'support',
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
      .prepare('SELECT id, full_name, username, role, telegram_chat_id, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    return user!;
  }
}
