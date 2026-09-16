import type { Role } from '../env.node.js';

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
  constructor(private db: any) {}

  async getPermissions(role: string): Promise<string[]> {
    const stmt = this.db.prepare('SELECT permissions FROM roles WHERE name = ?');
    const row = stmt.get(role) as { permissions: string } | undefined;

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
    const stmt = this.db.prepare('SELECT * FROM roles ORDER BY is_system DESC, id ASC');
    const results = stmt.all() as (Role & { permissions: string })[];

    return results.map((r) => ({
      ...r,
      permissions: this.parsePermissions(r.permissions),
    }));
  }

  async getByName(name: string): Promise<Role | null> {
    const stmt = this.db.prepare('SELECT * FROM roles WHERE name = ?');
    const row = stmt.get(name) as (Role & { permissions: string }) | undefined;

    if (!row) return null;
    return { ...row, permissions: this.parsePermissions(row.permissions) };
  }

  async create(name: string, label: string, permissions: string[]): Promise<Role> {
    const stmt = this.db.prepare('INSERT INTO roles (name, label, permissions) VALUES (?, ?, ?)');
    const result = stmt.run(name, label, JSON.stringify(permissions));

    const id = result.lastInsertRowid as number;
    return { id, name, label, permissions, is_system: 0, created_at: new Date().toISOString() };
  }

  async update(
    id: number,
    data: { name?: string; label?: string; permissions?: string[] }
  ): Promise<Role> {
    const stmt = this.db.prepare('SELECT * FROM roles WHERE id = ?');
    const existing = stmt.get(id) as (Role & { permissions: string }) | undefined;

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
      const updateStmt = this.db.prepare(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`);
      updateStmt.run(...values);
    }

    const updated = stmt.get(id) as (Role & { permissions: string }) | undefined;

    return { ...updated!, permissions: this.parsePermissions(updated!.permissions) };
  }

  async delete(id: number): Promise<void> {
    const stmt = this.db.prepare('SELECT id, name, is_system FROM roles WHERE id = ?');
    const existing = stmt.get(id) as { id: number; name: string; is_system: number } | undefined;

    if (!existing) {
      throw new Error('ROLE_NOT_FOUND');
    }
    if (existing.is_system === 1) {
      throw new Error('CANNOT_DELETE_SYSTEM_ROLE');
    }

    // Check no user is using this role
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?');
    const usersUsing = countStmt.get(existing.name) as { count: number } | undefined;

    if ((usersUsing?.count || 0) > 0) {
      throw new Error('ROLE_IN_USE');
    }

    const delStmt = this.db.prepare('DELETE FROM roles WHERE id = ?');
    delStmt.run(id);
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
