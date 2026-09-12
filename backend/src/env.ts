export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  CORS_ORIGIN?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

export interface PushSubscription {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

export interface JWTPayload {
  sub: number;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AppVariables {
  user: JWTPayload;
  permissions: string[];
}

export interface User {
  id: number;
  full_name: string;
  username: string;
  role: string;
  customer_type: 'shop' | 'company';
  company_name: string | null;
  telegram_chat_id: string | null;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  label: string;
  permissions: string[];
  is_system: number;
  created_at: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  status: 'open' | 'in_progress' | 'closed' | 'waiting_customer';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_by: number;
  assigned_to: number | null;
  contact_phone: string | null;
  employee_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  body: string;
  created_at: string;
}

export interface Attachment {
  id: number;
  ticket_id: number;
  comment_id: number | null;
  file_name: string;
  file_url: string;
  uploaded_by: number;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  ticket_id: number | null;
  message: string;
  is_read: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  is_done: number;
  ticket_id: number | null;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  body: string;
  category_id: number | null;
  tags: string | null;
  is_published: number;
  views: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}