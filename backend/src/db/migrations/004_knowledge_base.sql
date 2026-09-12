-- Migration: knowledge base (پایگاه دانش — مقالات راهنما)
-- Run once on existing databases:
--   wrangler d1 execute freebuff-tickets-db --file=./src/db/migrations/004_knowledge_base.sql
-- Note: system roles (is_system = 1) are updated in place; if you already edited
-- these roles from the admin panel, re-check the permissions afterwards.

CREATE TABLE IF NOT EXISTS kb_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    tags TEXT,
    is_published INTEGER NOT NULL DEFAULT 1,
    views INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_published ON kb_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_kb_category ON kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_created_by ON kb_articles(created_by);
CREATE INDEX IF NOT EXISTS idx_kb_updated_at ON kb_articles(updated_at);

CREATE TRIGGER IF NOT EXISTS update_kb_article_timestamp
    AFTER UPDATE ON kb_articles
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE kb_articles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- دسترسی‌های جدید (kb.view برای مشاهده، kb.manage برای مدیریت مقالات)
UPDATE roles SET permissions = '["tickets.view","tickets.view_all","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.change_priority","tickets.assign","tickets.refer","tickets.delete","todos.manage","kb.view","kb.manage","users.manage","categories.manage","roles.manage"]'
WHERE name = 'admin' AND is_system = 1;

UPDATE roles SET permissions = '["tickets.view","tickets.view_all","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.change_priority","tickets.assign","tickets.refer","todos.manage","kb.view","kb.manage"]'
WHERE name = 'manager' AND is_system = 1;

UPDATE roles SET permissions = '["tickets.view","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.refer","todos.manage","kb.view","kb.manage"]'
WHERE name = 'support' AND is_system = 1;

UPDATE roles SET permissions = '["tickets.view","tickets.create","tickets.comment","tickets.upload","kb.view"]'
WHERE name = 'customer' AND is_system = 1;
