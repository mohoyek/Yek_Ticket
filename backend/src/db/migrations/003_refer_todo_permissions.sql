-- Migration: add the new permissions (refer + todos) to existing system roles.
-- Run once on existing databases:
--   wrangler d1 execute freebuff-tickets-db --file=./src/db/migrations/003_refer_todo_permissions.sql
-- Note: system roles (is_system = 1) are updated in place; if you already edited
-- these roles from the admin panel, re-check the permissions afterwards.

UPDATE roles SET permissions = '["tickets.view","tickets.view_all","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.change_priority","tickets.assign","tickets.refer","tickets.delete","todos.manage","users.manage","categories.manage","roles.manage"]'
WHERE name = 'admin' AND is_system = 1;

UPDATE roles SET permissions = '["tickets.view","tickets.view_all","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.change_priority","tickets.assign","tickets.refer","todos.manage"]'
WHERE name = 'manager' AND is_system = 1;

UPDATE roles SET permissions = '["tickets.view","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.refer","todos.manage"]'
WHERE name = 'support' AND is_system = 1;
