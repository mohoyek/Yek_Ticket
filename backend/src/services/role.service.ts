import type { Role } from '../env';

// Canonical list of permissions shown in the admin panel
export const ALL_PERMISSIONS = [
  { key: 'tickets.view', label: 'مشاهده تیکت‌ها' },
  { key: 'tickets.view_all', label: 'مشاهده همه تیکت‌ها' },
  { key: 'tickets.view_unassigned', label: 'مشاهده تیکت‌های بدون انتساب' },
  { key: 'tickets.create', label: 'ایجاد تیکت' },
  { key: 'tickets.comment', label: 'ارسال کامنت' },
  { key: 'tickets.upload', label: 'آپلود فایل' },
  { key: 'tickets.update_status', label: 'تغییر وضعیت تیکت' },
  { key: 'tickets.change_priority', label: 'تغییر اولویت تیکت' },
  { key: 'tickets.assign', label: 'انتساب تیکت' },
  { key: 'tickets.refer', label: 'ارجاع تیکت به همکار' },
  { key: 'tickets.delete', label: 'حذف تیکت' },
  { key: 'todos.manage', label: 'مدیریت کارهای روزانه (To-Do)' },
  { key: 'todos.assign', label: 'واگذاری وظیفه به کارکنان' },
  { key: 'kb.view', label: 'مشاهده پایگاه دانش' },
  { key: 'kb.manage', label: 'مدیریت پایگاه دانش (ایجاد/ویرایش/حذف مقالات)' },
  { key: 'users.manage', label: 'مدیریت کاربران' },
  { key: 'categories.manage', label: 'مدیریت دسته‌بندی‌ها' },
  { key: 'roles.manage', label: 'مدیریت نقش‌ها و دسترسی‌ها' },
] as const;

export class RoleService {
  constructor(private db: D1Database) {}

  async getPermissions(role: string): Promise<string[]> {
    const row = await this.db
      .prepare('SELECT permissions FROM roles WHERE name = ?')
      .bind(role)
      .first<{ permissions: string }>();

    if (!row) {
      return [];
    }

    try {
      const parsed = JSON.parse(row.permissions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async getAll(): Promise<Role[]> {
    const result = await this.db
      .prepare('SELECT * FROM roles ORDER BY is_system DESC, id ASC')
      .all<Role & { permissions: string }>();

    return result.results.map((r) => ({
      ...r,
      permissions: this.parsePermissions(r.permissions),
    }));
  }

  async getByName(name: string): Promise<Role | null> {
    const row = await this.db
      .prepare('SELECT * FROM roles WHERE name = ?')
      .bind(name)
      .first<Role & { permissions: string }>();

    if (!row) return null;
    return { ...row, permissions: this.parsePermissions(row.permissions) };
  }

  async create(name: string, label: string, permissions: string[]): Promise<Role> {
    const result = await this.db
      .prepare('INSERT INTO roles (name, label, permissions) VALUES (?, ?, ?)')
      .bind(name, label, JSON.stringify(permissions))
      .run();

    const id = result.meta.last_row_id as number;
    return { id, name, label, permissions, is_system: 0, created_at: new Date().toISOString() };
  }

  async update(
    id: number,
    data: { name?: string; label?: string; permissions?: string[] }
  ): Promise<Role> {
    const existing = await this.db
      .prepare('SELECT * FROM roles WHERE id = ?')
      .bind(id)
      .first<Role & { permissions: string }>();

    if (!existing) {
      throw new Error('ROLE_NOT_FOUND');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.label !== undefined) {
      updates.push('label = ?');
      values.push(data.label);
    }
    if (data.permissions !== undefined) {
      updates.push('permissions = ?');
      values.push(JSON.stringify(data.permissions));
    }

    if (updates.length > 0) {
      values.push(id);
      await this.db
        .prepare(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    const updated = await this.db
      .prepare('SELECT * FROM roles WHERE id = ?')
      .bind(id)
      .first<Role & { permissions: string }>();

    return { ...updated!, permissions: this.parsePermissions(updated!.permissions) };
  }

  async delete(id: number): Promise<void> {
    const existing = await this.db
      .prepare('SELECT id, name, is_system FROM roles WHERE id = ?')
      .bind(id)
      .first<{ id: number; name: string; is_system: number }>();

    if (!existing) {
      throw new Error('ROLE_NOT_FOUND');
    }
    if (existing.is_system === 1) {
      throw new Error('CANNOT_DELETE_SYSTEM_ROLE');
    }

    // Check no user is using this role
    const usersUsing = await this.db
      .prepare('SELECT COUNT(*) as count FROM users WHERE role = ?')
      .bind(existing.name)
      .first<{ count: number }>();

    if ((usersUsing?.count || 0) > 0) {
      throw new Error('ROLE_IN_USE');
    }

    await this.db.prepare('DELETE FROM roles WHERE id = ?').bind(id).run();
  }

  private parsePermissions(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}