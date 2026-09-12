-- Migration: add personal to-do list support (run once on existing databases):
--   wrangler d1 execute freebuff-tickets-db --file=./src/db/migrations/002_todos.sql
CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_done ON todos(is_done);
CREATE INDEX IF NOT EXISTS idx_todos_ticket ON todos(ticket_id);
