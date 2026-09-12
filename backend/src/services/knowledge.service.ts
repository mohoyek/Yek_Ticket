import type { KnowledgeArticle } from '../env';

export interface KnowledgeArticleWithMeta extends KnowledgeArticle {
  category_name: string | null;
  created_by_name: string | null;
}

export interface KbListFilter {
  search?: string;
  category?: number;
  tag?: string;
  publishedOnly: boolean;
}

export class KnowledgeService {
  constructor(private db: D1Database) {}

  async getAll(filter: KbListFilter): Promise<KnowledgeArticleWithMeta[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filter.publishedOnly) {
      where.push('a.is_published = 1');
    }
    if (filter.category) {
      where.push('a.category_id = ?');
      params.push(filter.category);
    }
    if (filter.tag) {
      // tags are stored as a comma-separated list
      where.push('(a.tags = ? OR a.tags LIKE ? OR a.tags LIKE ? OR a.tags LIKE ?)');
      params.push(filter.tag, `${filter.tag},%`, `%,${filter.tag}`, `%,${filter.tag},%`);
    }
    if (filter.search) {
      where.push('(a.title LIKE ? OR a.body LIKE ? OR a.tags LIKE ?)');
      const term = `%${filter.search}%`;
      params.push(term, term, term);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const result = await this.db
      .prepare(
        `SELECT a.*, c.name as category_name, u.full_name as created_by_name
         FROM kb_articles a
         LEFT JOIN categories c ON a.category_id = c.id
         LEFT JOIN users u ON a.created_by = u.id
         ${whereClause}
         ORDER BY a.is_published DESC, a.updated_at DESC, a.id DESC`
      )
      .bind(...params)
      .all<KnowledgeArticleWithMeta>();

    return result.results;
  }

  async getById(id: number): Promise<KnowledgeArticleWithMeta | null> {
    return await this.db
      .prepare(
        `SELECT a.*, c.name as category_name, u.full_name as created_by_name
         FROM kb_articles a
         LEFT JOIN categories c ON a.category_id = c.id
         LEFT JOIN users u ON a.created_by = u.id
         WHERE a.id = ?`
      )
      .bind(id)
      .first<KnowledgeArticleWithMeta>();
  }

  // شمارنده بازدید — فقط برای مقالات منتشرشده
  async incrementViews(id: number): Promise<void> {
    await this.db
      .prepare('UPDATE kb_articles SET views = views + 1 WHERE id = ? AND is_published = 1')
      .bind(id)
      .run();
  }

  async getStats(): Promise<{ total: number; published: number; drafts: number; views: number }> {
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published,
                COALESCE(SUM(views), 0) as views
         FROM kb_articles`
      )
      .first<{ total: number; published: number; views: number }>();

    const total = row?.total || 0;
    const published = row?.published || 0;

    return { total, published, drafts: total - published, views: row?.views || 0 };
  }

  async create(
    authorId: number,
    data: {
      title: string;
      body: string;
      category_id?: number | null;
      tags?: string | null;
      is_published?: boolean;
    }
  ): Promise<KnowledgeArticleWithMeta | null> {
    const result = await this.db
      .prepare(
        'INSERT INTO kb_articles (title, body, category_id, tags, is_published, created_by) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(
        data.title,
        data.body,
        data.category_id || null,
        data.tags || null,
        data.is_published === false ? 0 : 1,
        authorId
      )
      .run();

    const id = result.meta.last_row_id as number;
    return await this.getById(id);
  }

  async update(
    id: number,
    data: {
      title?: string;
      body?: string;
      category_id?: number | null;
      tags?: string | null;
      is_published?: boolean;
    }
  ): Promise<KnowledgeArticleWithMeta | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.body !== undefined) {
      updates.push('body = ?');
      values.push(data.body);
    }
    if (data.category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(data.category_id || null);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      values.push(data.tags || null);
    }
    if (data.is_published !== undefined) {
      updates.push('is_published = ?');
      values.push(data.is_published ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(id);
      await this.db
        .prepare(`UPDATE kb_articles SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    return await this.getById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM kb_articles WHERE id = ?').bind(id).run();
    return (result.meta.changes || 0) > 0;
  }
}
