import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;

/**
 * پیام خطای یک درخواست را به شکل خوانا برمی‌گرداند.
 * اولویت: پیام سرور → وضعیت اتصال → کد HTTP
 * (بدون این تابع، خطاهای بدون بدنه JSON مانند «خطا در ذخیره مقاله» بی‌دلیل نمایش داده می‌شدند)
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const error = err as {
    response?: { status?: number; data?: { error?: string } | string };
  };

  const data = error.response?.data;
  const serverMessage =
    data && typeof data === 'object'
      ? data.error
      : typeof data === 'string'
        ? data.trim()
        : undefined;

  if (serverMessage) return serverMessage;
  if (!error.response) return `${fallback} — ارتباط با سرور برقرار نشد`;

  const status = error.response.status;
  if (status === 404) return `${fallback} — مسیر API در سرور یافت نشد (نسخه سرور به‌روز نیست)`;
  if (status === 500) return `${fallback} — خطای داخلی سرور (کد ${status})`;
  return `${fallback} (کد ${status ?? '؟'})`;
}

// Type definitions
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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
  role_label?: string | null;
  permissions?: string[];
}

export interface Role {
  id: number;
  name: string;
  label: string;
  permissions: string[];
  is_system: number;
  created_at: string;
}

export interface PermissionDef {
  key: string;
  label: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
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
  category_name?: string;
  created_by_name?: string;
  assigned_to_name?: string;
  comment_count?: number;
  attachment_count?: number;
}

export interface TicketDetail extends Ticket {
  comments: Comment[];
  attachments: Attachment[];
}

export interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  body: string;
  created_at: string;
  user_name: string;
}

export interface Attachment {
  id: number;
  ticket_id: number;
  comment_id: number | null;
  file_name: string;
  file_url: string;
  uploaded_by: number;
  uploaded_by_name: string;
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

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  is_done: number;
  ticket_id: number | null;
  ticket_title?: string | null;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TodoStats {
  total: number;
  done: number;
  pending: number;
}

export interface KbArticle {
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
  category_name?: string | null;
  created_by_name?: string | null;
}

export interface KbStats {
  total: number;
  published: number;
  drafts: number;
  views: number;
}
