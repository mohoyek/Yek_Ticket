-- Migration: add the todos.assign permission (واگذاری وظیفه به کارکنان).
-- Run once on existing databases:
--   wrangler d1 execute freebuff-tickets-db --file=./src/db/migrations/005_todo_assign_permission.sql
-- Or apply every migration in order with: npm run db:migrate:local  (or db:migrate for remote)
-- Note: system roles (is_system = 1) are updated in place; if you already edited
-- these roles from the admin panel, re-check the permissions afterwards.

UPDATE roles SET permissions = '["tickets.view","tickets.view_all","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.change_priority","tickets.assign","tickets.refer","tickets.delete","todos.manage","todos.assign","kb.view","kb.manage","users.manage","categories.manage","roles.manage"]'
WHERE name = 'admin' AND is_system = 1;

UPDATE roles SET permissions = '["tickets.view","tickets.view_all","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.change_priority","tickets.assign","tickets.refer","todos.manage","todos.assign","kb.view","kb.manage"]'
WHERE name = 'manager' AND is_system = 1;

UPDATE roles SET permissions = '["tickets.view","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.refer","todos.manage","kb.view","kb.manage"]'
WHERE name = 'support' AND is_system = 1;

UPDATE roles SET permissions = '["tickets.view","tickets.create","tickets.comment","tickets.upload","kb.view"]'
WHERE name = 'customer' AND is_system = 1;
